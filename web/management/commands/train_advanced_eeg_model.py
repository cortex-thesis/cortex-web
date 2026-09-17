import json
from collections import Counter
from pathlib import Path

import joblib
import numpy as np
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from scipy.optimize import linear_sum_assignment
from scipy.signal import butter, detrend, filtfilt, iirnotch, welch
from sklearn.cluster import KMeans
from sklearn.ensemble import ExtraTreesClassifier, RandomForestClassifier
from sklearn.feature_selection import SelectKBest, f_classif
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, balanced_accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.model_selection import GroupKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

from web.management.commands.train_baseline_models import CHANNELS, TARGET_CONDITIONS
from web.models import BaselineEpoch


SAMPLE_RATE = 256
BANDS = {"delta": (1, 4), "theta": (4, 8), "alpha": (8, 13), "beta": (13, 30), "gamma": (30, 45)}


def _band_power(frequencies, spectrum, low, high):
    mask = (frequencies >= low) & (frequencies < high)
    return float(np.trapezoid(spectrum[mask], frequencies[mask])) if mask.sum() > 1 else 0.0


def _hjorth(values):
    variance = np.var(values)
    first = np.diff(values); second = np.diff(first)
    mobility = np.sqrt(np.var(first) / variance) if variance > 0 else 0.0
    first_mobility = np.sqrt(np.var(second) / np.var(first)) if np.var(first) > 0 else 0.0
    return mobility, first_mobility / mobility if mobility > 0 else 0.0


def raw_epoch_features(epoch):
    """Derive independent, channel-aware features from one saved raw epoch."""
    feature_names, values = [], []
    channel_log_powers = {}
    notch_b, notch_a = iirnotch(60, 30, fs=SAMPLE_RATE)
    band_sos = butter(4, (1, 45), btype="bandpass", fs=SAMPLE_RATE, output="sos")
    # scipy's zero-phase SOS filter is represented as successive forward/backward
    # sections here to avoid phase shifts while retaining compatibility.
    from scipy.signal import sosfiltfilt
    for channel in CHANNELS:
        raw = np.asarray((epoch.raw_channels or {}).get(channel, []), dtype=np.float64)
        if len(raw) < 256 or not np.isfinite(raw).all():
            raise ValueError(f"Incomplete raw channel {channel}")
        filtered = filtfilt(notch_b, notch_a, detrend(raw, type="linear"))
        filtered = sosfiltfilt(band_sos, filtered)
        frequencies, spectrum = welch(filtered, fs=SAMPLE_RATE, window="hann", nperseg=min(256, len(filtered)), noverlap=min(128, len(filtered) // 2), detrend=False, scaling="density")
        powers = {name: _band_power(frequencies, spectrum, *limits) for name, limits in BANDS.items()}
        total = sum(powers.values()) or 1.0
        logs = {name: np.log10(max(power, 1e-12)) for name, power in powers.items()}
        channel_log_powers[channel] = logs
        for band in BANDS:
            feature_names += [f"{channel.lower()}_log_{band}", f"{channel.lower()}_relative_{band}"]
            values += [logs[band], powers[band] / total]
        theta_beta = powers["theta"] / powers["beta"] if powers["beta"] else 0.0
        alpha_beta = powers["alpha"] / powers["beta"] if powers["beta"] else 0.0
        mobility, complexity = _hjorth(filtered)
        feature_names += [f"{channel.lower()}_theta_beta", f"{channel.lower()}_alpha_beta", f"{channel.lower()}_hjorth_mobility", f"{channel.lower()}_hjorth_complexity"]
        values += [theta_beta, alpha_beta, mobility, complexity]
    for band in BANDS:
        feature_names += [f"frontal_asymmetry_{band}", f"temporal_asymmetry_{band}"]
        values += [channel_log_powers["AF7"][band] - channel_log_powers["AF8"][band], channel_log_powers["TP9"][band] - channel_log_powers["TP10"][band]]
    return feature_names, np.asarray(values, dtype=np.float64)


def models(feature_count):
    selected = min(20, feature_count)
    return {
        "logistic_regression": Pipeline([("scale", StandardScaler()), ("select", SelectKBest(f_classif, k=selected)), ("model", LogisticRegression(C=1.0, class_weight="balanced", max_iter=5000, random_state=42))]),
        "rbf_svm": Pipeline([("scale", StandardScaler()), ("select", SelectKBest(f_classif, k=selected)), ("model", SVC(C=1.0, gamma="scale", class_weight="balanced", probability=True, random_state=42))]),
        "random_forest": Pipeline([("select", SelectKBest(f_classif, k=selected)), ("model", RandomForestClassifier(n_estimators=600, max_depth=6, min_samples_leaf=2, max_features="sqrt", class_weight="balanced", n_jobs=-1, random_state=42))]),
        "extra_trees": Pipeline([("select", SelectKBest(f_classif, k=selected)), ("model", ExtraTreesClassifier(n_estimators=600, max_depth=8, min_samples_leaf=2, max_features="sqrt", class_weight="balanced", n_jobs=-1, random_state=42))]),
    }


def cluster_label_mapping(cluster_ids, labels, classes):
    matrix = np.zeros((4, 4), dtype=int)
    for cluster_id, label in zip(cluster_ids, labels):
        matrix[int(cluster_id), classes.index(label)] += 1
    rows, columns = linear_sum_assignment(-matrix)
    return {int(row): classes[int(column)] for row, column in zip(rows, columns)}, matrix


class Command(BaseCommand):
    help = "Recompute raw-epoch EEG features and compare participant-grouped advanced models."

    def handle(self, *args, **options):
        all_epochs = list(BaselineEpoch.objects.select_related("recording").filter(is_usable=True).order_by("recording_id", "epoch_number"))
        target_epochs = [epoch for epoch in all_epochs if epoch.recording.condition in TARGET_CONDITIONS]
        if len(target_epochs) < 20:
            raise CommandError("At least 20 usable four-state raw epochs are required.")
        extracted = []
        rejected = []
        feature_names = None
        for epoch in all_epochs:
            try:
                names, vector = raw_epoch_features(epoch)
                feature_names = feature_names or names
                extracted.append((epoch, vector))
            except ValueError:
                rejected.append(epoch.pk)
        target = [(epoch, vector) for epoch, vector in extracted if epoch.recording.condition in TARGET_CONDITIONS]
        x_raw = np.vstack([vector for _, vector in target])
        y = np.asarray([epoch.recording.condition for epoch, _ in target])
        groups = np.asarray([epoch.recording.participant_code for epoch, _ in target])
        classes = sorted(TARGET_CONDITIONS)

        # Add participant-relative changes using that participant's neutral calibration.
        neutral_by_participant = {}
        for epoch, vector in extracted:
            if epoch.recording.condition == "neutral_baseline":
                neutral_by_participant.setdefault(epoch.recording.participant_code, []).append(vector)
        global_neutral = np.median(np.vstack([v for values in neutral_by_participant.values() for v in values]), axis=0)
        baselines = {participant: np.median(np.vstack(values), axis=0) for participant, values in neutral_by_participant.items()}
        delta = np.vstack([vector - baselines.get(epoch.recording.participant_code, global_neutral) for epoch, vector in target])
        x = np.hstack([x_raw, delta])
        advanced_names = feature_names + [f"baseline_delta_{name}" for name in feature_names]

        outer = GroupKFold(n_splits=min(3, len(set(groups))))
        predictions = {name: np.empty(len(y), dtype=object) for name in models(x.shape[1])}
        cluster_predictions = np.empty(len(y), dtype=object)
        fold_details = []
        for fold, (train_idx, test_idx) in enumerate(outer.split(x, y, groups), 1):
            fold_result = {"fold": fold, "train_rows": len(train_idx), "test_rows": len(test_idx), "test_participants": sorted(set(groups[test_idx].tolist())), "models": {}}
            for name, estimator in models(x.shape[1]).items():
                estimator.fit(x[train_idx], y[train_idx]); predicted = estimator.predict(x[test_idx]); predictions[name][test_idx] = predicted
                fold_result["models"][name] = {"balanced_accuracy": balanced_accuracy_score(y[test_idx], predicted), "macro_f1": f1_score(y[test_idx], predicted, average="macro", zero_division=0)}
            scale = StandardScaler().fit(x[train_idx]); train_scaled = scale.transform(x[train_idx]); test_scaled = scale.transform(x[test_idx])
            kmeans = KMeans(n_clusters=4, n_init=50, random_state=42).fit(train_scaled)
            mapping, composition = cluster_label_mapping(kmeans.labels_, y[train_idx].tolist(), classes)
            cluster_predictions[test_idx] = [mapping[int(cluster)] for cluster in kmeans.predict(test_scaled)]
            fold_result["cluster_mapping"] = mapping; fold_result["cluster_training_composition"] = composition.tolist()
            fold_details.append(fold_result)

        evaluation = {name: self._metrics(y, predicted, classes) for name, predicted in predictions.items()}
        evaluation["kmeans_cluster_label"] = self._metrics(y, cluster_predictions, classes)
        winner = max(models(x.shape[1]), key=lambda name: evaluation[name]["balanced_accuracy"])
        final_model = models(x.shape[1])[winner]; final_model.fit(x, y)

        # Final clustering artifact follows the paper's cluster -> unique label mapping.
        scaler = StandardScaler().fit(x); scaled = scaler.transform(x)
        kmeans = KMeans(n_clusters=4, n_init=50, random_state=42).fit(scaled)
        mapping, composition = cluster_label_mapping(kmeans.labels_, y.tolist(), classes)
        output = Path(settings.EEG_DATA_ROOT) / settings.EEG_MODEL_SUBDIR; output.mkdir(parents=True, exist_ok=True)
        bundle = {
            "model": final_model, "feature_names": advanced_names, "raw_feature_count": len(feature_names),
            "neutral_baselines": baselines, "global_neutral": global_neutral,
            "channels": CHANNELS, "sample_rate_hz": SAMPLE_RATE, "classes": classes,
        }
        cluster_bundle = {"scaler": scaler, "kmeans": kmeans, "cluster_to_state": mapping, "feature_names": advanced_names}
        joblib.dump(bundle, output / "advanced_eeg_classifier.joblib")
        joblib.dump(cluster_bundle, output / "advanced_eeg_cluster_model.joblib")
        report = {
            "status": "research_baseline_not_for_clinical_use", "real_rows": len(y), "participants": len(set(groups)),
            "features_recomputed_from_each_raw_epoch": len(advanced_names), "raw_epochs_rejected_during_recomputation": len(rejected),
            "class_rows": dict(Counter(y.tolist())), "validation": "leave-one-participant-group-out outer evaluation",
            "candidate_models": evaluation, "selected_final_classifier": winner, "folds": fold_details,
            "final_cluster_to_state": mapping, "final_cluster_composition": composition.tolist(),
        }
        (output / "advanced_eeg_metrics.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        self.stdout.write(json.dumps(report, indent=2))
        self.stdout.write(self.style.SUCCESS(f"Advanced EEG artifacts saved to {output.resolve()}"))

    @staticmethod
    def _metrics(actual, predicted, classes):
        return {
            "accuracy": accuracy_score(actual, predicted), "balanced_accuracy": balanced_accuracy_score(actual, predicted),
            "macro_f1": f1_score(actual, predicted, average="macro", zero_division=0),
            "confusion_matrix": confusion_matrix(actual, predicted, labels=classes).tolist(),
            "per_class": classification_report(actual, predicted, labels=classes, output_dict=True, zero_division=0),
        }
