import csv
import gzip
import json
from pathlib import Path

import joblib
import numpy as np
from django.conf import settings
from django.core.management.base import BaseCommand
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, balanced_accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.model_selection import GroupKFold, cross_val_predict
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


FEATURES = ["absolute_theta", "absolute_alpha", "absolute_beta", "absolute_gamma", "theta_beta_ratio"]
CLASSES = ["focused", "relaxed", "distracted", "overstimulated"]
# Artificial class centers for software demonstrations only. They are intentionally
# separable and must not be presented as measured physiological reference ranges.
PROFILES = {
    "focused": np.array([3.00, 2.90, 3.38, 2.92]),
    "relaxed": np.array([3.06, 3.38, 2.96, 2.72]),
    "distracted": np.array([3.40, 3.02, 2.88, 2.70]),
    "overstimulated": np.array([3.18, 2.82, 3.48, 3.30]),
}


class Command(BaseCommand):
    help = "Generate an isolated, clearly labeled synthetic EEG demo dataset and model."

    def add_arguments(self, parser):
        parser.add_argument("--rows", type=int, default=100_000)
        parser.add_argument("--participants", type=int, default=30)
        parser.add_argument("--seed", type=int, default=2026)

    def handle(self, *args, **options):
        rows = max(4, options["rows"]); participants = max(4, options["participants"]); seed = options["seed"]
        rng = np.random.default_rng(seed)
        participant_ids = [f"SYNTH-{index:03d}" for index in range(1, participants + 1)]
        # Deliberately overlapping distributions make this a less trivial demo.
        # These values are calibration parameters, not physiological estimates.
        participant_offsets = {participant: rng.normal(0, 0.09, 4) for participant in participant_ids}
        x, y, groups = [], [], []
        per_class = rows // len(CLASSES); remainder = rows % len(CLASSES)
        for class_index, label in enumerate(CLASSES):
            count = per_class + (1 if class_index < remainder else 0)
            for index in range(count):
                participant = participant_ids[index % participants]
                session_drift = rng.normal(0, 0.035, 4)
                epoch_noise = rng.normal(0, 0.24, 4)
                bands = PROFILES[label] + participant_offsets[participant] + session_drift + epoch_noise
                theta_beta = 10 ** (bands[0] - bands[2])
                x.append([*bands.tolist(), theta_beta]); y.append(label); groups.append(participant)
        x = np.asarray(x); y = np.asarray(y); groups = np.asarray(groups)
        order = rng.permutation(len(y)); x = x[order]; y = y[order]; groups = groups[order]

        model = Pipeline([("scale", StandardScaler()), ("model", RandomForestClassifier(n_estimators=500, max_depth=10, min_samples_leaf=2, class_weight="balanced", n_jobs=-1, random_state=seed))])
        predictions = cross_val_predict(model, x, y, groups=groups, cv=GroupKFold(n_splits=5), n_jobs=-1)
        model.fit(x, y)
        metrics = {
            "synthetic_demo_only": True,
            "warning": "All participants and epochs are generated. These scores are not evidence of performance on real EEG.",
            "generator": {"seed": seed, "rows": rows, "participants": participants, "features": FEATURES, "classes": CLASSES, "participant_sd": 0.09, "session_sd": 0.035, "epoch_sd": 0.24},
            "validation": "5-fold synthetic-participant-grouped cross-validation",
            "accuracy": accuracy_score(y, predictions), "balanced_accuracy": balanced_accuracy_score(y, predictions),
            "macro_f1": f1_score(y, predictions, average="macro", zero_division=0),
            "confusion_matrix": confusion_matrix(y, predictions, labels=CLASSES).tolist(),
            "per_class": classification_report(y, predictions, labels=CLASSES, output_dict=True, zero_division=0),
        }
        output = Path(settings.EEG_DATA_ROOT) / "synthetic-demo"; output.mkdir(parents=True, exist_ok=True)
        dataset_path = output / "synthetic_eeg_100k_epochs.csv.gz"
        with gzip.open(dataset_path, "wt", newline="", encoding="utf-8") as stream:
            writer = csv.writer(stream)
            writer.writerow(["synthetic", "participant_code", "condition", *FEATURES])
            for values, label, participant in zip(x, y, groups): writer.writerow([True, participant, label, *values.tolist()])
        joblib.dump(model, output / "synthetic_demo_classifier.joblib")
        (output / "synthetic_demo_metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
        (output / "README.txt").write_text(
            "SYNTHETIC DEMO DATA ONLY\n\nAll participant IDs, EEG features, labels, and metrics in this folder are generated.\n"
            "Do not merge with Supabase baseline data or report these results as human-subject EEG findings.\n",
            encoding="utf-8",
        )
        self.stdout.write(json.dumps(metrics, indent=2))
        self.stdout.write(self.style.SUCCESS(f"Synthetic dataset: {dataset_path.resolve()}"))
