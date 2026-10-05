"""Test worker settings: never use application databases or private storage."""
from cortex.settings import *  # noqa: F403

DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
OFFLINE_SYNC_ENABLED = False
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

import os
import tempfile
from pathlib import Path
_validation_data = tempfile.TemporaryDirectory(prefix="cortex-test-eeg-")
EEG_DATA_ROOT = Path(os.environ.get("CORTEX_VALIDATION_EEG_ROOT") or _validation_data.name)
MEDIA_ROOT = Path(_validation_data.name) / "media"
