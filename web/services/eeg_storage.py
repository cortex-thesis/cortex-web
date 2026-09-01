from __future__ import annotations

import hashlib
import os
import uuid
from pathlib import Path, PurePosixPath

from django.conf import settings


class UnsafeObjectKey(ValueError):
    pass


class EEGStorage:
    def __init__(self, root: Path | str | None = None):
        self.root = Path(root or settings.EEG_DATA_ROOT).resolve()

    @staticmethod
    def _uuid(value) -> uuid.UUID:
        return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))

    def raw_key(self, recording_id, extension: str = "edf") -> str:
        return f"eeg/{settings.EEG_RAW_SUBDIR}/{self._uuid(recording_id)}.{extension.lstrip('.')}"

    def processed_key(self, recording_id) -> str:
        return f"eeg/{settings.EEG_PROCESSED_SUBDIR}/{self._uuid(recording_id)}.parquet"

    def model_key(self, model_version_id, extension: str = "joblib") -> str:
        return f"{settings.EEG_MODEL_SUBDIR}/{self._uuid(model_version_id)}.{extension.lstrip('.')}"

    def resolve(self, object_key: str, *, create_parent: bool = False) -> Path:
        key = str(object_key).replace("\\", "/")
        posix = PurePosixPath(key)
        if not key or posix.is_absolute() or ".." in posix.parts or Path(key).is_absolute():
            raise UnsafeObjectKey("Object keys must be safe relative paths.")
        candidate = self.root.joinpath(*posix.parts).resolve()
        try:
            candidate.relative_to(self.root)
        except ValueError as exc:
            raise UnsafeObjectKey("Object key escapes EEG_DATA_ROOT.") from exc
        if create_parent:
            candidate.parent.mkdir(parents=True, exist_ok=True)
        return candidate

    def temporary_path(self, object_key: str) -> Path:
        target = self.resolve(object_key)
        temp_key = f"{settings.EEG_TEMP_SUBDIR}/{target.name}.{uuid.uuid4().hex}.tmp"
        return self.resolve(temp_key, create_parent=True)

    def atomic_commit(self, temporary: Path, object_key: str, *, overwrite: bool = False) -> Path:
        destination = self.resolve(object_key, create_parent=True)
        if destination.exists() and not overwrite:
            raise FileExistsError(f"EEG object already exists: {object_key}")
        os.replace(temporary, destination)
        return destination

    @staticmethod
    def checksum(path: Path | str) -> str:
        digest = hashlib.sha256()
        with Path(path).open("rb") as stream:
            for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                digest.update(chunk)
        return digest.hexdigest()
