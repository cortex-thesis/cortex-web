import logging
import time

from botocore.exceptions import ConnectionClosedError, ConnectTimeoutError, EndpointConnectionError, ReadTimeoutError

from django.conf import settings
from django.db import IntegrityError, InterfaceError, OperationalError, connections
from django.utils import timezone

from .engine import SyncError, changed_count, snapshot, sync_once
from .models import ReplicaState

logger = logging.getLogger(__name__)


def run_cycle(initialize=False):
    if not settings.OFFLINE_SYNC_ENABLED or "cloud" not in connections:
        raise SyncError("Set CORTEX_OFFLINE_SYNC=true and configure Supabase first.")
    try:
        ReplicaState.objects.filter(pk=1).update(status="syncing", heartbeat=timezone.now())
        return sync_once(initialize=initialize)
    except Exception as error:
        # Never expose credentials, connection strings or data values in status.
        offline = isinstance(error, (OperationalError, InterfaceError, ConnectionClosedError,
                                     ConnectTimeoutError, EndpointConnectionError, ReadTimeoutError))
        message = ("Cloud unavailable. Changes remain saved on this laptop." if offline
                   else str(error) if isinstance(error, SyncError)
                   else "Sync could not finish. Check schema, constraints and file storage; local changes are preserved.")
        if offline and "connection timeout" in str(error).lower():
            message = ("Supabase connection timed out. Check network access to the database port "
                       "and project availability. Changes remain saved on this laptop.")
        if isinstance(error, IntegrityError):
            cause = error.__cause__
            diagnostics = getattr(cause, "diag", None)
            constraint = getattr(diagnostics, "constraint_name", None)
            # SQLite's named-column constraint messages have no row values.
            sqlite_message = str(error) if getattr(cause, "sqlite_errorname", "") else ""
            if sqlite_message.startswith(("UNIQUE constraint failed:", "FOREIGN KEY constraint failed", "NOT NULL constraint failed:")):
                constraint = sqlite_message
            message = f"Sync stopped at a database constraint: {constraint or 'referential integrity or uniqueness'}. Local changes are preserved."
        try:
            state, _ = ReplicaState.objects.get_or_create(pk=1)
            pending = changed_count(state.baseline, snapshot("default")) if state.initialized else 0
            ReplicaState.objects.filter(pk=1).update(
                status="offline" if offline else "error", message=message,
                pending=pending, heartbeat=timezone.now(),
            )
        except Exception:
            pass  # Startup may precede local migrations. The next cycle retries.
        logger.warning("Cortex sync paused (%s).", type(error).__name__)
        raise SyncError(message) from None
    finally:
        connections.close_all()


def watch():
    while True:
        try:
            run_cycle()
        except SyncError:
            pass
        time.sleep(settings.OFFLINE_SYNC_INTERVAL)
