import os
import sys
import threading

from django.apps import AppConfig
from django.conf import settings


class OfflineSyncConfig(AppConfig):
    name = "offline_sync"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self):
        if settings.OFFLINE_SYNC_ENABLED and "test" not in sys.argv:
            from .ids import install_allocators
            install_allocators()
        # No DB/network access at import time, during migrations or in tests.
        if (settings.OFFLINE_SYNC_ENABLED and not settings.OFFLINE_SYNC_PAUSED and "runserver" in sys.argv
                and ("--noreload" in sys.argv or os.environ.get("RUN_MAIN") == "true")):
            from .worker import watch
            threading.Thread(target=watch, name="cortex-sync", daemon=True).start()
