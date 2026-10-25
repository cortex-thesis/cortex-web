class ClassSessionPresenceMiddleware:
    """Close abandoned classrooms before authenticated API reads or writes."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Connectivity probes must stay cheap even during a live lesson. They
        # must not load the user or finalize abandoned classrooms to report
        # whether this server can be reached.
        if request.path in {'/api/health/', '/api/sync/status/'}:
            return self.get_response(request)
        if request.path.startswith('/api/') and request.user.is_authenticated:
            from .class_sessions import expire_offline_sessions
            expire_offline_sessions()
        return self.get_response(request)
