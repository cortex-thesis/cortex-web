import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    adjusted_rand_score,
    balanced_accuracy_score,
    classification_report,
    calinski_harabasz_score,
    confusion_matrix,
    davies_bouldin_score,
    normalized_mutual_info_score,
    precision_recall_fscore_support,
    silhouette_score,
)
from sklearn.model_selection import GroupKFold, cross_val_predict
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from web.models import BaselineEpoch


BANDS = ("delta", "theta", "alpha", "beta", "gamma")
CHANNELS = ("TP9", "AF7", "AF8", "TP10")
STATISTICS = ("mean", "standard_deviation", "minimum", "maximum")
TARGET_CONDITIONS = ("focused", "relaxed", "distracted", "overstimulated")
# The paper specifies four band-power inputs plus TBR. Raw samples, demographics,
# quality, and channel statistics remain in the analysis exports but are not predictors.
FEATURE_NAMES = ["absolute_theta", "absolute_alpha", "absolute_beta", "absolute_gamma", "theta_beta_ratio"]


def epoch_features(epoch):
    absolute = epoch.absolute_band_powers or {}
    return [float(absolute.get(band, 0) or 0) for band in ("theta", "alpha", "beta", "gamma")] + [float(epoch.theta_beta_ratio or 0)]


class Command(BaseCommand):
    help = "Audit baseline epochs and train participant-grouped classification and clustering models."

    def add_arguments(self, parser):
        parser.add_argument("--include-flagged", action="store_true", help="Include epochs that failed signal-quality checks.")
        parser.add_argument("--report-only", action="store_true", help="Show dataset counts without training or writing model files.")
        parser.add_argument("--output-dir", help="Override the configured EEG model directory.")

    def handle(self, *args, **options):
        queryset = BaselineEpoch.objects.select_related("recording").order_by("recording_id", "epoch_number")
        all_epochs = list(queryset)
        quality_epochs = all_epochs if options["include_flagged"] else [epoch for epoch in all_epochs if epoch.is_usable]
        epochs = [epoch for epoch in quality_epochs if epoch.recording.condition in TARGET_CONDITIONS]
        report = self._dataset_report(all_epochs, epochs)
        self.stdout.write(json.dumps(report, indent=2))
        if options["report_only"]:
            return
        if len(epochs) < 20:
            raise CommandError("At least 20 eligible epochs are required before training.")

        labels = [epoch.recording.condition for epoch in epochs]
        groups = [epoch.recording.participant_code for epoch in epochs]
        if len(set(labels)) < 2 or len(set(groups)) < 2:
            raise CommandError("Training requires at least two conditions and two participant codes.")

        x = np.asarray([epoch_features(epoch) for epoch in epochs], dtype=np.float64)
        y = np.asarray(labels)
        group_values = np.asarray(groups)
        if not np.isfinite(x).all():
            raise CommandError("The eligible dataset contains non-finite feature values.")

        classifier = Pipeline([
            ("scale", StandardScaler()),
            ("model", RandomForestClassifier(n_estimators=400, class_weight="balanced", random_state=42, n_jobs=-1)),
        ])
        folds = min(5, len(set(groups)))
        predictions = cross_val_predict(classifier, x, y, groups=group_values, cv=GroupKFold(n_splits=folds), n_jobs=-1)
        classes = sorted(set(labels))
        classification_metrics = {
            "validation": f"{folds}-fold participant-grouped cross-validation",
            "accuracy": accuracy_score(y, predictions),
            "balanced_accuracy": balanced_accuracy_score(y, predictions),
            "labels": classes,
            "confusion_matrix": confusion_matrix(y, predictions, labels=classes).tolist(),
            "per_class": classification_report(y, predictions, labels=classes, output_dict=True, zero_division=0),
        }
        macro = precision_recall_fscore_support(y, predictions, average="macro", zero_division=0)
        weighted = precision_recall_fscore_support(y, predictions, average="weighted", zero_division=0)
        classification_metrics.update({
            "macro_precision": macro[0], "macro_recall": macro[1], "macro_f1": macro[2],
            "weighted_precision": weighted[0], "weighted_recall": weighted[1], "weighted_f1": weighted[2],
        })
        classifier.fit(x, y)

        cluster_count = min(4, len(epochs) - 1)
        clusterer = Pipeline([
            ("scale", StandardScaler()),
            ("model", KMeans(n_clusters=cluster_count, n_init=20, random_state=42)),
        ])
        clusters = clusterer.fit_predict(x)
        scaled_x = clusterer.named_steps["scale"].transform(x)
        clustering_metrics = {
            "clusters": cluster_count,
            "silhouette_score": silhouette_score(scaled_x, clusters) if len(set(clusters)) > 1 else None,
            "davies_bouldin_index": davies_bouldin_score(scaled_x, clusters),
            "calinski_harabasz_index": calinski_harabasz_score(scaled_x, clusters),
            "inertia": clusterer.named_steps["model"].inertia_,
            "adjusted_rand_index_against_protocol_labels": adjusted_rand_score(y, clusters),
            "normalized_mutual_information": normalized_mutual_info_score(y, clusters),
        }
        clustering_metrics["k_sweep"] = []
        standardized = StandardScaler().fit_transform(x)
        for k in range(2, min(9, len(epochs))):
            candidate = KMeans(n_clusters=k, n_init=20, random_state=42).fit(standardized)
            clustering_metrics["k_sweep"].append({
                "k": k, "inertia": candidate.inertia_,
                "silhouette": silhouette_score(standardized, candidate.labels_),
                "davies_bouldin": davies_bouldin_score(standardized, candidate.labels_),
                "calinski_harabasz": calinski_harabasz_score(standardized, candidate.labels_),
            })

        output_dir = Path(options["output_dir"] or Path(settings.EEG_DATA_ROOT) / settings.EEG_MODEL_SUBDIR)
        output_dir.mkdir(parents=True, exist_ok=True)
        joblib.dump(classifier, output_dir / "baseline_classifier.joblib")
        joblib.dump(clusterer, output_dir / "baseline_clusterer.joblib")
        manifest = {
            "created_at": datetime.now(timezone.utc).isoformat(),
            "feature_names": FEATURE_NAMES,
            "dataset": report,
            "classification": classification_metrics,
            "clustering": clustering_metrics,
            "warning": "Research baseline only. Do not use for clinical diagnosis.",
        }
        (output_dir / "baseline_model_metrics.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        self.stdout.write(self.style.SUCCESS(f"Models and metrics saved to {output_dir.resolve()}"))
        self.stdout.write(json.dumps({"classification": classification_metrics, "clustering": clustering_metrics}, indent=2))

    @staticmethod
    def _dataset_report(all_epochs, eligible_epochs):
        recordings = {str(epoch.recording_id) for epoch in all_epochs}
        participants = {epoch.recording.participant_code for epoch in all_epochs}
        samples_per_channel = sum(epoch.sample_count for epoch in all_epochs)
        return {
            "recordings": len(recordings),
            "participants": len(participants),
            "epochs_total": len(all_epochs),
            "epochs_usable": sum(epoch.is_usable for epoch in all_epochs),
            "epochs_used": len(eligible_epochs),
            "raw_samples_per_channel": samples_per_channel,
            "raw_scalar_values_all_four_channels": samples_per_channel * 4,
            "conditions_all_epochs": dict(sorted(Counter(epoch.recording.condition for epoch in all_epochs).items())),
            "conditions_used": dict(sorted(Counter(epoch.recording.condition for epoch in eligible_epochs).items())),
            "feature_count_per_epoch": len(FEATURE_NAMES),
        }
