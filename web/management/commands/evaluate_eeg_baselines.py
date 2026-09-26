import csv
import json
from pathlib import Path

import joblib
import numpy as np
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from scipy.optimize import linear_sum_assignment
from sklearn.cluster import KMeans
from sklearn.metrics import (accuracy_score, balanced_accuracy_score, calinski_harabasz_score,
    classification_report, confusion_matrix, davies_bouldin_score, silhouette_score)
from sklearn.preprocessing import StandardScaler

from web.services.live_eeg import tbr_baseline

FEATURES = ['log_theta', 'log_alpha', 'log_beta', 'log_gamma', 'linear_theta_beta_ratio']
STATES = ['distracted', 'focused', 'overstimulated', 'relaxed']


def metrics(actual, predicted):
    report = classification_report(actual, predicted, labels=STATES, output_dict=True, zero_division=0)
    return {'accuracy': accuracy_score(actual, predicted), 'balanced_accuracy': balanced_accuracy_score(actual, predicted),
            'macro_precision': report['macro avg']['precision'], 'macro_recall': report['macro avg']['recall'],
            'macro_f1': report['macro avg']['f1-score'], 'confusion_matrix': confusion_matrix(actual, predicted, labels=STATES).tolist(),
            'labels': STATES, 'per_class': report}


def mapping(clusters, labels):
    matrix = np.zeros((4, 4), dtype=int)
    for cluster, label in zip(clusters, labels): matrix[int(cluster), STATES.index(label)] += 1
    rows, cols = linear_sum_assignment(-matrix)
    return {int(row): STATES[int(col)] for row, col in zip(rows, cols)}, matrix.tolist()


class Command(BaseCommand):
    help = 'Compare generalized, individualized-cluster, and documented TBR baselines on one fixed split.'

    def handle(self, *args, **options):
        root = Path(getattr(settings, 'MODEL_ARTIFACT_ROOT', settings.BASE_DIR / 'model-artifacts')) / 'mixed-1395'
        if not (root / 'epochs.csv').exists() or not (root / 'classifier.joblib').exists():
            raise CommandError('Run train_mixed_epoch_model first.')
        with (root / 'epochs.csv').open(encoding='utf-8') as stream: rows = list(csv.DictReader(stream))
        train = [row for row in rows if row['split'] == 'train']; test = [row for row in rows if row['split'] == 'test']
        vector = lambda row: [float(row[name]) for name in FEATURES]
        x_test = np.asarray([vector(row) for row in test]); y_test = [row['condition'] for row in test]
        global_predictions = joblib.load(root / 'classifier.joblib').predict(x_test).tolist()
        tbr_predictions = [tbr_baseline(vector(row)) for row in test]
        individual_predictions, cluster_details = [], {}
        for participant in sorted({row['participant_code'] for row in test}):
            own_train = [row for row in train if row['participant_code'] == participant]
            own_test_indexes = [index for index, row in enumerate(test) if row['participant_code'] == participant]
            scaler = StandardScaler().fit([vector(row) for row in own_train])
            scaled = scaler.transform([vector(row) for row in own_train])
            kmeans = KMeans(n_clusters=4, n_init=30, random_state=42).fit(scaled)
            cluster_map, composition = mapping(kmeans.labels_, [row['condition'] for row in own_train])
            predicted = [cluster_map[int(value)] for value in kmeans.predict(scaler.transform([vector(test[index]) for index in own_test_indexes]))]
            individual_predictions.extend(zip(own_test_indexes, predicted))
            cluster_details[participant] = {'training_rows': len(own_train), 'mapping': cluster_map, 'composition': composition,
                'silhouette': silhouette_score(scaled, kmeans.labels_), 'davies_bouldin': davies_bouldin_score(scaled, kmeans.labels_),
                'calinski_harabasz': calinski_harabasz_score(scaled, kmeans.labels_), 'inertia': kmeans.inertia_}
        ordered = [value for _, value in sorted(individual_predictions)]
        result = {'evaluation_split': {'train_rows': len(train), 'test_rows': len(test), 'shared_by_all_models': True,
                    'warning': 'Mixed recorded/augmented source-epoch-separated split; not unseen-student validation.'},
                  'features': FEATURES, 'tbr_baseline_rule': {'distracted': 'TBR >= 1.5', 'relaxed': 'alpha is dominant',
                    'overstimulated': 'gamma exceeds alpha and beta', 'focused': 'otherwise'},
                  'generalized_global_classifier': metrics(y_test, global_predictions),
                  'individualized_classification_via_clustering': metrics(y_test, ordered),
                  'tbr_threshold_baseline': metrics(y_test, tbr_predictions), 'student_clusters': cluster_details}
        (root / 'comparison_metrics.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
        self.stdout.write(self.style.SUCCESS(f'Comparison saved to {(root / "comparison_metrics.json").resolve()}'))
