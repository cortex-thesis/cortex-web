import json
from unittest.mock import patch
from django.contrib.auth.models import User
from django.test import TestCase, Client
from django.utils import timezone
from .models import School, Profile, SchoolClass, Enrollment, LearningSession, SessionAnalytics, Notification

class SchoolAdministratorWorkflowTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.a = School.objects.create(name='School A')
        cls.b = School.objects.create(name='School B')
        def account(username, role, school, scope='none'):
            return Profile.objects.create(user=User.objects.create_user(username, email=f'{username}@example.test', password='a-long-account-password!'), display_name=username, role=role, school=school, admin_scope=scope)
        cls.admin = account('school-admin-a', 'admin', cls.a, 'school')
        cls.other_admin = account('school-admin-b', 'admin', cls.b, 'school')
        cls.unscoped = account('unscoped-admin', 'admin', None, 'school')
        cls.root = account('root-admin', 'admin', None, 'super')
        cls.teacher = account('teacher-a', 'teacher', cls.a)
        cls.other_teacher = account('teacher-b', 'teacher', cls.b)
        cls.student = account('student-a', 'student', cls.a)
        cls.other_student = account('student-b', 'student', cls.b)
        cls.school_class = SchoolClass.objects.create(name='Class A', code='BATCH4A', school=cls.a, teacher=cls.teacher)
        cls.other_class = SchoolClass.objects.create(name='Class B', code='BATCH4B', school=cls.b, teacher=cls.other_teacher)
        Enrollment.objects.create(student=cls.student, school_class=cls.school_class, enrolled_by=cls.teacher)
        Enrollment.objects.create(student=cls.other_student, school_class=cls.other_class, enrolled_by=cls.other_teacher)
        cls.session = LearningSession.objects.create(student=cls.student, school_class=cls.school_class, ended_at=timezone.now(), status='completed', completion_percentage=100)
        SessionAnalytics.objects.create(session=cls.session, focused_percentage=60, relaxed_percentage=40, focused_seconds=36)
        LearningSession.objects.create(student=cls.other_student, school_class=cls.other_class, ended_at=timezone.now(), status='completed')

    def setUp(self):
        self.client.force_login(self.admin.user)

    def url(self, teacher=None, advanced=False):
        return f'/api/school-admin/teachers/{(teacher or self.teacher).pk}/reports/' + ('advanced/' if advanced else '')

    def register_teacher(self, username='new-teacher', school=None):
        return Client().post('/api/auth/register/', json.dumps(dict(username=username, email=f'{username}@example.test', first_name='New', last_name='Teacher', password='registration-password-123!', confirm_password='registration-password-123!', role='teacher', school_id=str((school or self.a).pk))), content_type='application/json')

    def test_new_registration_appears_pending_in_correct_school_and_can_be_approved(self):
        initial = self.client.get('/api/admin/accounts/')
        self.assertEqual(initial.status_code, 200)
        self.assertEqual(initial['Cache-Control'], 'private, no-store')
        self.assertEqual(self.register_teacher().status_code, 201)
        teacher = Profile.objects.get(user__username='new-teacher')
        self.assertEqual(teacher.school_id, self.a.pk)
        self.assertEqual(teacher.account_status, 'pending')
        accounts = self.client.get('/api/admin/accounts/').json()['accounts']
        self.assertIn(teacher.pk, [item['id'] for item in accounts])
        self.assertEqual(self.client.get('/api/admin/dashboard/').json()['pending_teachers'], 1)
        self.assertTrue(Notification.objects.filter(recipient=self.admin, link='/school-admin/teachers').exists())
        self.client.force_login(self.other_admin.user)
        self.assertNotIn(teacher.pk, [item['id'] for item in self.client.get('/api/admin/accounts/').json()['accounts']])
        status_url = f'/api/admin/accounts/{teacher.pk}/status/'
        self.assertEqual(self.client.patch(status_url, json.dumps({'status': 'active'}), content_type='application/json').status_code, 403)
        self.client.force_login(self.admin.user)
        teacher_client = Client()
        with patch('web.views._ensure_demo_accounts'):
            self.assertEqual(teacher_client.post('/api/auth/login/', json.dumps({'username': 'new-teacher', 'password': 'registration-password-123!'}), content_type='application/json').status_code, 403)
            self.assertEqual(self.client.patch(status_url, json.dumps({'status': 'active'}), content_type='application/json').status_code, 200)
            self.assertEqual(teacher_client.post('/api/auth/login/', json.dumps({'username': 'new-teacher', 'password': 'registration-password-123!'}), content_type='application/json').status_code, 200)
        teacher.refresh_from_db()
        self.assertEqual(teacher.approved_by_id, self.admin.pk)
        self.assertEqual(Profile.objects.filter(user__username='new-teacher').count(), 1)
        self.assertEqual(teacher_client.get('/api/teacher/reports/').status_code, 200)

    def test_rejection_preserves_account_and_blocks_login(self):
        self.assertEqual(self.register_teacher().status_code, 201)
        teacher = Profile.objects.get(user__username='new-teacher')
        self.assertEqual(self.client.patch(f'/api/admin/accounts/{teacher.pk}/status/', json.dumps({'status': 'disabled'}), content_type='application/json').status_code, 200)
        teacher.refresh_from_db(); teacher.user.refresh_from_db()
        self.assertEqual(teacher.account_status, 'disabled')
        self.assertFalse(teacher.user.is_active)
        with patch('web.views._ensure_demo_accounts'):
            self.assertIn(Client().post('/api/auth/login/', json.dumps({'username': 'new-teacher', 'password': 'registration-password-123!'}), content_type='application/json').status_code, (401, 403))
        self.assertTrue(Profile.objects.filter(pk=teacher.pk).exists())

    def test_missing_school_admin_scope_cannot_list_or_read_reports(self):
        for actor in (self.unscoped,):
            self.client.force_login(actor.user)
            self.assertEqual(self.client.get('/api/admin/accounts/').status_code, 403)
            self.assertEqual(self.client.post('/api/admin/accounts/', '{}', content_type='application/json').status_code, 403)
            self.assertEqual(self.client.get(self.url()).status_code, 403)
        self.client.force_login(self.root.user)
        self.assertEqual(self.client.get(self.url()).status_code, 403)

    def test_school_admin_reads_same_results_as_teacher_without_changing_metrics(self):
        for advanced in (False, True):
            teacher_url = '/api/teacher/reports/' + ('advanced/' if advanced else '')
            self.client.force_login(self.teacher.user)
            own = self.client.get(teacher_url, {'range': 'term', 'school_year': 'all'})
            self.assertEqual(own.status_code, 200)
            self.client.force_login(self.admin.user)
            response = self.client.get(self.url(advanced=advanced), {'range': 'term', 'school_year': 'all'})
            self.assertEqual(response.status_code, 200)
            actual, expected = response.json(), own.json()
            actual.pop('generated_at', None); expected.pop('generated_at', None)
            self.assertEqual(actual, expected)
            self.assertEqual([item['id'] for item in actual['classes']], [self.school_class.pk])
            self.assertNotIn('student-b', response.content.decode())
        self.assertEqual(LearningSession.objects.count(), 2)
        self.assertEqual(float(SessionAnalytics.objects.get(session=self.session).focused_percentage), 60)

    def test_foreign_teachers_classes_students_and_non_admins_are_blocked(self):
        for advanced in (False, True):
            self.assertEqual(self.client.get(self.url(self.other_teacher, advanced)).status_code, 404)
            self.assertEqual(self.client.get(self.url(advanced=advanced), {'class_id': self.other_class.pk}).status_code, 404)
            for actor in (self.teacher, self.student):
                self.client.force_login(actor.user)
                self.assertEqual(self.client.get(self.url(advanced=advanced)).status_code, 403)
            self.client.force_login(self.admin.user)
        self.assertEqual(self.client.get(self.url(), {'student_id': self.other_student.pk}).status_code, 404)
        self.client.logout()
        self.assertEqual(self.client.get(self.url()).status_code, 401)

    def test_report_routes_reject_all_mutations_and_preserve_teacher_permissions(self):
        for advanced in (False, True):
            for method in ('post', 'patch', 'put', 'delete'):
                self.assertEqual(getattr(self.client, method)(self.url(advanced=advanced), '{}', content_type='application/json').status_code, 405)
        self.assertEqual(self.client.post('/api/teacher/reports/', '{}', content_type='application/json').status_code, 403)
        self.client.force_login(self.teacher.user)
        self.assertEqual(self.client.post('/api/teacher/reports/', '{}', content_type='application/json').status_code, 405)
        self.assertEqual(self.client.get('/api/teacher/reports/', {'class_id': self.other_class.pk}).status_code, 404)
