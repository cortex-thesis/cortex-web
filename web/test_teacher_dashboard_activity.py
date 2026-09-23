from datetime import datetime, timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from .models import Enrollment, LearningSession, Profile, SchoolClass, StudentBadge, SessionEEGSample


class TeacherDashboardActivityTests(TestCase):
    def setUp(self):
        self.teacher = self.profile('dashboard-teacher', 'teacher')
        self.other = self.profile('dashboard-other', 'teacher')
        self.student = self.profile('dashboard-student', 'student')
        self.first = SchoolClass.objects.create(name='First', code='RECENT-A', teacher=self.teacher)
        self.second = SchoolClass.objects.create(name='Second', code='RECENT-B', teacher=self.teacher)
        self.empty = SchoolClass.objects.create(name='Empty', code='RECENT-C', teacher=self.teacher)
        self.foreign = SchoolClass.objects.create(name='Foreign', code='RECENT-D', teacher=self.other)
        for school_class in [self.first, self.second]:
            Enrollment.objects.create(school_class=school_class, student=self.student, enrolled_by=self.teacher)
        self.client.force_login(self.teacher.user)

    def profile(self, name, role):
        return Profile.objects.create(user=User.objects.create_user(name), display_name=name, role=role)

    def session(self, school_class, days):
        item = LearningSession.objects.create(student=self.student, school_class=school_class,
                                              ended_at=timezone.now(), status='completed')
        LearningSession.objects.filter(pk=item.pk).update(started_at=timezone.now() - timedelta(days=days))
        return item

    def test_activity_spans_classes_and_ignores_reporting_filters(self):
        older = self.session(self.first, 60)
        newest = self.session(self.second, 1)
        self.session(self.foreign, 0)
        data = self.client.get('/api/teacher/dashboard/', {'month': '2000-01', 'class_id': self.first.pk}).json()
        self.assertEqual([item['id'] for item in data['recent_sessions']], [str(newest.pk), str(older.pk)])
        self.assertEqual([item['id'] for item in data['classes']], [self.second.pk, self.first.pk, self.empty.pk])
        self.assertIsNone(data['classes'][-1]['latest_session_at'])
        self.assertEqual(data['recent_sessions'][0]['class_name'], 'Second')
        self.assertEqual(data['total_sessions'], 0)

    def test_badges_are_sorted_unique_and_limited_to_current_roster(self):
        now = timezone.now()
        older = StudentBadge.objects.create(student=self.student, key='lessons-1', unlocked_at=now - timedelta(days=2))
        newest = StudentBadge.objects.create(student=self.student, key='care', unlocked_at=now)
        outsider = self.profile('dashboard-outsider', 'student')
        Enrollment.objects.create(school_class=self.foreign, student=outsider, enrolled_by=self.other)
        StudentBadge.objects.create(student=outsider, key='care', unlocked_at=now)
        removed = self.profile('dashboard-removed', 'student')
        Enrollment.objects.create(school_class=self.first, student=removed, enrolled_by=self.teacher, removed_at=now)
        StudentBadge.objects.create(student=removed, key='care', unlocked_at=now)
        data = self.client.get('/api/teacher/dashboard/').json()
        self.assertEqual([item['id'] for item in data['recent_badges']], [newest.pk, older.pk])
        self.assertEqual({item['id'] for item in data['recent_badges'][0]['classes']}, {self.first.pk, self.second.pk})

    def test_recent_sessions_are_bounded_and_archived_classes_excluded(self):
        for days in range(12):
            self.session(self.first, days)
        self.second.status = SchoolClass.Status.ARCHIVED
        self.second.save()
        excluded = self.session(self.second, -1)
        data = self.client.get('/api/teacher/dashboard/').json()
        self.assertEqual(len(data['recent_sessions']), 10)
        self.assertNotIn(str(excluded.pk), [item['id'] for item in data['recent_sessions']])
        times = [item['started_at'] for item in data['recent_sessions']]
        self.assertEqual(times, sorted(times, reverse=True))

    def test_empty_dashboard_and_role_access(self):
        self.client.force_login(self.other.user)
        data = self.client.get('/api/teacher/dashboard/').json()
        self.assertEqual(data['recent_sessions'], [])
        self.assertEqual(data['recent_badges'], [])
        self.client.force_login(self.student.user)
        self.assertEqual(self.client.get('/api/teacher/dashboard/').status_code, 403)

    def test_comparison_uses_same_class_and_valid_samples(self):
        for school_class, date, state, channels in [
            (self.first, '2024-02-01', 'focused', 4),
            (self.first, '2024-01-31', 'distracted', 4),
            (self.first, '2024-01-15', 'focused', 0),
            (self.second, '2024-01-15', 'focused', 4),
            (self.foreign, '2024-01-15', 'focused', 4),
        ]:
            item = self.session(school_class, 0)
            LearningSession.objects.filter(pk=item.pk).update(started_at=timezone.make_aware(datetime.fromisoformat(date)))
            SessionEEGSample.objects.create(session=item, state=state, accepted_channels=channels)
        data = self.client.get('/api/teacher/dashboard/', {'month': '2024-02', 'class_id': self.first.pk}).json()
        self.assertEqual(data['average_focus'], 100)
        self.assertEqual(data['total_sessions'], 1)
        self.assertEqual(data['comparison']['average_focus'], 0)
        self.assertEqual(data['comparison']['total_sessions'], 2)
        self.assertEqual(data['comparison']['sample_count'], 1)
        self.assertFalse(data['reporting']['is_partial'])

    def test_period_boundaries_and_empty_comparison(self):
        for filters, start, end, previous in [
            ({'period': 'week', 'date': '2025-01-01'}, '2024-12-30', '2025-01-06', '2024-12-23'),
            ({'period': 'month', 'month': '2024-03'}, '2024-03-01', '2024-04-01', '2024-02-01'),
            ({'period': 'year', 'year': '2024'}, '2024-01-01', '2025-01-01', '2023-01-01'),
        ]:
            with self.subTest(filters=filters):
                data = self.client.get('/api/teacher/dashboard/', filters).json()
                self.assertTrue(data['reporting']['start'].startswith(start))
                self.assertTrue(data['reporting']['end_exclusive'].startswith(end))
                self.assertTrue(data['comparison']['start'].startswith(previous))
                self.assertIsNone(data['comparison']['average_focus'])
                self.assertEqual(data['comparison']['total_sessions'], 0)
        self.assertIsNone(self.client.get('/api/teacher/dashboard/', {'period': 'all'}).json()['comparison'])
        self.assertTrue(self.client.get('/api/teacher/dashboard/').json()['reporting']['is_partial'])
        for filters in [{'period': 'bad'}, {'period': 'week', 'date': 'bad'}, {'period': 'year', 'year': '9999'}]:
            self.assertEqual(self.client.get('/api/teacher/dashboard/', filters).status_code, 400)
