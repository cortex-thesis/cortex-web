import json
import tempfile
from pathlib import Path
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import Client, TestCase

from .models import Profile
from .validation import now, save


class ValidationAPITests(TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        self.root_patch = patch('web.validation.root', return_value=self.directory)
        self.root_patch.start()
        self.addCleanup(self.root_patch.stop)
        self.admin = Profile.objects.create(user=User.objects.create_user('validation-admin'), role=Profile.Role.ADMIN, admin_scope=Profile.AdminScope.SUPER)

    def test_validation_api_denies_anonymous_and_non_super_admin_roles(self):
        for method in (self.client.get, self.client.post):
            self.assertEqual(method('/api/admin/validation/').status_code, 401)
        for role, scope in ((Profile.Role.STUDENT, 'none'), (Profile.Role.TEACHER, 'none'), (Profile.Role.ADMIN, 'school')):
            profile = Profile.objects.create(user=User.objects.create_user('validation-' + role + scope), role=role, admin_scope=scope)
            self.client.force_login(profile.user)
            self.assertEqual(self.client.get('/api/admin/validation/').status_code, 403)
            self.assertEqual(self.client.post('/api/admin/validation/').status_code, 403)

    def test_validation_api_runs_fixed_command_and_blocks_concurrent_runs(self):
        self.client.force_login(self.admin.user)
        with patch('web.validation.subprocess.Popen') as process:
            response = self.client.post('/api/admin/validation/', data=json.dumps({'command': 'untrusted-command'}), content_type='application/json')
            self.assertEqual(response.status_code, 202)
            arguments = process.call_args.args[0]
            self.assertEqual(arguments[1:3], ['-m', 'web.validation_worker'])
            self.assertNotIn('untrusted-command', arguments)
            self.assertEqual(process.call_args.kwargs['env']['DJANGO_SETTINGS_MODULE'], 'web.validation_settings')
            self.assertNotIn('DATABASE_URL', process.call_args.kwargs['env'])
            self.assertEqual(self.client.post('/api/admin/validation/').status_code, 409)
            self.assertEqual(process.call_count, 1)
        listing = self.client.get('/api/admin/validation/')
        self.assertEqual(listing['Cache-Control'], 'no-store')
        self.assertEqual(len(listing.json()['runs']), 1)

    def test_validation_api_launch_failure_is_saved_and_unlocks(self):
        self.client.force_login(self.admin.user)
        with patch('web.validation.subprocess.Popen', side_effect=OSError('private-machine-path')):
            response = self.client.post('/api/admin/validation/')
        self.assertEqual(response.status_code, 503)
        self.assertNotIn('private-machine-path', response.content.decode())
        self.assertFalse((self.directory / 'run.lock').exists())

    def test_validation_api_requires_csrf_for_run_requests(self):
        client = Client(enforce_csrf_checks=True)
        client.force_login(self.admin.user)
        self.assertEqual(client.post('/api/admin/validation/').status_code, 403)

    def test_validation_api_manual_evidence_validation_and_persistence(self):
        self.client.force_login(self.admin.user)
        run_id = 'a' * 32
        save(self.directory / f'{run_id}.json', {'id': run_id, 'started_at': now(), 'status': 'complete', 'tests': [], 'manual': {}})
        url = f'/api/admin/validation/{run_id}/manual/'
        for data in ({}, {'check': 'headset', 'status': 'passed', 'expected': 'Works', 'actual': ''}):
            self.assertEqual(self.client.post(url, data=json.dumps(data), content_type='application/json').status_code, 400)
        response = self.client.post(url, data=json.dumps({'check': 'headset', 'status': 'failed', 'expected': 'Headset connects', 'actual': 'Pairing timed out'}), content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['manual']['headset']['actual'], 'Pairing timed out')
        response = self.client.post(url, data=json.dumps({'check': 'headset', 'status': 'passed', 'expected': 'Headset connects', 'actual': 'Connected after correction'}), content_type='application/json')
        self.assertEqual(response.json()['manual']['headset']['retest'], 'corrected')
        self.assertEqual(response.json()['manual']['headset']['history'][0]['actual'], 'Pairing timed out')

    def test_validation_api_interrupted_runs_unlock_and_remain_unsuccessful(self):
        from datetime import datetime, timedelta, timezone
        self.client.force_login(self.admin.user)
        run_id = 'b' * 32
        save(self.directory / f'{run_id}.json', {'id': run_id, 'started_at': (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(), 'status': 'running', 'tests': [], 'manual': {}})
        (self.directory / 'run.lock').touch()
        response = self.client.get('/api/admin/validation/')
        self.assertEqual(response.json()['runs'][0]['status'], 'error')
        self.assertFalse((self.directory / 'run.lock').exists())
