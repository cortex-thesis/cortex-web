from django.conf import settings
from django.db import OperationalError, ProgrammingError
from django.http import JsonResponse

from .models import ReplicaState


class InitializationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if settings.OFFLINE_SYNC_ENABLED and request.path.startswith("/api/") and request.path not in {
            "/api/health/", "/api/sync/status/",
        }:
            try:
                ready = ReplicaState.objects.filter(pk=1, initialized=True).exists()
            except (OperationalError, ProgrammingError):
                ready = False
            if not ready:
                return JsonResponse({"detail": "Local database setup required. Run migrate, then sync_cortex --initialize while online."}, status=503)
        return self.get_response(request)
