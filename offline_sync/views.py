from django.conf import settings
from django.db import OperationalError, ProgrammingError
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_GET

from .models import ReplicaState


@require_GET
def sync_status(request):
    payload = {"enabled": settings.OFFLINE_SYNC_ENABLED}
    if settings.OFFLINE_SYNC_ENABLED:
        try:
            state = ReplicaState.objects.only("initialized", "status", "last_success", "heartbeat", "pending", "message").first()
        except (OperationalError, ProgrammingError):
            state = None
        if not state:
            payload.update(status="setup_required", message="Local database setup required.")
        else:
            stale = not state.heartbeat or (timezone.now() - state.heartbeat).total_seconds() > max(60, settings.OFFLINE_SYNC_INTERVAL * 3)
            payload.update(
                status="worker_stopped" if stale else state.status,
                initialized=state.initialized, last_success=state.last_success,
                message="Sync worker is not responding. Local changes remain saved." if stale else state.message,
            )
            # The login page gets connectivity only, never account data/conflicts.
            if request.user.is_authenticated:
                payload["pending"] = state.pending
    response = JsonResponse(payload)
    response["Cache-Control"] = "no-store"
    return response
