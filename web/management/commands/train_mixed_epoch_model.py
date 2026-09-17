"""Source-epoch-separated mixed-data experiment, not unseen-person validation."""
import base64
import csv
import io
import json
from pathlib import Path

import joblib
import numpy as np
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, balanced_accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from web.management.commands.train_advanced_eeg_model import raw_epoch_features
from web.management.commands.train_baseline_models import CHANNELS, TARGET_CONDITIONS
from web.models import BaselineEpoch

FEATURES = ['log_theta', 'log_alpha', 'log_beta', 'log_gamma', 'linear_theta_beta_ratio']


def features_from_raw(epoch):
    names, vector = raw_epoch_features(epoch)
    powers = []
    for band in ('theta', 'alpha', 'beta', 'gamma'):
        powers.append(float(np.mean([10 ** vector[names.index(f'{channel.lower()}_log_{band}')] for channel in CHANNELS])))
    return [*np.log10(np.maximum(powers, 1e-12)), powers[0] / max(powers[2], 1e-12)]


def partition_rows(epochs, vectors, indices, augmented_count, partition, seed):
    rng = np.random.default_rng(seed)
    rows = []
    for index in indices:
        epoch = epochs[index]
        rows.append({'source_epoch_id': epoch.pk, 'recording_id': str(epoch.recording_id), 'participant_code': epoch.recording.participant_code,
                     'condition': epoch.recording.condition, 'source': 'real', 'split': partition,
                     **dict(zip(FEATURES, vectors[index].tolist()))})
    parents = np.resize(rng.permutation(indices), augmented_count)
    for index in parents:
        epoch = epochs[index]
        values = vectors[index].copy()
        # Fixed label-preserving hypothesis: small independent log-power jitter.
        # No test distribution is used to estimate transformation parameters.
        values[:4] += rng.normal(0, 0.03, 4)
        values[4] = 10 ** (values[0] - values[2])
        rows.append({'source_epoch_id': epoch.pk, 'recording_id': str(epoch.recording_id), 'participant_code': epoch.recording.participant_code,
                     'condition': epoch.recording.condition, 'source': 'augmented', 'split': partition,
                     **dict(zip(FEATURES, values.tolist()))})
    return rows


def evaluate(actual, predicted):
    labels = sorted(TARGET_CONDITIONS)
    return {'rows': len(actual), 'accuracy': accuracy_score(actual, predicted), 'balanced_accuracy': balanced_accuracy_score(actual, predicted),
            'labels': labels, 'confusion_matrix': confusion_matrix(actual, predicted, labels=labels).tolist(),
            'per_class': classification_report(actual, predicted, labels=labels, output_dict=True, zero_division=0)}


class Command(BaseCommand):
    help = 'Combine real epochs with 1,300 augmented rows using a stratified, source-epoch-separated 80/20 split.'

    def handle(self, *args, **options):
        epochs = list(BaselineEpoch.objects.select_related('recording').filter(is_usable=True, recording__condition__in=TARGET_CONDITIONS).order_by('pk'))
        if len(epochs) < 20:
            raise CommandError('At least 20 real usable epochs are required.')
        vectors = np.asarray([features_from_raw(epoch) for epoch in epochs])
        labels = [epoch.recording.condition for epoch in epochs]
        train_indices, test_indices = train_test_split(np.arange(len(epochs)), test_size=0.2, stratify=labels, random_state=2026)
        train = partition_rows(epochs, vectors, train_indices, 1040, 'train', 2026)
        test = partition_rows(epochs, vectors, test_indices, 260, 'test', 2027)
        train_parents = {row['source_epoch_id'] for row in train}; test_parents = {row['source_epoch_id'] for row in test}
        if train_parents & test_parents:
            raise CommandError('Source epoch leakage detected.')
        x_train = np.asarray([[row[name] for name in FEATURES] for row in train]); y_train = np.asarray([row['condition'] for row in train])
        x_test = np.asarray([[row[name] for name in FEATURES] for row in test]); y_test = np.asarray([row['condition'] for row in test])
        model = Pipeline([('scale', StandardScaler()), ('model', RandomForestClassifier(n_estimators=400, min_samples_leaf=2, class_weight='balanced', random_state=2026, n_jobs=-1))])
        model.fit(x_train, y_train); predictions = model.predict(x_test)
        real_mask = np.asarray([row['source'] == 'real' for row in test])
        report = {'experiment': 'source-epoch-grouped mixed real/augmented 80/20',
                  'warning': 'Mixed real/augmented evaluation; performance on unseen students has not been validated.',
                  'augmentation': 'Fixed Gaussian jitter SD=0.03 in log10 band power; linear TBR recomputed. Features independently recomputed from saved raw EEG.',
                  'counts': {'real': len(epochs), 'augmented': 1300, 'total': len(train)+len(test), 'train': len(train), 'test': len(test), 'real_train': len(train_indices), 'real_test': len(test_indices), 'augmented_train': 1040, 'augmented_test': 260},
                  'source_epoch_overlap': 0, 'features': FEATURES,
                  'combined_test': evaluate(y_test, predictions), 'real_test': evaluate(y_test[real_mask], predictions[real_mask]),
                  'augmented_test': evaluate(y_test[~real_mask], predictions[~real_mask])}
        output = Path(getattr(settings, 'MODEL_ARTIFACT_ROOT', settings.BASE_DIR / 'model-artifacts')) / 'mixed-1395'; output.mkdir(parents=True, exist_ok=True)
        (output / 'metrics.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
        with (output / 'epochs.csv').open('w', newline='', encoding='utf-8') as stream:
            writer = csv.DictWriter(stream, fieldnames=list(train[0])); writer.writeheader(); writer.writerows(train+test)
        joblib.dump(model, output / 'classifier.joblib')
        from web.management.commands.analyze_mixed_epoch_data import build_report
        build_report(output)
        self.stdout.write(json.dumps({'counts': report['counts'], 'accuracy': {key: report[key]['accuracy'] for key in ('combined_test', 'real_test', 'augmented_test')}}, indent=2))
        self.stdout.write(self.style.SUCCESS(f'Report: {(output / "analysis.html").resolve()}'))

    @staticmethod
    def _html(output, report):
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        from html import escape
        result = report['combined_test']; matrix = result['confusion_matrix']
        figure, axis = plt.subplots(figsize=(7, 5)); axis.imshow(matrix, cmap='Purples')
        axis.set_xticks(range(4), result['labels'], rotation=25); axis.set_yticks(range(4), result['labels'])
        axis.set_xlabel('Predicted'); axis.set_ylabel('Actual')
        for i in range(4):
            for j in range(4): axis.text(j, i, matrix[i][j], ha='center', va='center')
        buffer = io.BytesIO(); figure.savefig(buffer, format='png', bbox_inches='tight'); plt.close(figure)
        image = base64.b64encode(buffer.getvalue()).decode()
        cards = ''.join(f'<section><h2>{key.replace("_", " ")}</h2><p>Accuracy: {report[key]["accuracy"]:.2%}</p><p>Balanced accuracy: {report[key]["balanced_accuracy"]:.2%}</p><p>Rows: {report[key]["rows"]}</p></section>' for key in ('combined_test', 'real_test', 'augmented_test'))
        page = f'<!doctype html><html><head><meta charset="utf-8"><title>Mixed EEG experiment</title><style>body{{font:16px Arial;background:#f7f4ed;color:#322552;padding:30px;max-width:1000px;margin:auto}}section{{background:white;padding:20px;border-radius:14px;margin:12px 0}}img{{max-width:100%}}pre{{overflow:auto;background:white;padding:20px}}</style></head><body><h1>Mixed real / augmented EEG experiment</h1><p>{escape(report["warning"])}</p>{cards}<img src="data:image/png;base64,{image}"><h2>All metrics, counts and per-state precision / recall / F1</h2><pre>{escape(json.dumps(report, indent=2))}</pre></body></html>'
        (output / 'analysis.html').write_text(page, encoding='utf-8')
