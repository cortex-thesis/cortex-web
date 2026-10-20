"""Runtime adapter for the frozen augmented/artificial-data classifier.

The mixed demonstration score is not an estimate of live EEG accuracy.
"""
import numpy as np

FEATURES = ['log_theta', 'log_alpha', 'log_beta', 'log_gamma', 'linear_theta_beta_ratio']
STATES = ['distracted', 'focused', 'overstimulated', 'relaxed']
WORKFLOW = 'augmented_eeg_random_forest'


def artifact_directory():
    from pathlib import Path
    from django.conf import settings
    root = Path(getattr(settings, 'MODEL_ARTIFACT_ROOT', settings.BASE_DIR / 'model-artifacts'))
    name = getattr(settings, 'EEG_ACTIVE_MODEL_SUBDIR', 'augmented-eeg')
    if name != 'augmented-eeg':
        raise ValueError('Only the selected augmented-eeg model is supported.')
    return root / name


class AugmentedEEGClassifier:
    """Map live log-power inputs into the exact training coordinate system.

    TBR is accepted for compatibility with the acquisition pipeline but is not
    used by this four-feature model. The scaler is fitted on original training
    EEG only; artificial rows already live in standardized coordinates.
    """

    def __init__(self, scaler, forest, cluster_to_state):
        self.scaler = scaler
        self.forest = forest
        self.cluster_to_state = {int(k): v for k, v in cluster_to_state.items()}
        self.classes_ = np.asarray(STATES)
        self.n_features_in_ = len(FEATURES)

    @property
    def named_steps(self):
        return {'model': self.forest}

    def _coordinates(self, values):
        values = np.asarray(values, dtype=float)
        if values.ndim != 2 or values.shape[1] != self.n_features_in_:
            raise ValueError('Expected five live EEG features in the documented order.')
        if not np.isfinite(values).all():
            raise ValueError('EEG features must be finite.')
        return self.scaler.transform(values[:, :4])

    def predict_cluster(self, values):
        return self.forest.predict(self._coordinates(values)).astype(int)

    def predict(self, values):
        return np.asarray([self.cluster_to_state[int(k)] for k in self.predict_cluster(values)])

    def predict_proba(self, values):
        raw = self.forest.predict_proba(self._coordinates(values))
        probabilities = np.zeros((len(raw), len(self.classes_)))
        for column, cluster in enumerate(self.forest.classes_):
            state = self.cluster_to_state[int(cluster)]
            probabilities[:, STATES.index(state)] += raw[:, column]
        return probabilities
