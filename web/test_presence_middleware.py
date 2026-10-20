from types import SimpleNamespace
from unittest.mock import patch

from django.http import HttpResponse
from django.test import SimpleTestCase

from .middleware import ClassSessionPresenceMiddleware


class PresenceProbeTests(SimpleTestCase):
    def setUp(self):
        self.response = HttpResponse('ok')
        self.middleware = ClassSessionPresenceMiddleware(lambda request: self.response)

    def test_connectivity_probes_do_not_resolve_authentication_or_expire_sessions(self):
        class ProbeRequest:
            @property
            def user(self):
                raise AssertionError('A connectivity probe must not load the user.')

        with patch('web.class_sessions.expire_offline_sessions') as expire:
            for path in ('/api/health/', '/api/sync/status/'):
                with self.subTest(path=path):
                    request = ProbeRequest()
                    request.path = path
                    self.assertIs(self.middleware(request), self.response)
            expire.assert_not_called()

    def test_authenticated_application_requests_still_expire_abandoned_classrooms(self):
        request = SimpleNamespace(path='/api/class-sessions/', user=SimpleNamespace(is_authenticated=True))
        with patch('web.class_sessions.expire_offline_sessions') as expire:
            self.assertIs(self.middleware(request), self.response)
            expire.assert_called_once_with()

    def test_anonymous_application_requests_do_not_expire_classrooms(self):
        request = SimpleNamespace(path='/api/class-sessions/', user=SimpleNamespace(is_authenticated=False))
        with patch('web.class_sessions.expire_offline_sessions') as expire:
            self.assertIs(self.middleware(request), self.response)
            expire.assert_not_called()
