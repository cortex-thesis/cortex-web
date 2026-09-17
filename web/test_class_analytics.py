import json
import base64
from tempfile import TemporaryDirectory
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from .models import (Activity, AdaptationEvent, Asset, CurriculumPackage, Enrollment, JournalEntry, LearningSession,
    Lesson, Profile, SchoolClass, SessionAnalytics, SessionEEGSample,
    SessionSlideExposure, Slide, StudentBadge)


class ClassAnalyticsTests(TestCase):
    def setUp(self):
        self.teacher = Profile.objects.create(user=User.objects.create_user('analytics-teacher'), role='teacher', display_name='Teacher')
        self.student = Profile.objects.create(user=User.objects.create_user('analytics-student'), role='student', display_name='Student')
        self.school_class = SchoolClass.objects.create(name='Class', code='ANALYTICS', teacher=self.teacher)
        Enrollment.objects.create(school_class=self.school_class, student=self.student, enrolled_by=self.teacher)
        self.lesson = Lesson.objects.create(package=CurriculumPackage.objects.get(slug='care'), title='Lesson', status='approved', created_by=self.teacher)
        self.slides = [Slide.objects.create(lesson=self.lesson, title=f'Step {i}', position=i,
            activity=Activity.objects.create(type='interactive', title=f'Activity {i}')) for i in range(2)]
        self.session = LearningSession.objects.create(student=self.student, school_class=self.school_class, lesson=self.lesson)
        self.url = f'/api/teacher/classes/{self.school_class.pk}/analytics/'

    def test_scoped_summary_and_slide_trend(self):
        self.session.ended_at = timezone.now()
        self.session.completion_percentage = 100
        self.session.save()
        SessionAnalytics.objects.create(session=self.session, focused_percentage=75, relaxed_percentage=25)
        for state in ['focused', 'focused', 'relaxed']:
            SessionEEGSample.objects.create(session=self.session, slide=self.slides[0], state=state)
        StudentBadge.objects.create(student=self.student, key='care', unlocked_at=timezone.now())
        other_class = SchoolClass.objects.create(name='Other', code='OTHER-A', teacher=self.teacher)
        other_session = LearningSession.objects.create(student=self.student, school_class=other_class, lesson=self.lesson, ended_at=timezone.now())
        SessionAnalytics.objects.create(session=other_session, focused_percentage=0)
        SessionEEGSample.objects.create(session=other_session, slide=self.slides[1], state='overstimulated')
        self.client.force_login(self.teacher.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['average_focus'], 75)
        self.assertEqual(float(data['students'][0]['average_focus']), 75)
        self.assertEqual(len(data['recent_sessions']), 1)
        self.assertEqual(data['recent_badges'][0]['student']['id'], self.student.pk)
        self.assertEqual(len(data['timeline']), 1)
        self.assertEqual(data['timeline'][0]['points'][0], {'slide_id': self.slides[0].pk, 'state': 'focused', 'samples': 3})
        self.assertIsNone(data['timeline'][0]['points'][1]['state'])

    def test_mode_switches_are_saved_once_and_only_focus_to_relax_is_counted(self):
        self.client.force_login(self.student.user)
        url = f'/api/sessions/{self.session.pk}/mode/'
        for mode in ['relax', 'relax', 'focus', 'relax']:
            self.assertEqual(self.client.post(url, json.dumps({'mode': mode}), content_type='application/json').status_code, 200)
        self.assertEqual(AdaptationEvent.objects.filter(session=self.session).count(), 3)
        self.session.ended_at = timezone.now()
        self.session.save()
        self.client.force_login(self.teacher.user)
        data = self.client.get(f'/api/teacher/students/{self.student.pk}/?class_id={self.school_class.pk}').json()
        self.assertEqual(data['sessions'][0]['mode_changes'], 2)

    def test_completing_last_slide_awards_badge_without_opening_profile(self):
        self.client.force_login(self.student.user)
        for slide in self.slides:
            SessionSlideExposure.objects.create(session=self.session, slide=slide)
            url = f'/api/sessions/{self.session.pk}/slides/{slide.pk}/'
            self.assertEqual(self.client.post(url, json.dumps({'action': 'complete'}), content_type='application/json').status_code, 200)
            self.session.slide_exposures.filter(slide=slide).update(exited_at=timezone.now())
        self.assertTrue(StudentBadge.objects.filter(student=self.student, key='care').exists())
        self.assertTrue(StudentBadge.objects.filter(student=self.student, key='lessons-1').exists())

    def test_access_and_empty_data(self):
        self.client.force_login(self.student.user)
        self.assertEqual(self.client.get(self.url).status_code, 403)
        self.client.force_login(self.teacher.user)
        data = self.client.get(self.url).json()
        self.assertIsNone(data['average_focus'])
        self.assertEqual(data['timeline'], [])
        self.assertEqual(self.client.get(self.url + '?lesson_id=999999').status_code, 404)

    def test_live_focus_score_uses_only_latest_thirty_valid_windows(self):
        for state in ['focused'] * 10 + ['relaxed'] * 30:
            SessionEEGSample.objects.create(session=self.session, state=state, accepted_channels=4)
        for _ in range(5):
            SessionEEGSample.objects.create(session=self.session, state='focused', accepted_channels=0)
        self.client.force_login(self.student.user)
        response = self.client.post(f'/api/sessions/{self.session.pk}/eeg/', json.dumps({
            'bands': {'delta': .8, 'theta': .9, 'alpha': 1, 'beta': 1.4, 'gamma': .7},
            'signal_quality': [2, 2, 2, 2], 'accepted_channels': 4,
        }), content_type='application/json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['focus_score'], 3)

    def test_drawing_bytes_load_for_teacher_and_missing_file_is_reported(self):
        image = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=')
        with TemporaryDirectory() as root, override_settings(MEDIA_ROOT=root):
            asset = Asset.objects.create(file=SimpleUploadedFile('drawing.png', image, content_type='image/png'),
                original_name='drawing.png', mime_type='image/png', size_bytes=len(image), uploaded_by=self.student)
            JournalEntry.objects.create(session=self.session, student=self.student, asset=asset,
                response_type='drawing', prompt='My lesson', shared_with_teacher=True)
            self.client.force_login(self.teacher.user)
            url = f'/api/content/assets/{asset.pk}/preview/'
            response = self.client.get(url)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(b''.join(response.streaming_content), image)
            self.assertEqual(response['Cache-Control'], 'private, max-age=300')
            response.close()
            self.assertFalse(self.client.get('/api/teacher/journals/').json()['entries'][0]['asset_missing'])
            asset.file.storage.delete(asset.file.name)
            self.assertEqual(self.client.get(url).status_code, 404)
            self.assertTrue(self.client.get('/api/teacher/journals/').json()['entries'][0]['asset_missing'])
