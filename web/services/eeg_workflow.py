from __future__ import annotations

from django.db import transaction

from web.models import EEGRecording

from .eeg_data import EEGDataStore
from .eeg_storage import EEGStorage


class EEGRecordingWorkflow:
    """Coordinates local files and authoritative PostgreSQL metadata."""

    def __init__(self, storage=None, data_store=None):
        self.storage = storage or EEGStorage()
        self.data_store = data_store or EEGDataStore(self.storage)

    @transaction.atomic
    def start(self, *, session, connection, started_at, sampling_rate_hz, channel_names):
        return EEGRecording.objects.create(
            session=session, connection=connection, started_at=started_at,
            sampling_rate_hz=sampling_rate_hz, channel_count=len(channel_names),
            channel_names=list(channel_names), processing_status=EEGRecording.ProcessingStatus.RECORDING,
        )

    def attach_raw_file(self, recording, temporary_file, *, extension="edf", overwrite=False):
        key = self.storage.raw_key(recording.pk, extension)
        path = self.storage.atomic_commit(temporary_file, key, overwrite=overwrite)
        with transaction.atomic():
            recording.raw_storage_path = key
            recording.raw_file_size_bytes = path.stat().st_size
            recording.raw_checksum_sha256 = self.storage.checksum(path)
            recording.processing_status = EEGRecording.ProcessingStatus.PROCESSING
            recording.save(update_fields=["raw_storage_path", "raw_file_size_bytes", "raw_checksum_sha256", "processing_status", "updated_at"])
        return key

    def complete(self, recording, rows, *, overwrite=False):
        try:
            key = self.data_store.write(recording.pk, rows, overwrite=overwrite)
            path = self.storage.resolve(key)
            with transaction.atomic():
                recording.processed_storage_path = key
                recording.processed_file_size_bytes = path.stat().st_size
                recording.processed_checksum_sha256 = self.storage.checksum(path)
                recording.processing_status = EEGRecording.ProcessingStatus.COMPLETED
                recording.processing_error = ""
                recording.save(update_fields=["processed_storage_path", "processed_file_size_bytes", "processed_checksum_sha256", "processing_status", "processing_error", "updated_at"])
        except Exception as exc:
            self.fail(recording, exc)
            raise
        return key

    @transaction.atomic
    def fail(self, recording, error):
        recording.processing_status = EEGRecording.ProcessingStatus.FAILED
        recording.processing_error = str(error).replace("\r", " ").replace("\n", " ")[:1000]
        recording.save(update_fields=["processing_status", "processing_error", "updated_at"])
