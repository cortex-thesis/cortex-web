from datetime import timedelta

from django.contrib.auth.models import User
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.utils import timezone

from .models import (
    Activity, ActivityResponse, AdaptationEvent, CurriculumPackage, Enrollment, JournalEntry,
    LearningSession, Lesson, Profile, SchoolClass, SessionAnalytics, Slide,
)
from .views import _teacher_dashboard_data


class StudentProfileTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.teacher = Profile.objects.create(user=User.objects.create_user('report-teacher'), display_name='Teacher', role=Profile.Role.TEACHER)
        cls.student = Profile.objects.create(user=User.objects.create_user('report-student'), display_name='Actual Student', role=Profile.Role.STUDENT)
        cls.other_teacher = Profile.objects.create(user=User.objects.create_user('other-teacher'), display_name='Other Teacher', role=Profile.Role.TEACHER)
        cls.school_class = SchoolClass.objects.create(name='Actual Class', code='REAL', teacher=cls.teacher)
        cls.other_class = SchoolClass.objects.create(name='Private Class', code='PRIVATE', teacher=cls.other_teacher)
        Enrollment.objects.create(student=cls.student, school_class=cls.school_class, enrolled_by=cls.teacher)
        Enrollment.objects.create(student=cls.student, school_class=cls.other_class, enrolled_by=cls.other_teacher)

    def setUp(self):
        self.client.force_login(self.teacher.user)
        self.url = f'/api/teacher/students/{self.student.pk}/?class_id={self.school_class.pk}'

    def session(self, school_class=None, lesson=None):
        end = timezone.now()
        session = LearningSession.objects.create(student=self.student, school_class=school_class or self.school_class, lesson=lesson, ended_at=end)
        LearningSession.objects.filter(pk=session.pk).update(started_at=end - timedelta(minutes=20))
        return session

    def test_real_values_and_class_scope(self):
        package = CurriculumPackage.objects.first()
        lesson = Lesson.objects.create(package=package, title='Actual Lesson', status=Lesson.Status.APPROVED, created_by=self.teacher)
        activity = Activity.objects.create(type=Activity.ActivityType.INTERACTIVE, title='Question')
        Slide.objects.create(lesson=lesson, activity=activity, position=1, title='Question')
        session = self.session(lesson=lesson)
        # Repeated attempts must not inflate the answered activity count.
        ActivityResponse.objects.create(session=session, activity=activity, attempt_number=1)
        ActivityResponse.objects.create(session=session, activity=activity, attempt_number=2)
        SessionAnalytics.objects.create(session=session, focused_percentage=75, relaxed_percentage=25, adaptation_count=3, manual_override_count=1)
        for previous, new in [('focus', 'relax'), ('relax', 'focus'), ('focus', 'focus'), ('focus', 'relax')]:
            AdaptationEvent.objects.create(session=session, source='automatic', previous_mode=previous,
                new_mode=new, action_type='set_mode', triggered_at=timezone.now())
        self.session(self.other_class)
        JournalEntry.objects.create(session=session, student=self.student, shared_with_teacher=True)
        JournalEntry.objects.create(session=session, student=self.student, shared_with_teacher=False)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['name'], 'Actual Student')
        self.assertEqual(data['session_count'], 1)
        self.assertEqual(data['journal_count'], 1)
        self.assertEqual(data['average_focus'], 75)
        self.assertEqual(data['average_duration_seconds'], 1200)
        self.assertEqual(data['tasks_completed'], 1)
        self.assertEqual(data['tasks_total'], 1)
        self.assertEqual(data['sessions'][0]['activity'], 'Actual Lesson')
        self.assertEqual(data['sessions'][0]['dominant'], 'focused')
        self.assertEqual(data['sessions'][0]['mode_changes'], 2)

    def test_empty_and_missing_measurements_are_not_fabricated(self):
        data = self.client.get(self.url).json()
        self.assertEqual(data['sessions'], [])
        self.assertIsNone(data['average_focus'])
        self.session()
        data = self.client.get(self.url).json()
        self.assertIsNone(data['sessions'][0]['focus'])
        self.assertIsNone(data['sessions'][0]['dominant'])
        self.assertIsNone(data['state_distribution'])

    def test_other_class_removed_enrollment_and_roles_are_denied(self):
        self.assertEqual(self.client.get(f'/api/teacher/students/{self.student.pk}/?class_id={self.other_class.pk}').status_code, 403)
        Enrollment.objects.filter(student=self.student, school_class=self.school_class).update(removed_at=timezone.now())
        self.assertEqual(self.client.get(self.url).status_code, 403)
        self.client.force_login(self.student.user)
        self.assertEqual(self.client.get(self.url).status_code, 403)
        self.client.logout()
        self.assertEqual(self.client.get(self.url).status_code, 401)

    def test_invalid_class_and_mutation_are_rejected(self):
        self.assertEqual(self.client.get(f'/api/teacher/students/{self.student.pk}/?class_id=invalid').status_code, 400)
        self.assertEqual(self.client.post(self.url).status_code, 405)

    def test_dashboard_query_count_does_not_grow_with_class_count(self):
        with CaptureQueriesContext(connection) as first:
            initial = _teacher_dashboard_data(self.teacher)
        for index in range(8):
            SchoolClass.objects.create(name=f'Class {index}', code=f'PERF{index}', teacher=self.teacher)
        with CaptureQueriesContext(connection) as second:
            expanded = _teacher_dashboard_data(self.teacher)
        self.assertEqual(len(expanded['classes']), len(initial['classes']) + 8)
        self.assertLessEqual(len(second), len(first))

    def test_report_query_count_does_not_grow_with_session_count(self):
        self.session()
        with CaptureQueriesContext(connection) as first:
            self.assertEqual(self.client.get(self.url).status_code, 200)
        for _ in range(8):
            self.session()
        with CaptureQueriesContext(connection) as second:
            response = self.client.get(self.url)
        self.assertEqual(response.json()['session_count'], 9)
        self.assertEqual(len(second), len(first))

    def test_class_summary_omits_slides_and_preserves_access_checks(self):
        self.client.force_login(self.student.user)
        url = f'/api/classes/{self.school_class.pk}/'
        with CaptureQueriesContext(connection) as full_queries:
            full = self.client.get(url).json()
        with CaptureQueriesContext(connection) as summary_queries:
            summary = self.client.get(url + '?summary=1').json()
        self.assertEqual(summary, {key: value for key, value in full.items() if key not in {'lessons', 'activities'}})
        self.assertLess(len(summary_queries), len(full_queries))
        Enrollment.objects.filter(student=self.student, school_class=self.school_class).update(removed_at=timezone.now())
        self.assertEqual(self.client.get(url + '?summary=1').status_code, 403)
