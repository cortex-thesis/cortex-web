import json
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase, SimpleTestCase
from django.utils import timezone

from .models import Enrollment, LearningSession, Notification, Profile, SchoolClass, SessionEEGSample, StudentBadge
from .statistics import percentages


class PercentageTests(SimpleTestCase):
    def test_rounding_preserves_total_and_empty_data(self):
        self.assertEqual(percentages({'a': 1, 'b': 1, 'c': 1}), {'a': 33.4, 'b': 33.3, 'c': 33.3})
        self.assertEqual(percentages({'a': 0, 'b': 0}), {'a': 0, 'b': 0})
        for counts in ({'a': 17, 'b': 19, 'c': 29, 'd': 31}, {'a': 0, 'b': 1}):
            self.assertEqual(sum(Decimal(str(x)) for x in percentages(counts).values()), 100)


class NotificationsAndControlsTests(TestCase):
    def setUp(self):
        self.teacher = self.profile('teacher', 'teacher')
        self.other = self.profile('other', 'teacher')
        self.student = self.profile('student', 'student')
        self.school_class = SchoolClass.objects.create(name='Test class', code='CONTROLS', teacher=self.teacher)
        Enrollment.objects.create(school_class=self.school_class, student=self.student, enrolled_by=self.teacher)
        self.session = LearningSession.objects.create(school_class=self.school_class, student=self.student, control_mode='free')
        self.url = f'/api/sessions/{self.session.pk}/control/'

    def profile(self, name, role, **kwargs):
        return Profile.objects.create(user=User.objects.create_user(name), display_name=name, role=role, **kwargs)

    def post(self, url, payload):
        return self.client.post(url, json.dumps(payload), content_type='application/json')

    def test_notifications_persist_and_are_private_for_every_role(self):
        admins = [self.profile('school-admin', 'admin', admin_scope='school'), self.profile('super-admin', 'admin', admin_scope='super')]
        for profile in [self.student, self.teacher, *admins]:
            own = Notification.objects.create(recipient=profile, title='Own', body='Message')
            other = Notification.objects.create(recipient=self.other, title='Private', body='Do not expose')
            self.client.force_login(profile.user)
            data = self.client.get('/api/notifications/').json()
            self.assertEqual(data['unread_count'], 1)
            self.assertEqual(data['notifications'][0]['id'], str(own.pk))
            self.assertEqual(self.post('/api/notifications/', {'notification_id': str(other.pk)}).status_code, 404)
            self.assertEqual(self.post('/api/notifications/', {'notification_id': 'bad'}).status_code, 400)
            self.assertEqual(self.post('/api/notifications/', {'all': True}).status_code, 200)
            self.assertEqual(self.client.get('/api/notifications/').json()['unread_count'], 0)
            other.refresh_from_db()
            self.assertIsNone(other.read_at)

    def test_real_achievement_creates_one_notification(self):
        badge, _ = StudentBadge.objects.get_or_create(student=self.student, key='first', defaults={'unlocked_at': timezone.now()})
        badge.save()
        self.assertEqual(self.student.notifications.filter(kind='achievement').count(), 1)

    def test_shared_journal_reaches_teacher_inbox_and_can_be_marked_read(self):
        self.session.ended_at = timezone.now()
        self.session.save(update_fields=['ended_at'])
        self.client.force_login(self.student.user)
        response = self.post('/api/student/journals/', {
            'session_id': str(self.session.pk), 'prompt': 'What did you learn?',
            'response_type': 'text', 'text_response': 'I practised a rhythm.',
            'mood': 'proud', 'shared_with_teacher': True,
        })
        self.assertEqual(response.status_code, 201)
        self.client.force_login(self.teacher.user)
        inbox = self.client.get('/api/notifications/').json()
        notification = next(item for item in inbox['notifications'] if item['kind'] == 'journal')
        self.assertFalse(notification['read'])
        self.assertTrue(notification['link'].startswith('/teacher/journals'))
        self.assertEqual(self.post('/api/notifications/', {'notification_id': notification['id']}).status_code, 200)
        self.assertEqual(self.client.get('/api/notifications/').json()['unread_count'], 0)
        self.assertFalse(self.other.notifications.filter(kind='journal').exists())

    def test_override_lifecycle_and_permissions(self):
        self.client.force_login(self.teacher.user)
        self.assertEqual(self.post(self.url, {'action': 'claim'}).status_code, 409)
        self.client.force_login(self.student.user)
        self.assertEqual(self.post(self.url, {'action': 'claim'}).status_code, 403)
        self.assertEqual(self.post(self.url, {'action': 'heartbeat'}).status_code, 200)
        self.client.force_login(self.other.user)
        self.assertEqual(self.post(self.url, {'action': 'claim'}).status_code, 403)
        self.client.force_login(self.teacher.user)
        self.assertEqual(self.post(self.url, {'action': 'claim'}).json()['control_mode'], 'teacher')
        self.assertEqual(self.post(self.url, {'action': 'claim'}).status_code, 200)
        self.assertEqual(self.session.manual_overrides.filter(is_active=True).count(), 1)
        self.assertEqual(self.post(self.url, {'action': 'set_mode', 'mode': 'breathing'}).json()['presentation_mode'], 'breathing')
        self.assertEqual(self.post(self.url, {'action': 'pause'}).json()['status'], 'paused')
        self.client.force_login(self.student.user)
        data = self.post(self.url, {'action': 'heartbeat'}).json()
        self.assertEqual(data['presentation_mode'], 'breathing')
        self.assertEqual(data['status'], 'paused')
        self.post(f'/api/sessions/{self.session.pk}/mode/', {'mode': 'focus'})
        self.session.refresh_from_db()
        self.assertEqual(self.session.active_presentation_mode, 'breathing')
        self.client.force_login(self.teacher.user)
        self.assertEqual(self.post(self.url, {'action': 'resume'}).json()['status'], 'active')
        self.assertEqual(self.post(self.url, {'action': 'release'}).json()['control_mode'], 'free')
        self.assertFalse(self.session.manual_overrides.filter(is_active=True).exists())
        LearningSession.objects.filter(pk=self.session.pk).update(last_seen_at=timezone.now() - timedelta(seconds=20))
        self.assertEqual(self.post(self.url, {'action': 'claim'}).status_code, 409)

    def test_dashboard_month_weighting_and_no_fabricated_data(self):
        self.client.force_login(self.teacher.user)
        empty = self.client.get('/api/teacher/dashboard/').json()
        self.assertEqual(sum(empty['state_distribution'].values()), 0)
        self.assertIsNone(empty['average_focus'])
        self.session.ended_at = timezone.now()
        self.session.save()
        for state in ['focused', 'relaxed', 'distracted']:
            SessionEEGSample.objects.create(session=self.session, state=state, accepted_channels=4)
        SessionEEGSample.objects.create(session=self.session, state='overstimulated', accepted_channels=0)
        old = LearningSession.objects.create(student=self.student, school_class=self.school_class, ended_at=timezone.now())
        LearningSession.objects.filter(pk=old.pk).update(started_at=timezone.now() - timedelta(days=70))
        SessionEEGSample.objects.create(session=old, state='overstimulated', accepted_channels=4)
        data = self.client.get('/api/teacher/dashboard/').json()
        self.assertEqual(data['total_sessions'], 1)
        self.assertEqual(data['reporting']['sample_count'], 3)
        self.assertEqual(data['state_distribution']['overstimulated'], 0)
        self.assertEqual(sum(Decimal(str(x)) for x in data['state_distribution'].values()), 100)
        all_time = self.client.get('/api/teacher/dashboard/?month=all').json()
        self.assertEqual(all_time['state_distribution']['overstimulated'], 25)
        self.assertEqual(self.client.get('/api/teacher/dashboard/?month=invalid').status_code, 400)
        self.assertEqual(self.client.get('/api/teacher/dashboard/?class_id=99999').status_code, 400)
