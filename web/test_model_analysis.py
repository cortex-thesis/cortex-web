from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import patch

from django.http import JsonResponse
from django.test import RequestFactory, SimpleTestCase, override_settings

from .views import model_analysis_report


class ModelAnalysisTests(SimpleTestCase):
    def setUp(self):
        self.request = RequestFactory().get('/api/model-analysis/report/')

    def test_requires_authentication(self):
        with patch('web.views._require_profile', return_value=(None, JsonResponse({'detail': 'Authentication required.'}, status=401))):
            self.assertEqual(model_analysis_report(self.request).status_code, 401)

    def test_denies_school_admin(self):
        with patch('web.views._require_profile', return_value=(SimpleNamespace(is_super_admin=False), None)):
            self.assertEqual(model_analysis_report(self.request).status_code, 403)

    def test_missing_report_returns_helpful_error(self):
        with TemporaryDirectory() as root, override_settings(MODEL_ARTIFACT_ROOT=Path(root)), patch('web.views._require_profile', return_value=(SimpleNamespace(is_super_admin=True), None)):
            self.assertEqual(model_analysis_report(self.request).status_code, 404)

    def test_serves_generated_report_without_cache(self):
        with TemporaryDirectory() as root, override_settings(MODEL_ARTIFACT_ROOT=Path(root)), patch('web.views._require_profile', return_value=(SimpleNamespace(is_super_admin=True), None)):
            directory = Path(root) / 'mixed-1395'; directory.mkdir()
            (directory / 'analysis.html').write_text('<h1>Model analysis</h1>', encoding='utf-8')
            response = model_analysis_report(self.request)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(b''.join(response.streaming_content), b'<h1>Model analysis</h1>')
            self.assertIn('no-store', response['Cache-Control'])
            self.assertIn('sandbox', response['Content-Security-Policy'])
            response.close()
