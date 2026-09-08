from io import StringIO
from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from web.models import Enrollment, Lesson, LessonPracticeProgress, Profile, SchoolClass


class IntegratedLessonTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = Profile.objects.create(user=User.objects.create_user('lesson-owner'), role=Profile.Role.ADMIN)
        cls.teacher = Profile.objects.create(user=User.objects.create_user('lesson-teacher'), role=Profile.Role.TEACHER)
        cls.student = Profile.objects.create(user=User.objects.create_user('lesson-student'), role=Profile.Role.STUDENT)
        cls.school_class = SchoolClass.objects.create(name='Practice class', code='PRACTICE', teacher=cls.teacher)
        Enrollment.objects.create(school_class=cls.school_class, student=cls.student, enrolled_by=cls.teacher)
        call_command('sync_integrated_lessons', stdout=StringIO())

    def test_all_lessons_published_and_sync_preserves_ids(self):
        lessons = Lesson.objects.filter(status=Lesson.Status.APPROVED, archived_at__isnull=True)
        self.assertEqual(lessons.count(), 21)
        ids = {lesson.pk: list(lesson.slides.values_list('pk', flat=True)) for lesson in lessons}
        self.assertTrue(all(len(slides) >= 8 for slides in ids.values()))
        call_command('sync_integrated_lessons', stdout=StringIO())
        self.assertEqual(ids, {lesson.pk: list(lesson.slides.values_list('pk', flat=True)) for lesson in lessons})

    def test_student_can_open_every_integrated_lesson(self):
        self.client.force_login(self.student.user)
        for lesson in Lesson.objects.filter(status=Lesson.Status.APPROVED):
            url = f'/api/student/classes/{self.school_class.pk}/lessons/{lesson.pk}/'
            response = self.client.get(url)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()['title'], lesson.title)
            self.assertTrue(response.json()['slides'])
        self.assertFalse(self.student.learning_sessions.exists())

    def test_practice_checks_enrollment_and_publication(self):
        self.client.force_login(self.student.user)
        lesson = Lesson.objects.first()
        url = f'/api/student/classes/{self.school_class.pk}/lessons/{lesson.pk}/'
        lesson.status = Lesson.Status.DRAFT
        lesson.save()
        self.assertEqual(self.client.get(url).status_code, 404)
        Enrollment.objects.filter(student=self.student).update(removed_at=timezone.now())
        self.assertEqual(self.client.get(url).status_code, 403)
        self.client.logout()
        self.assertEqual(self.client.get(url).status_code, 401)

    def test_progress_lifecycle_and_repeat_updates(self):
        self.client.force_login(self.student.user)
        lesson = Lesson.objects.first()
        url = f'/api/student/classes/{self.school_class.pk}/lessons/{lesson.pk}/'
        self.assertEqual(self.client.get(url).json()['progress']['status'], 'not_started')
        self.assertFalse(LessonPracticeProgress.objects.exists())
        opened = self.client.post(url, data={}, content_type='application/json')
        self.assertEqual(opened.status_code, 200)
        self.assertEqual(opened.json()['progress']['status'], 'in_progress')
        self.assertEqual(opened.json()['progress']['percentage'], 0)
        slides = list(lesson.slides.all())
        for slide in slides:
            response = self.client.post(url, data={'slide_id': slide.pk}, content_type='application/json')
            self.assertEqual(response.status_code, 200)
        repeat = self.client.post(url, data={'slide_id': slides[0].pk}, content_type='application/json').json()['progress']
        self.assertEqual(repeat['status'], 'completed')
        self.assertEqual(repeat['percentage'], 100)
        self.assertEqual(len(repeat['completed_slide_ids']), len(slides))
        package = self.client.get(f'/api/student/classes/{self.school_class.pk}/packages/{lesson.package.slug}/').json()
        self.assertEqual(next(item for item in package['lessons'] if item['id'] == lesson.pk)['progress'], repeat)
        self.assertFalse(self.student.learning_sessions.exists())

    def test_progress_rejects_foreign_slides_and_removed_students(self):
        self.client.force_login(self.student.user)
        lesson = Lesson.objects.first()
        url = f'/api/student/classes/{self.school_class.pk}/lessons/{lesson.pk}/'
        other = Lesson.objects.exclude(pk=lesson.pk).first().slides.first()
        self.assertEqual(self.client.post(url, data={'slide_id': other.pk}, content_type='application/json').status_code, 400)
        self.assertFalse(LessonPracticeProgress.objects.exists())
        Enrollment.objects.filter(student=self.student).update(removed_at=timezone.now())
        self.assertEqual(self.client.post(url, data={}, content_type='application/json').status_code, 403)

    def test_progress_is_private_to_student_and_class(self):
        self.client.force_login(self.student.user)
        lesson = Lesson.objects.first()
        url = f'/api/student/classes/{self.school_class.pk}/lessons/{lesson.pk}/'
        self.client.post(url, data={}, content_type='application/json')
        other_student = Profile.objects.create(user=User.objects.create_user('other-practice-student'), role=Profile.Role.STUDENT)
        Enrollment.objects.create(student=other_student, school_class=self.school_class, enrolled_by=self.teacher)
        self.client.force_login(other_student.user)
        self.assertEqual(self.client.get(url).json()['progress']['status'], 'not_started')
        self.client.force_login(self.student.user)
        other_class = SchoolClass.objects.create(name='Other practice class', code='PRACTICE2', teacher=self.teacher)
        Enrollment.objects.create(student=self.student, school_class=other_class, enrolled_by=self.teacher)
        other_url = f'/api/student/classes/{other_class.pk}/lessons/{lesson.pk}/'
        self.assertEqual(self.client.get(other_url).json()['progress']['status'], 'not_started')
