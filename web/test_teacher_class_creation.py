import json
from django.contrib.auth import get_user_model
from django.test import TestCase
from .models import Profile, School, SchoolClass, SchoolYear


class TeacherClassCreationTests(TestCase):
    def setUp(self):
        self.school = School.objects.create(name='Teacher school')
        self.other = School.objects.create(name='Other school')
        self.teacher = Profile.objects.create(user=get_user_model().objects.create_user('batch5-teacher'), role='teacher', school=self.school)
        self.year = SchoolYear.objects.create(school=self.school, name='2031\u20132032', is_active=True)
        SchoolYear.objects.create(school=self.other, name='2040\u20132041', is_active=True)
        self.old = SchoolClass.objects.create(name='History', code='HISTORY', school=self.school, teacher=self.teacher, school_year='2020-2021')
        self.client.force_login(self.teacher.user)

    def create(self, **extra):
        return self.client.post('/api/classes/', json.dumps({'name': ' New class ', **extra}), content_type='application/json')

    def test_admin_configuration_drives_preview_and_persistence_ignoring_forgery(self):
        self.client.logout()
        admin = Profile.objects.create(user=get_user_model().objects.create_user('batch5-admin'), role='admin', school=self.school, admin_scope='school')
        self.client.force_login(admin.user)
        self.assertEqual(self.client.post('/api/admin/school-years/', json.dumps({'name': '2032-2033', 'action': 'activate', 'confirmed': True}), content_type='application/json').status_code, 200)
        self.client.force_login(self.teacher.user)
        preview = self.client.get('/api/teacher/class-year/')
        self.assertEqual(preview.json()['school_year'], '2032\u20132033')
        self.assertIn('no-store', preview['Cache-Control'])
        response = self.create(school_year='2040-2041', school_id=str(self.other.pk), teacher_id=999, description=' Notes ')
        self.assertEqual(response.status_code, 201)
        item = SchoolClass.objects.get(pk=response.json()['id'])
        self.assertEqual((item.school_id, item.teacher_id, item.school_year, item.name, item.description), (self.school.pk, self.teacher.pk, '2032\u20132033', 'New class', 'Notes'))
        self.old.refresh_from_db()
        self.assertEqual(self.old.school_year, '2020-2021')

    def test_current_value_is_resolved_again_when_form_is_stale(self):
        self.assertEqual(self.client.get('/api/teacher/class-year/').status_code, 200)
        self.year.name = '2033\u20132034'
        self.year.save()
        self.assertEqual(self.create(school_year='2031-2032').json()['school_year'], self.year.name)

    def test_missing_configuration_has_actionable_error_and_no_class(self):
        self.year.is_active = False
        self.year.save()
        for response in (self.client.get('/api/teacher/class-year/'), self.create(school_year='2040-2041')):
            self.assertEqual(response.status_code, 400)
            self.assertIn('School Admin', response.json()['detail'])
        self.assertEqual(SchoolClass.objects.count(), 1)

    def test_invalid_configuration_is_rejected(self):
        for name in ['garbage', '2031-2035', '']:
            self.year.name = name
            self.year.save()
            self.assertEqual(self.client.get('/api/teacher/class-year/').status_code, 400)
            self.assertEqual(self.create().status_code, 400)
        self.assertEqual(SchoolClass.objects.count(), 1)

    def test_missing_or_inactive_school_is_rejected(self):
        self.school.is_active = False
        self.school.save()
        self.assertEqual(self.create().status_code, 400)
        self.teacher.school = None
        self.teacher.save()
        self.assertEqual(self.create(school_id=str(self.other.pk)).status_code, 400)
        self.assertEqual(self.client.get('/api/teacher/class-year/').status_code, 400)

    def test_role_auth_and_existing_name_code_validation(self):
        self.assertEqual(self.create(name='   ').status_code, 400)
        self.assertEqual(self.create(code='HISTORY').status_code, 409)
        for role in ['student', 'admin']:
            account = Profile.objects.create(user=get_user_model().objects.create_user('batch5-' + role), role=role, school=self.school)
            self.client.force_login(account.user)
            self.assertEqual(self.create().status_code, 403)
            self.assertEqual(self.client.get('/api/teacher/class-year/').status_code, 403)
        self.client.logout()
        self.assertEqual(self.create().status_code, 401)
        self.assertEqual(self.client.get('/api/teacher/class-year/').status_code, 401)
