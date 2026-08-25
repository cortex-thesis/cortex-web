from django.test import TestCase


class RoutingTests(TestCase):
    def test_frontend_routes_render_react_shell(self):
        for route in ("/", "/student/home", "/teacher/dashboard"):
            response = self.client.get(route)
            self.assertEqual(response.status_code, 200)
            self.assertContains(response, '<div id="root"></div>', html=True)

    def test_health_endpoint(self):
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok", "service": "cortex"})
