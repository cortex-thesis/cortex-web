from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import numpy as np
from django.test import SimpleTestCase, override_settings

from web.services.augmented_eeg import FEATURES, WORKFLOW
from web.services.live_eeg import classify_and_update, ensure_model_version, global_model


@override_settings(EEG_ACTIVE_MODEL_SUBDIR='augmented-eeg')
class AugmentedEEGTests(SimpleTestCase):
    def setUp(self):
        global_model.cache_clear()
        self.model, self.metadata = global_model()
        self.addCleanup(global_model.cache_clear)

    def test_export_reproduces_entire_scored_test_set_through_live_adapter(self):
        # Recreate raw log-power inputs from saved demonstration coordinates.
        # This checks all 279 predictions, not merely the rounded score.
        rows = self.metadata['test_cases']
        coordinates = np.asarray([r['coordinates'] for r in rows])
        values = np.column_stack([self.model.scaler.inverse_transform(coordinates), np.ones(len(rows))])
        predicted = self.model.predict(values)
        expected = [r['predicted'] for r in self.metadata['test_cases']]
        np.testing.assert_array_equal(predicted, expected)
        self.assertEqual(sum(p == r['actual'] for p, r in zip(predicted, rows)), 228)
        self.assertAlmostEqual(self.metadata['mixed_demo_only']['accuracy'], 228 / 279)
        self.assertAlmostEqual(self.metadata['by_provenance']['real']['accuracy'], 8 / 19)
        self.assertFalse(self.metadata['biological_validation'])
        np.testing.assert_allclose(self.model.predict_proba(values).sum(axis=1), 1)

    def test_tbr_is_accepted_but_not_used_and_invalid_features_are_rejected(self):
        values = np.column_stack([self.model.scaler.inverse_transform(np.zeros((2, 4))), [0., 1000.]])
        np.testing.assert_array_equal(self.model.predict(values[:1]), self.model.predict(values[1:]))
        with self.assertRaisesMessage(ValueError, 'five live EEG features'):
            self.model.predict([[1., 2., 3., 4.]])
        with self.assertRaisesMessage(ValueError, 'finite'):
            self.model.predict([[1., 2., np.nan, 4., 1.]])

    def test_selected_model_stays_in_use_after_personalization_threshold(self):
        vector = self.model.scaler.mean_.tolist() + [1.]
        expected = self.model.predict([vector])[0]
        with patch('web.services.live_eeg.global_model', return_value=(self.model, self.metadata)) as selected:
            for _ in range(16):
                state, confidence, cluster, rationale = classify_and_update.__wrapped__(
                    'student', 'device', vector, SimpleNamespace(pk='new'))
                self.assertEqual(state, expected)
                self.assertTrue(0 <= confidence <= 1)
                self.assertIn(cluster, range(4))
                self.assertIn('Augmented EEG Classifier', rationale)
            self.assertEqual(selected.call_count, 16)

    def test_version_identifies_selected_artifact(self):
        version = SimpleNamespace(is_active=False, name='cortex-global-eeg', pk='new', save=MagicMock())
        with patch('web.services.live_eeg.ModelVersion') as records:
            records.objects.get_or_create.return_value = (version, True)
            self.assertIs(ensure_model_version(), version)
        kwargs = records.objects.get_or_create.call_args.kwargs
        self.assertTrue(kwargs['version'].startswith('augmented-eeg-'))
        self.assertEqual(kwargs['defaults']['algorithm'], 'AugmentedClusterRandomForest')
        self.assertEqual(kwargs['defaults']['metrics']['workflow'], WORKFLOW)
        self.assertEqual(kwargs['defaults']['hyperparameters']['features'], FEATURES)
        self.assertTrue(version.is_active)

    def test_missing_selected_model_does_not_fall_back_to_retired_artifact(self):
        from tempfile import TemporaryDirectory
        from web.services.augmented_eeg import artifact_directory
        with TemporaryDirectory() as root, override_settings(MODEL_ARTIFACT_ROOT=Path(root)):
            old = Path(root) / 'mixed-1395'
            old.mkdir()
            (old / 'classifier.joblib').write_bytes(b'old')
            self.assertEqual(artifact_directory(), Path(root) / 'augmented-eeg')
            global_model.cache_clear()
            with self.assertRaises(FileNotFoundError):
                global_model()

    def test_training_rejects_descendants_crossing_their_parent_split(self):
        from web.management.commands.train_augmented_eeg_model import train
        rows = [dict(split='train', provenance='real', class_label='focused', parent_epoch_id='parent'),
                dict(split='test', provenance='eeg_derived_augmented', class_label='focused', parent_epoch_id='parent')]
        with self.assertRaisesMessage(ValueError, 'parent partition'):
            train(rows)
