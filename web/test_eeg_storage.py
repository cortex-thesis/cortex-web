import hashlib
import tempfile
import uuid
from pathlib import Path
from unittest import mock

from django.core.exceptions import ValidationError
from django.test import SimpleTestCase, override_settings
from django.utils import timezone

from .models import EEGRecording
from .services.eeg_data import EEGDataStore
from .services.eeg_storage import EEGStorage, UnsafeObjectKey
from .services.eeg_workflow import EEGRecordingWorkflow


class EEGStorageTests(SimpleTestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.storage = EEGStorage(self.temporary.name)
        self.recording_id = uuid.uuid4()

    def test_uuid_object_keys_are_portable(self):
        self.assertEqual(self.storage.raw_key(self.recording_id), f"eeg/raw/{self.recording_id}.edf")
        self.assertEqual(self.storage.processed_key(self.recording_id), f"eeg/processed/{self.recording_id}.parquet")
        self.assertNotIn("\\", self.storage.raw_key(self.recording_id))

    def test_rejects_absolute_and_traversal_keys(self):
        for key in ("../secret.edf", "eeg/../../secret.edf", "C:\\secret.edf", "/secret.edf"):
            with self.subTest(key=key), self.assertRaises(UnsafeObjectKey):
                self.storage.resolve(key)

    def test_checksum_and_no_implicit_overwrite(self):
        key = self.storage.raw_key(self.recording_id)
        temporary = self.storage.temporary_path(key)
        temporary.write_bytes(b"synthetic-eeg")
        target = self.storage.atomic_commit(temporary, key)
        self.assertEqual(self.storage.checksum(target), hashlib.sha256(b"synthetic-eeg").hexdigest())
        another = self.storage.temporary_path(key)
        another.write_bytes(b"replacement")
        with self.assertRaises(FileExistsError):
            self.storage.atomic_commit(another, key)


class EEGDataStoreTests(SimpleTestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.recording_id = uuid.uuid4()
        self.data = EEGDataStore(EEGStorage(self.temporary.name))

    def test_parquet_round_trip_and_duckdb_query(self):
        rows = [
            {"sample_index": 0, "channel": "AF7", "value": 1.0},
            {"sample_index": 1, "channel": "AF7", "value": 3.0},
            {"sample_index": 0, "channel": "AF8", "value": 4.0},
        ]
        key = self.data.write(self.recording_id, rows)
        self.assertTrue(key.endswith(".parquet"))
        self.assertEqual(len(self.data.read(self.recording_id)), 3)
        self.assertEqual(self.data.query(self.recording_id), [
            {"channel": "AF7", "mean_value": 2.0},
            {"channel": "AF8", "mean_value": 4.0},
        ])


class EEGRecordingValidationTests(SimpleTestCase):
    def test_rejects_bad_metadata(self):
        recording = EEGRecording(
            sampling_rate_hz=0, channel_count=0, started_at=timezone.now(),
            raw_checksum_sha256="not-a-checksum",
        )
        with self.assertRaises(ValidationError) as raised:
            recording.clean()
        self.assertIn("sampling_rate_hz", raised.exception.message_dict)
        self.assertIn("channel_count", raised.exception.message_dict)
        self.assertIn("raw_checksum_sha256", raised.exception.message_dict)

    def test_rejects_end_before_start(self):
        now = timezone.now()
        recording = EEGRecording(sampling_rate_hz=256, channel_count=4, started_at=now, ended_at=now - timezone.timedelta(seconds=1))
        with self.assertRaises(ValidationError):
            recording.clean()


class EEGWorkflowFailureTests(SimpleTestCase):
    @mock.patch.object(EEGRecordingWorkflow, "fail")
    def test_processing_failure_marks_metadata_and_preserves_raw_file(self, fail):
        recording = mock.Mock(pk=uuid.uuid4())
        data_store = mock.Mock()
        data_store.write.side_effect = RuntimeError("synthetic processing failure")
        workflow = EEGRecordingWorkflow(storage=mock.Mock(), data_store=data_store)
        with self.assertRaises(RuntimeError):
            workflow.complete(recording, [])
        fail.assert_called_once()
