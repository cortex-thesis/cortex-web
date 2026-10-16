import json
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from .models import (AuditLog, Enrollment, LearningSession, Profile, School, SchoolClass,
                     SchoolYear, SessionAnalytics, SessionEEGSample)


class SchoolYearTests(TestCase):
    def setUp(self):
        self.school = School.objects.create(name='School')
        self.other = School.objects.create(name='Other')
        def profile(name, role, school, scope='none'):
            return Profile.objects.create(user=get_user_model().objects.create_user(name),
                display_name=name, role=role, school=school, admin_scope=scope)
        self.admin = profile('admin-year', 'admin', self.school, 'school')
        self.teacher = profile('teacher-year', 'teacher', self.school)
        self.student = profile('student-year', 'student', self.school)
        self.other_admin = profile('other-admin-year', 'admin', self.other, 'school')
        self.old = SchoolClass.objects.create(name='Old', code='OLDYEAR', teacher=self.teacher, school=self.school, school_year='2026-2027')
        self.new = SchoolClass.objects.create(name='New', code='NEWYEAR', teacher=self.teacher, school=self.school, school_year='2027–2028')
        self.unassigned = SchoolClass.objects.create(name='Legacy', code='LEGACYYEAR', teacher=self.teacher, school=self.school)
        self.enrollment = Enrollment.objects.create(student=self.student, school_class=self.old, enrolled_by=self.teacher, removed_at=timezone.now())
        self.session = LearningSession.objects.create(student=self.student, school_class=self.old, ended_at=timezone.now())
        SessionAnalytics.objects.create(session=self.session, focused_percentage=75, relaxed_percentage=25)
        SessionEEGSample.objects.create(session=self.session, state='focused', accepted_channels=4)
        SchoolYear.objects.create(school=self.school, name='2027–2028', is_active=True)
        self.client.force_login(self.teacher.user)

    def action(self, name, action, confirmed=True):
        return self.client.post('/api/admin/school-years/', json.dumps(dict(name=name, action=action, confirmed=confirmed)), content_type='application/json')

    def test_reports_scope_year_classes_sessions_and_historical_learners(self):
        for endpoint in ['reports/', 'reports/advanced/']:
            url = '/api/teacher/' + endpoint
            default = self.client.get(url, {'range': 'term'}).json()
            self.assertEqual(default['selected_class_id'], self.new.pk)
            self.assertEqual(default['selected_school_year'], '2027–2028')
            old = self.client.get(url, {'school_year': '2026–2027', 'range': 'term'}).json()
            self.assertEqual([item['id'] for item in old['classes']], [self.old.pk])
            self.assertEqual(old['selected_class_id'], self.old.pk)
            self.assertEqual(self.client.get(url, {'school_year': '2027–2028', 'class_id': self.old.pk}).status_code, 404)
            if endpoint == 'reports/':
                self.assertEqual(old['summary']['sessions'], 1)
                self.assertEqual(old['state_distribution']['focused'], 75)
                self.assertEqual([item['id'] for item in old['students']], [self.student.pk])
            else:
                self.assertEqual(old['overall']['session_count'], 1)
                self.assertEqual(old['students'][0]['student']['id'], self.student.pk)

    def test_archive_restore_preserve_history_and_hide_management(self):
        self.client.force_login(self.admin.user)
        self.assertEqual(self.action('2026–2027', 'archive').status_code, 200)
        self.old.refresh_from_db()
        self.assertEqual(self.old.school_year, '2026-2027')
        self.assertEqual(self.old.status, 'active')
        self.assertTrue(LearningSession.objects.filter(pk=self.session.pk).exists())
        self.assertTrue(Enrollment.objects.filter(pk=self.enrollment.pk).exists())
        self.assertEqual(SessionAnalytics.objects.count(), 1)
        self.assertEqual(SessionEEGSample.objects.count(), 1)
        self.assertNotIn(self.old.pk, [item['id'] for item in self.client.get('/api/admin/dashboard/').json()['classes']])
        self.client.force_login(self.teacher.user)
        self.assertNotIn(self.old.pk, [item['id'] for item in self.client.get('/api/classes/').json()['classes']])
        for url in ['/api/teacher/reports/', '/api/teacher/reports/advanced/']:
            report = self.client.get(url, {'school_year': '2026–2027', 'range': 'term'}).json()
            self.assertEqual(report['selected_class_id'], self.old.pk)
            self.assertTrue(next(year for year in report['school_years'] if year['value'] == '2026–2027')['is_archived'])
            all_years = self.client.get(url, {'school_year': 'all'}).json()
            self.assertNotIn(self.old.pk, [item['id'] for item in all_years['classes']])
        self.client.force_login(self.admin.user)
        self.assertEqual(self.action('2026–2027', 'restore').status_code, 200)
        self.assertIn(self.old.pk, [item['id'] for item in self.client.get('/api/classes/').json()['classes']])
        self.assertEqual(AuditLog.objects.filter(object_type='SchoolYear').count(), 2)

    def test_active_confirmation_permissions_and_school_isolation(self):
        self.assertEqual(self.action('2026–2027', 'archive').status_code, 403)
        self.client.force_login(self.student.user)
        self.assertEqual(self.action('2026–2027', 'restore').status_code, 403)
        self.client.force_login(self.admin.user)
        self.assertEqual(self.action('2027–2028', 'archive').status_code, 400)
        self.assertEqual(self.action('2026–2027', 'archive', False).status_code, 400)
        self.assertEqual(self.action('2026–2029', 'activate').status_code, 400)
        self.assertEqual(self.action('2026–2027', 'activate').status_code, 200)
        self.assertEqual(SchoolYear.objects.filter(school=self.school, is_active=True).get().name, '2026–2027')
        self.assertEqual(self.action('2027–2028', 'archive').status_code, 200)
        self.assertEqual(self.action('2027–2028', 'activate').status_code, 400)
        self.client.force_login(self.other_admin.user)
        self.assertEqual(self.action('2026–2027', 'archive').status_code, 200)
        self.assertFalse(SchoolYear.objects.get(school=self.school, name='2026–2027').is_archived)
        self.assertTrue(SchoolYear.objects.get(school=self.other, name='2026–2027').is_archived)

    def test_empty_unassigned_invalid_and_cross_school_records(self):
        empty = SchoolYear.objects.create(school=self.school, name='2030–2031')
        foreign = SchoolClass.objects.create(name='Foreign', code='FOREIGNYEAR', school=self.other, teacher=self.teacher, school_year=self.new.school_year)
        for url in ['/api/teacher/reports/', '/api/teacher/reports/advanced/']:
            data = self.client.get(url, {'school_year': empty.name}).json()
            self.assertEqual(data['classes'], [])
            self.assertIsNone(data['selected_class_id'])
            self.assertEqual(self.client.get(url, {'school_year': '__unassigned__'}).json()['selected_class_id'], self.unassigned.pk)
            self.assertEqual(self.client.get(url, {'school_year': 'invalid'}).status_code, 400)
            self.assertEqual(self.client.get(url, {'class_id': foreign.pk}).status_code, 404)

    def test_no_configured_active_year_keeps_legacy_default(self):
        SchoolYear.objects.all().delete()
        data = self.client.get('/api/teacher/reports/').json()
        self.assertEqual(data['selected_school_year'], 'all')
        self.assertEqual(len(data['classes']), 3)

    def test_offline_allocation_errors_are_actionable_and_do_not_change_years(self):
        from unittest.mock import patch
        self.client.force_login(self.admin.user)
        with patch('web.school_years.SchoolYear.objects.get_or_create', side_effect=RuntimeError('Initialize offline sync before creating records.')):
            response = self.action('2026–2027', 'archive')
        self.assertEqual(response.status_code, 503)
        self.assertIn('synchronize', response.json()['detail'])
        self.assertFalse(SchoolYear.objects.filter(school=self.school, name='2026–2027').exists())
        self.assertEqual(self.client.post('/api/admin/school-years/', '[]', content_type='application/json').status_code, 400)
