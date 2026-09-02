from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from web.models import Asset, AuditLog, EEGRecording
from web.services.eeg_storage import EEGStorage, UnsafeObjectKey


class Command(BaseCommand):
    help = "Apply the configured media/EEG retention schedule. Dry-run unless --apply is supplied."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true", help="Delete expired objects and clear their storage metadata.")

    def handle(self, *args, **options):
        apply_changes = options["apply"]
        now = timezone.now()
        storage = EEGStorage()
        raw_cutoff = now - timedelta(days=settings.EEG_RAW_RETENTION_DAYS)
        processed_cutoff = now - timedelta(days=settings.EEG_PROCESSED_RETENTION_DAYS)
        media_cutoff = now - timedelta(days=settings.ARCHIVED_MEDIA_RETENTION_DAYS)
        counts = {"raw_eeg": 0, "processed_eeg": 0, "archived_media": 0}

        for recording in EEGRecording.objects.filter(ended_at__lt=raw_cutoff).exclude(raw_storage_path=""):
            counts["raw_eeg"] += 1
            if apply_changes:
                self._delete_eeg_object(storage, recording.raw_storage_path)
                recording.raw_storage_path = ""
                recording.raw_file_size_bytes = 0
                recording.save(update_fields=["raw_storage_path", "raw_file_size_bytes", "updated_at"])
                self._audit(recording, "raw_eeg_retention_deleted")

        for recording in EEGRecording.objects.filter(ended_at__lt=processed_cutoff).exclude(processed_storage_path=""):
            counts["processed_eeg"] += 1
            if apply_changes:
                self._delete_eeg_object(storage, recording.processed_storage_path)
                recording.processed_storage_path = ""
                recording.processed_file_size_bytes = 0
                recording.save(update_fields=["processed_storage_path", "processed_file_size_bytes", "updated_at"])
                self._audit(recording, "processed_eeg_retention_deleted")

        for asset in Asset.objects.filter(archived_at__lt=media_cutoff).exclude(file=""):
            counts["archived_media"] += 1
            if apply_changes:
                asset.file.delete(save=False)
                asset.file = ""
                asset.storage_path = ""
                asset.save(update_fields=["file", "storage_path"])
                self._audit(asset, "archived_media_retention_deleted")

        mode = "applied" if apply_changes else "dry-run"
        self.stdout.write(self.style.SUCCESS(f"Retention {mode}: {counts}"))

    @staticmethod
    def _delete_eeg_object(storage, object_key):
        try:
            path = storage.resolve(object_key)
        except UnsafeObjectKey as exc:
            raise ValueError(f"Unsafe EEG object key in database: {object_key}") from exc
        if path.exists():
            path.unlink()

    @staticmethod
    def _audit(obj, action):
        AuditLog.objects.create(
            actor=None, action=action, object_type=obj.__class__.__name__, object_id=str(obj.pk),
            metadata={"policy": "configured_retention_schedule"},
        )
