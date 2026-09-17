import csv
import gzip
import json
from pathlib import Path

import joblib
import numpy as np
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, balanced_accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.model_selection import GroupKFold
from sklearn.preprocessing import StandardScaler

from web.management.commands.train_baseline_models import FEATURE_NAMES, TARGET_CONDITIONS, epoch_features
from web.models import BaselineEpoch


class Command(BaseCommand):
    help = "Train a combined real-plus-synthetic model and evaluate only on held-out real participants."

    def add_arguments(self, parser):
        parser.add_argument("--synthetic-rows", type=int, help="Deterministically sample a balanced subset of synthetic epochs.")
        parser.add_argument("--output-dir", help="Save this experiment separately from previous combined runs.")

    def handle(self, *args, **options):
        real_epochs = list(BaselineEpoch.objects.select_related("recording").filter(is_usable=True, recording__condition__in=TARGET_CONDITIONS))
        if len(real_epochs) < 20:
            raise CommandError("At least 20 real usable epochs are required.")
        real_x = np.asarray([epoch_features(epoch) for epoch in real_epochs], dtype=np.float64)
        real_y = np.asarray([epoch.recording.condition for epoch in real_epochs])
        real_groups = np.asarray([epoch.recording.participant_code for epoch in real_epochs])

        synthetic_path = Path(settings.EEG_DATA_ROOT) / "synthetic-demo" / "synthetic_eeg_100k_epochs.csv.gz"
        if not synthetic_path.exists():
            raise CommandError("Generate the synthetic dataset first with: python manage.py generate_synthetic_eeg_demo")
        synthetic_x, synthetic_y, synthetic_participants = [], [], []
        with gzip.open(synthetic_path, "rt", encoding="utf-8") as stream:
            for row in csv.DictReader(stream):
                synthetic_x.append([float(row[name]) for name in FEATURE_NAMES])
                synthetic_y.append(row["condition"]); synthetic_participants.append(row["participant_code"])
        synthetic_x = np.asarray(synthetic_x); synthetic_y = np.asarray(synthetic_y)
        requested = options.get("synthetic_rows")
        if requested is not None:
            if requested < 4 or requested % 4:
                raise CommandError("--synthetic-rows must be a positive multiple of four.")
            rng = np.random.default_rng(2026)
            indices = []
            for label in sorted(TARGET_CONDITIONS):
                available = np.flatnonzero(synthetic_y == label)
                if len(available) < requested // 4:
                    raise CommandError(f"Not enough synthetic {label} rows.")
                indices.extend(rng.choice(available, requested // 4, replace=False).tolist())
            synthetic_x = synthetic_x[indices]; synthetic_y = synthetic_y[indices]
            synthetic_participants = [synthetic_participants[index] for index in indices]

        predictions = np.empty(len(real_y), dtype=object)
        folds = []
        splitter = GroupKFold(n_splits=min(3, len(set(real_groups))))
        for fold, (train_index, test_index) in enumerate(splitter.split(real_x, real_y, real_groups), 1):
            train_x = np.vstack([real_x[train_index], synthetic_x])
            train_y = np.concatenate([real_y[train_index], synthetic_y])
            # Equal total influence for the real and synthetic sources prevents the
            # 100k artificial rows from numerically drowning out measured EEG.
            weights = np.concatenate([
                np.full(len(train_index), 0.5 / len(train_index)),
                np.full(len(synthetic_y), 0.5 / len(synthetic_y)),
            ])
            scaler = StandardScaler().fit(train_x)
            model = self._model(); model.fit(scaler.transform(train_x), train_y, sample_weight=weights)
            predictions[test_index] = model.predict(scaler.transform(real_x[test_index]))
            folds.append({"fold": fold, "real_train_rows": len(train_index), "synthetic_train_rows": len(synthetic_y), "untouched_real_test_rows": len(test_index), "test_participants": sorted(set(real_groups[test_index].tolist()))})

        classes = sorted(TARGET_CONDITIONS)
        metrics = {
            "model_type": "combined_real_and_synthetic",
            "warning": "Synthetic rows support training; every reported validation row is untouched real EEG.",
            "rows": {"real": len(real_y), "synthetic": len(synthetic_y), "combined_final_training": len(real_y) + len(synthetic_y)},
            "real_participants": len(set(real_groups.tolist())), "synthetic_participants": len(set(synthetic_participants)),
            "features": FEATURE_NAMES, "validation": "participant-grouped real-only testing", "folds": folds,
            "accuracy": accuracy_score(real_y, predictions), "balanced_accuracy": balanced_accuracy_score(real_y, predictions),
            "macro_f1": f1_score(real_y, predictions, average="macro", zero_division=0),
            "labels": classes, "confusion_matrix": confusion_matrix(real_y, predictions, labels=classes).tolist(),
            "per_class": classification_report(real_y, predictions, labels=classes, output_dict=True, zero_division=0),
        }

        final_x = np.vstack([real_x, synthetic_x]); final_y = np.concatenate([real_y, synthetic_y])
        final_weights = np.concatenate([np.full(len(real_y), 0.5 / len(real_y)), np.full(len(synthetic_y), 0.5 / len(synthetic_y))])
        scaler = StandardScaler().fit(final_x); model = self._model(); model.fit(scaler.transform(final_x), final_y, sample_weight=final_weights)
        output = Path(options.get("output_dir") or Path(settings.EEG_DATA_ROOT) / "combined-model"); output.mkdir(parents=True, exist_ok=True)
        joblib.dump({"scaler": scaler, "model": model, "features": FEATURE_NAMES, "classes": classes}, output / "combined_real_synthetic_classifier.joblib")
        (output / "combined_model_metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
        combined_path = output / "combined_real_synthetic_epochs.csv.gz"
        with gzip.open(combined_path, "wt", newline="", encoding="utf-8") as stream:
            writer = csv.writer(stream); writer.writerow(["source", "participant_code", "condition", *FEATURE_NAMES])
            for epoch, values, label in zip(real_epochs, real_x, real_y): writer.writerow(["real", epoch.recording.participant_code, label, *values.tolist()])
            for participant, values, label in zip(synthetic_participants, synthetic_x, synthetic_y): writer.writerow(["synthetic", participant, label, *values.tolist()])
        self.stdout.write(json.dumps(metrics, indent=2))
        self.stdout.write(self.style.SUCCESS(f"Combined dataset: {combined_path.resolve()}"))

    @staticmethod
    def _model():
        return RandomForestClassifier(n_estimators=500, max_depth=10, min_samples_leaf=2, max_features="sqrt", class_weight="balanced", n_jobs=-1, random_state=2026)

