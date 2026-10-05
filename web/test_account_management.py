import json
from django.contrib.auth.models import User
from django.test import Client, TestCase
from .models import AuditLog, Notification, Profile, SchoolClass


class AccountManagementTests(TestCase):
    def setUp(self):
        self.admin = self.profile('account-root', 'admin', 'super')
        self.school_admin = self.profile('account-school', 'admin', 'school')
        self.teacher = self.profile('account-teacher', 'teacher')
        self.student = self.profile('account-student', 'student')
        self.client.force_login(self.admin.user)
        self.url = f'/api/admin/accounts/{self.student.pk}/'

    def profile(self, name, role, scope='none'):
        return Profile.objects.create(user=User.objects.create_user(name, email=f'{name}@example.test', password='long-test-password'), display_name=name, role=role, admin_scope=scope)

    def edit(self, **values):
        return self.client.patch(self.url, json.dumps(values), content_type='application/json')

    def test_identity_edit_persists_and_notification_is_private_and_readable(self):
        response = self.edit(name='New Name', username='new-login', email='new@example.test')
        self.assertEqual(response.status_code, 200)
        self.student.refresh_from_db(); self.student.user.refresh_from_db()
        self.assertEqual(self.student.display_name, 'New Name')
        self.assertEqual(self.student.user.username, 'new-login')
        self.assertEqual(self.student.user.email, 'new@example.test')
        self.assertTrue(AuditLog.objects.filter(action='account_updated', actor=self.admin).exists())
        inbox = self.client.get('/api/notifications/').json()
        self.assertEqual(inbox['unread_count'], 1)
        item = inbox['notifications'][0]
        self.assertEqual(item['link'], '/admin/accounts')
        self.assertEqual(self.client.post('/api/notifications/', json.dumps({'notification_id': item['id']}), content_type='application/json').json()['unread_count'], 0)
        self.client.force_login(self.school_admin.user)
        self.assertEqual(self.client.get('/api/notifications/').json()['notifications'], [])

    def test_edit_rejects_privilege_changes_invalid_input_and_duplicate_identities(self):
        for values, expected in (({'role': 'admin'}, 400), ({'name': ''}, 400), ({'email': 'invalid'}, 400), ({'username': 'with spaces'}, 400), ({'username': self.teacher.user.username}, 409), ({'email': self.teacher.user.email.upper()}, 409)):
            self.assertEqual(self.edit(**values).status_code, expected, values)
        self.student.refresh_from_db()
        self.assertEqual(self.student.role, 'student')
        self.assertFalse(Notification.objects.filter(kind='account').exists())

    def test_only_super_admin_can_edit_or_delete_and_super_admins_are_protected(self):
        self.client.logout()
        self.assertEqual(self.edit(name='No').status_code, 401)
        for actor in (self.student, self.teacher, self.school_admin):
            self.client.force_login(actor.user)
            self.assertEqual(self.edit(name='No').status_code, 403)
            self.assertEqual(self.client.delete(self.url).status_code, 403)
        self.client.force_login(self.admin.user)
        self.url = f'/api/admin/accounts/{self.admin.pk}/'
        self.assertEqual(self.edit(name='No').status_code, 403)
        self.assertEqual(self.client.delete(self.url).status_code, 403)

    def test_deactivation_revokes_existing_login_and_retry_does_not_duplicate_notification(self):
        student_client = Client()
        student_client.force_login(self.student.user)
        url = self.url + 'status/'
        for _ in range(2):
            self.assertEqual(self.client.patch(url, json.dumps({'status': 'disabled'}), content_type='application/json').status_code, 200)
        self.assertEqual(student_client.get('/api/auth/me/').status_code, 401)
        self.assertEqual(Notification.objects.filter(recipient=self.admin, kind='account').count(), 1)
        self.assertEqual(self.client.patch(url, json.dumps({'status': 'active'}), content_type='application/json').status_code, 200)
        self.student.refresh_from_db(); self.student.user.refresh_from_db()
        self.assertTrue(self.student.user.is_active)

    def test_delete_removes_unlinked_user_and_retains_audit_record(self):
        identifier, user_id = self.student.pk, self.student.user_id
        self.assertEqual(self.client.delete(self.url).status_code, 200)
        self.assertFalse(Profile.objects.filter(pk=identifier).exists())
        self.assertFalse(User.objects.filter(pk=user_id).exists())
        self.assertTrue(AuditLog.objects.filter(action='account_deleted', object_id=str(identifier)).exists())
        self.assertTrue(Notification.objects.filter(recipient=self.admin, title='Account deleted').exists())

    def test_protected_records_block_deletion_without_partial_changes(self):
        school_class = SchoolClass.objects.create(name='Protected', code='ACC_PROTECT', teacher=self.teacher)
        url = f'/api/admin/accounts/{self.teacher.pk}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 409)
        self.assertTrue(Profile.objects.filter(pk=self.teacher.pk).exists())
        self.assertTrue(SchoolClass.objects.filter(pk=school_class.pk).exists())
        self.assertFalse(AuditLog.objects.filter(action='account_deleted').exists())
        self.assertFalse(Notification.objects.filter(title='Account deleted').exists())

    def test_account_mutations_require_csrf(self):
        client = Client(enforce_csrf_checks=True)
        client.force_login(self.admin.user)
        self.assertEqual(client.patch(self.url, '{}', content_type='application/json').status_code, 403)
        self.assertEqual(client.delete(self.url).status_code, 403)
