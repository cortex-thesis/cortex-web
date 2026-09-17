import csv
import gzip
import json
import math
from pathlib import Path

import joblib
import numpy as np
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, balanced_accuracy_score, classification_report, confusion_matrix, precision_recall_fscore_support
from sklearn.model_selection import GroupKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from web.management.commands.train_baseline_models import FEATURE_NAMES, TARGET_CONDITIONS, epoch_features
from web.models import BaselineEpoch


TARGET_ROWS = 100_000
TARGET_FEATURE_VALUES = TARGET_ROWS * len(FEATURE_NAMES)


def augment_training_rows(x, y, *, target_rows=TARGET_ROWS, seed=42):
    """Balance classes with bounded, train-only feature jitter.

    The first rows in each class are the real observations. Synthetic rows are
    bootstrapped from that class and receive small (3% of within-class SD)
    perturbations. TBR is recomputed from perturbed theta and beta.
    """
    rng = np.random.default_rng(seed)
    classes = sorted(set(y.tolist()))
    per_class = math.ceil(target_rows / len(classes))
    augmented_x, augmented_y, synthetic_flags = [], [], []
    for label in classes:
        class_x = x[y == label]
        if not len(class_x):
            raise ValueError(f"No real training rows exist for {label}.")
        take_real = min(len(class_x), per_class)
        augmented_x.extend(class_x[:take_real]); augmented_y.extend([label] * take_real); synthetic_flags.extend([False] * take_real)
        needed = per_class - take_real
        if needed:
            base = class_x[rng.integers(0, len(class_x), size=needed)].copy()
            spread = np.std(class_x[:, :4], axis=0)
            fallback = np.maximum(np.abs(np.mean(class_x[:, :4], axis=0)) * 0.01, 1e-12)
            noise = rng.normal(0, np.maximum(spread * 0.03, fallback), size=(needed, 4))
            base[:, :4] = np.maximum(base[:, :4] + noise, 0)
            base[:, 4] = np.divide(base[:, 0], base[:, 2], out=np.zeros(needed), where=base[:, 2] > 0)
            augmented_x.extend(base); augmented_y.extend([label] * needed); synthetic_flags.extend([True] * needed)
    result_x = np.asarray(augmented_x[:target_rows], dtype=np.float64)
    result_y = np.asarray(augmented_y[:target_rows])
    flags = np.asarray(synthetic_flags[:target_rows])
    order = rng.permutation(len(result_x))
    return result_x[order], result_y[order], flags[order]


class Command(BaseCommand):
    help = "Train an experimental class-balanced augmented model while testing only on untouched real participants."

    def handle(self, *args, **options):
        epochs = list(BaselineEpoch.objects.select_related("recording").filter(is_usable=True, recording__condition__in=TARGET_CONDITIONS))
        if len(epochs) < 20:
            raise CommandError("At least 20 usable four-state epochs are required.")
        x = np.asarray([epoch_features(epoch) for epoch in epochs], dtype=np.float64)
        y = np.asarray([epoch.recording.condition for epoch in epochs])
        groups = np.asarray([epoch.recording.participant_code for epoch in epochs])
        classes = sorted(set(y.tolist()))
        if set(classes) != set(TARGET_CONDITIONS):
            raise CommandError("All four target conditions must be represented by real data.")
        folds = min(5, len(set(groups.tolist())))
        if folds < 2:
            raise CommandError("At least two real participants are required.")

        predictions = np.empty(len(y), dtype=object)
        fold_rows = []
        for fold, (train_index, test_index) in enumerate(GroupKFold(n_splits=folds).split(x, y, groups), 1):
            missing = set(classes) - set(y[train_index].tolist())
            if missing:
                raise CommandError(f"Fold {fold} has no real training examples for: {', '.join(sorted(missing))}.")
            train_x, train_y, flags = augment_training_rows(x[train_index], y[train_index], seed=42 + fold)
            model = self._model()
            model.fit(train_x, train_y)
            predictions[test_index] = model.predict(x[test_index])
            fold_rows.append({
                "fold": fold, "real_training_rows": len(train_index), "augmented_training_rows": len(train_x),
                "synthetic_training_rows": int(flags.sum()), "untouched_real_test_rows": len(test_index),
                "test_participants": sorted(set(groups[test_index].tolist())),
            })

        macro = precision_recall_fscore_support(y, predictions, average="macro", zero_division=0)
        weighted = precision_recall_fscore_support(y, predictions, average="weighted", zero_division=0)
        metrics = {
            "experimental": True,
            "warning": "Synthetic rows are augmented copies, not independent participants or clinical evidence.",
            "augmentation": {
                "method": "class-balanced bootstrap with 3% within-class feature jitter; TBR recomputed",
                "feature_values_per_training_fold": TARGET_FEATURE_VALUES,
                "rows_per_training_fold": TARGET_ROWS,
                "features_per_row": len(FEATURE_NAMES), "features": FEATURE_NAMES,
                "test_data": "100% real, untouched, participant-held-out EEG epochs",
            },
            "real_dataset": {"rows": len(y), "participants": len(set(groups.tolist())), "class_rows": {label: int((y == label).sum()) for label in classes}},
            "folds": fold_rows,
            "classification": {
                "validation": f"{folds}-fold participant-grouped cross-validation",
                "accuracy": accuracy_score(y, predictions), "balanced_accuracy": balanced_accuracy_score(y, predictions),
                "macro_precision": macro[0], "macro_recall": macro[1], "macro_f1": macro[2],
                "weighted_precision": weighted[0], "weighted_recall": weighted[1], "weighted_f1": weighted[2],
                "labels": classes, "confusion_matrix": confusion_matrix(y, predictions, labels=classes).tolist(),
                "per_class": classification_report(y, predictions, labels=classes, output_dict=True, zero_division=0),
            },
        }

        final_x, final_y, final_flags = augment_training_rows(x, y, seed=42)
        model = self._model(); model.fit(final_x, final_y)
        output = Path(settings.EEG_DATA_ROOT) / settings.EEG_MODEL_SUBDIR
        output.mkdir(parents=True, exist_ok=True)
        joblib.dump(model, output / "baseline_augmented_classifier.joblib")
        (output / "baseline_augmented_metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
        export = Path(settings.EEG_DATA_ROOT) / "analysis" / "baseline_augmented_training_features.csv.gz"
        export.parent.mkdir(parents=True, exist_ok=True)
        with gzip.open(export, "wt", newline="", encoding="utf-8") as stream:
            writer = csv.writer(stream); writer.writerow(["row", "source", "condition", *FEATURE_NAMES])
            for index, (values, label, synthetic) in enumerate(zip(final_x, final_y, final_flags), 1):
                writer.writerow([index, "synthetic" if synthetic else "real", label, *values.tolist()])
        self.stdout.write(json.dumps(metrics, indent=2))
        self.stdout.write(self.style.SUCCESS(f"Experimental augmented model saved to {(output / 'baseline_augmented_classifier.joblib').resolve()}"))
        self.stdout.write(self.style.SUCCESS(f"Exactly {len(final_x):,} augmented epoch rows ({len(final_x) * len(FEATURE_NAMES):,} feature values) exported to {export.resolve()}"))

    @staticmethod
    def _model():
        return Pipeline([
            ("scale", StandardScaler()),
            ("model", RandomForestClassifier(n_estimators=400, class_weight="balanced", random_state=42, n_jobs=-1)),
        ])
