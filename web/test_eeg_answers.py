import json

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from .models import Activity, ActivityResponse, CurriculumPackage, LearningSession, Lesson, Profile, SchoolClass, Slide


class EEGAnswerTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.teacher = Profile.objects.create(user=User.objects.create_user('answer-teacher'), role=Profile.Role.TEACHER)
        cls.student = Profile.objects.create(user=User.objects.create_user('answer-student'), role=Profile.Role.STUDENT)
        cls.other = Profile.objects.create(user=User.objects.create_user('answer-other'), role=Profile.Role.STUDENT)
        school_class = SchoolClass.objects.create(name='EEG Answers', code='ANSWERS', teacher=cls.teacher)
        lesson = Lesson.objects.create(package=CurriculumPackage.objects.first(), title='Answers', created_by=cls.teacher)
        cls.activity = Activity.objects.create(type=Activity.ActivityType.INTERACTIVE, title='Question')
        cls.slide = Slide.objects.create(lesson=lesson, activity=cls.activity, position=1, title='Question')
        cls.session = LearningSession.objects.create(student=cls.student, school_class=school_class, lesson=lesson)

    def setUp(self):
        self.client.force_login(self.student.user)
        self.url = f'/api/sessions/{self.session.pk}/slides/{self.slide.pk}/'

    def answer(self, **values):
        return self.client.post(self.url, data=json.dumps({'action': 'answer', 'correct': True, 'selected': 'Yes', 'attempt': 1, **values}), content_type='application/json')

    def test_saves_answers_and_retries_do_not_duplicate_attempts(self):
        self.assertEqual(self.answer(correct=False, selected='No').status_code, 200)
        self.assertEqual(self.answer(correct=False, selected='No').status_code, 200)
        response = ActivityResponse.objects.get(session=self.session)
        self.assertEqual(response.response, {'selected': 'No'})
        self.assertFalse(response.is_correct)
        self.assertEqual(self.answer(attempt=2).status_code, 200)
        self.assertEqual(ActivityResponse.objects.filter(session=self.session).count(), 2)
        self.assertTrue(ActivityResponse.objects.get(session=self.session, attempt_number=2).is_correct)

    def test_rejects_answers_from_other_students(self):
        self.client.force_login(self.other.user)
        self.assertEqual(self.answer().status_code, 404)
        self.assertFalse(ActivityResponse.objects.exists())

    def test_rejects_foreign_slides(self):
        lesson = Lesson.objects.create(package=CurriculumPackage.objects.first(), title='Other lesson', created_by=self.teacher)
        slide = Slide.objects.create(lesson=lesson, activity=Activity.objects.create(type='interactive', title='Other'), position=1, title='Other')
        self.url = f'/api/sessions/{self.session.pk}/slides/{slide.pk}/'
        self.assertEqual(self.answer().status_code, 400)
        self.assertFalse(ActivityResponse.objects.exists())

    def test_rejects_invalid_answers(self):
        for invalid in ({'correct': 'yes'}, {'selected': {}}, {'attempt': 0}, {'attempt': True}, {'attempt': 32768}):
            self.assertEqual(self.answer(**invalid).status_code, 400)
        self.assertFalse(ActivityResponse.objects.exists())

    def test_rejects_answers_after_session_ends(self):
        LearningSession.objects.filter(pk=self.session.pk).update(ended_at=timezone.now())
        self.assertEqual(self.answer().status_code, 409)
        self.assertFalse(ActivityResponse.objects.exists())
