"""Reproduce and export the user-selected augmented demonstration classifier."""
import csv
import hashlib
import json
from collections import Counter
from html import escape
from pathlib import Path

import joblib
import numpy as np
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from scipy.optimize import linear_sum_assignment
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.preprocessing import StandardScaler
from threadpoolctl import threadpool_limits

from web.services.augmented_eeg import AugmentedEEGClassifier, FEATURES, STATES, WORKFLOW

COORDINATES = ['demo_z_theta', 'demo_z_alpha', 'demo_z_beta', 'demo_z_gamma']
KINDS = ['real', 'eeg_derived_augmented', 'artificial_separable_demo']


def matrix(rows, fields):
    return np.asarray([[float(row[name]) for name in fields] for row in rows])


def evaluate(rows, predictions):
    actual = [r['class_label'] for r in rows]
    report = classification_report(actual, predictions, labels=STATES, output_dict=True, zero_division=0)
    return dict(rows=len(rows), correct=sum(a == b for a, b in zip(actual, predictions)),
                accuracy=float(accuracy_score(actual, predictions)), macro_f1=report['macro avg']['f1-score'],
                per_class=report, confusion_matrix=confusion_matrix(actual, predictions, labels=STATES).tolist())


def train(rows):
    if any(r['split'] not in {'train', 'test'} or r['provenance'] not in KINDS for r in rows):
        raise ValueError('Unexpected partition or provenance in the archived dataset.')
    if any(r['class_label'] not in STATES for r in rows):
        raise ValueError('Unexpected state label.')
    original_partitions = {r['parent_epoch_id']: r['split'] for r in rows if r['provenance'] == 'real'}
    if len(original_partitions) != sum(r['provenance'] == 'real' for r in rows):
        raise ValueError('Duplicate original EEG parent.')
    for row in rows:
        if row['provenance'] == 'eeg_derived_augmented' and original_partitions.get(row['parent_epoch_id']) != row['split']:
            raise ValueError('An augmented row crosses its original parent partition.')
    training = [r for r in rows if r['split'] == 'train']
    testing = [r for r in rows if r['split'] == 'test']
    originals = [r for r in training if r['provenance'] == 'real']
    scaler = StandardScaler().fit(matrix(originals, FEATURES[:4]))
    physiological = [r for r in rows if r['provenance'] != 'artificial_separable_demo']
    if not np.allclose(scaler.transform(matrix(physiological, FEATURES[:4])), matrix(physiological, COORDINATES)):
        raise ValueError('Saved coordinates do not match training-only EEG normalization.')
    x = matrix(training, COORDINATES)
    if not np.isfinite(x).all():
        raise ValueError('Non-finite training coordinates.')
    with threadpool_limits(limits=1):
        teacher = KMeans(n_clusters=4, n_init=20, random_state=2026).fit(x)
        artificial = [r for r in training if r['provenance'] == 'artificial_separable_demo']
        ids = teacher.predict(matrix(artificial, COORDINATES))
        composition = np.asarray([[sum(c == k and r['class_label'] == state for c, r in zip(ids, artificial))
                                   for state in STATES] for k in range(4)])
        cluster_ids, state_ids = linear_sum_assignment(-composition)
        mapping = {int(k): STATES[int(s)] for k, s in zip(cluster_ids, state_ids)}
        forest = RandomForestClassifier(n_estimators=200, max_depth=6, min_samples_leaf=4,
                                        random_state=2026, n_jobs=1).fit(x, teacher.labels_)
        predictions = np.asarray([mapping[int(k)] for k in forest.predict(matrix(testing, COORDINATES))])
    model = AugmentedEEGClassifier(scaler, forest, mapping)
    # Verify the live-input adapter exactly reproduces scored real/augmented rows.
    measured = [r for r in testing if r['provenance'] != 'artificial_separable_demo']
    live_values = np.column_stack([matrix(measured, FEATURES[:4]), np.zeros(len(measured))])
    expected = [predictions[i] for i, r in enumerate(testing) if r['provenance'] != 'artificial_separable_demo']
    if not np.array_equal(model.predict(live_values), expected):
        raise ValueError('Runtime adapter does not reproduce evaluation predictions.')
    evaluations = {}
    for kind in KINDS:
        indices = [i for i, r in enumerate(testing) if r['provenance'] == kind]
        evaluations[kind] = evaluate([testing[i] for i in indices], predictions[indices])
    metadata = dict(display_name='Augmented EEG Classifier', workflow=WORKFLOW,
                    deployment_scope='experimental_system', biological_validation=False,
                    purpose='Augmented EEG system classifier with disclosed artificial demonstration data',
                    features=FEATURES, used_features=FEATURES[:4], ignored_features=[FEATURES[4]],
                    feature_transform='Original-training-only StandardScaler on four log10 band powers',
                    cluster_to_state=mapping, total_counts=dict(Counter(r['provenance'] for r in rows)),
                    training_rows=len(training), test_rows=len(testing), mixed_demo_only=evaluate(testing, predictions),
                    by_provenance=evaluations, evaluation_scope='Historical mixed demonstration; not unseen-student EEG accuracy',
                    test_cases=[dict(row_id=r['row_id'], provenance=r['provenance'], actual=r['class_label'], predicted=str(v),
                                     coordinates=[float(r[k]) for k in COORDINATES])
                                for r, v in zip(testing, predictions)])
    return model, metadata


def report(metadata):
    labels = [('Mixed demonstration evaluation', metadata['mixed_demo_only']),
              ('Original EEG subset', metadata['by_provenance']['real']),
              ('EEG-derived augmented subset', metadata['by_provenance']['eeg_derived_augmented']),
              ('Artificial demonstration subset', metadata['by_provenance']['artificial_separable_demo'])]
    rows = ''.join(f'<tr><td>{escape(name)}</td><td>{score["rows"]}</td><td>{score["correct"]}</td>'
                   f'<td>{score["accuracy"]:.2%}</td><td>{score["macro_f1"]:.2%}</td></tr>' for name, score in labels)
    html = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Augmented EEG Classifier</title><style>body{font:16px/1.65 system-ui;color:#203047;max-width:1050px;margin:40px auto;padding:24px}h1,h2{line-height:1.25}table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid #d4dce7;padding:12px}th{background:#eef3f8}code{font-size:13px}.note{background:#eef3f8;padding:18px;border-radius:8px}</style>
<h1>Augmented EEG Classifier</h1><p>Selected system model · Four-cluster K-means → Random Forest</p>
<p class="note"><strong>81.72% is the mixed demonstration evaluation, not a measured live-EEG accuracy.</strong>
The original EEG subset scores 42.11%. This artifact is selected for experimental system use; its selection does not establish biological or clinical validation.</p>
<h2>Dataset and evaluation</h2><p>The frozen dataset contains 95 original EEG rows, 300 EEG-derived augmented rows, and 1,000 artificial demonstration rows constructed around four separated coordinate centers. The latter have assigned class names and no EEG parent. The split is 1,116 training rows and 279 test rows. Augmented descendants stay with their original parents. Recordings and participants overlap between partitions, so this is not an independent-cohort evaluation.</p>
<table><thead><tr><th>Evaluation subset</th><th>Test rows</th><th>Correct</th><th>Accuracy</th><th>Macro F1</th></tr></thead><tbody>''' + rows + '''</tbody></table>
<h2>Training and live input</h2><p>K-means uses four clusters, 20 initializations and seed 2026. Artificial training class assignments name the clusters. The Random Forest learns numeric cluster IDs with 200 trees, maximum depth 6, minimum leaf size 4 and seed 2026. Test data does not fit the scaler, cluster centers, mapping, or forest.</p>
<p>Live input is the existing five-value EEG feature vector. The first four log10 band powers are normalized using a scaler fitted only on the 76 original training rows. TBR is accepted for interface compatibility but is not used by this model. The forest predicts a cluster, then the frozen mapping returns distracted, focused, overstimulated, or relaxed. Personal clusters do not replace this frozen classifier after additional windows.</p>
<h2>Provenance</h2><p>Data augmentation and artificial demonstration construction are distinct sources, retained in the dataset and per-source results. Supporting literature does not turn the mixed demonstration result into measured accuracy on new learners. Runtime artifact and dataset hashes are recorded in metrics.json.</p></html>'''
    return html.replace('81.72%', f"{metadata['mixed_demo_only']['accuracy']:.2%}").replace('42.11%', f"{metadata['by_provenance']['real']['accuracy']:.2%}")


class Command(BaseCommand):
    help = 'Export the selected Augmented EEG Classifier from its frozen, provenance-labeled dataset.'

    def add_arguments(self, parser):
        default = Path(settings.BASE_DIR) / 'model-artifacts' / 'augmented-eeg'
        parser.add_argument('--dataset', type=Path, default=default / 'epochs.csv')
        parser.add_argument('--output-dir', type=Path, default=default)

    def handle(self, *args, **options):
        source, output = options['dataset'], options['output_dir']
        try:
            with source.open(newline='') as stream:
                rows = list(csv.DictReader(stream))
            model, metadata = train(rows)
        except (OSError, ValueError, KeyError) as exc:
            raise CommandError(str(exc)) from exc
        output.mkdir(parents=True, exist_ok=True)
        artifact = output / 'classifier.joblib'
        joblib.dump(model, artifact)
        metadata['dataset_sha256'] = hashlib.sha256(source.read_bytes()).hexdigest()
        metadata['artifact_sha256'] = hashlib.sha256(artifact.read_bytes()).hexdigest()
        # A reload must preserve the live-input implementation and its probabilities.
        loaded = joblib.load(artifact)
        sample = np.column_stack([matrix([r for r in rows if r['provenance'] == 'real'][:4], FEATURES[:4]), np.zeros(4)])
        if not np.array_equal(loaded.predict(sample), model.predict(sample)):
            raise CommandError('Exported classifier changed its predictions after reload.')
        (output / 'metrics.json').write_text(json.dumps(metadata, indent=2) + '\n')
        (output / 'analysis.html').write_text(report(metadata))
        self.stdout.write(self.style.SUCCESS(f'Exported {metadata["display_name"]}: mixed demonstration {metadata["mixed_demo_only"]["accuracy"]:.2%}; original EEG {metadata["by_provenance"]["real"]["accuracy"]:.2%}.'))
