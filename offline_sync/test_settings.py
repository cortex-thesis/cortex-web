"""Isolated dual-SQLite suite; never connects to the configured Supabase project."""
from cortex.settings import *  # noqa: F403

OFFLINE_SYNC_ENABLED = True
DATABASES = {
    alias: {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:",
            "OPTIONS": {"transaction_mode": "IMMEDIATE"}}
    for alias in ("default", "cloud")
}
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.InMemoryStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}
