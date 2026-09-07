from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase

from web.activity_templates import validate_activity_configuration
from web.career_lessons import CAREER_LESSONS
from web.models import Lesson, Profile


class CareerLessonIntegrationTests(TestCase):
    def setUp(self):
        user = get_user_model().objects.create_user(username="career-owner", password="test-password")
        Profile.objects.create(user=user, role=Profile.Role.ADMIN, display_name="Career owner")

    def sync(self):
        call_command("sync_career_lessons", owner="career-owner", stdout=StringIO())

    def test_sync_creates_three_ordered_approved_lessons(self):
        self.sync()
        lessons = Lesson.objects.filter(package__slug="career")
        self.assertEqual(lessons.count(), 3)
        for lesson in lessons:
            self.assertEqual(list(lesson.slides.values_list("position", flat=True)), list(range(8)))
            self.assertEqual(lesson.status, Lesson.Status.APPROVED)

    def test_sync_is_idempotent(self):
        self.sync()
        ids = dict(Lesson.objects.filter(package__slug="career").values_list("competency_code", "pk"))
        self.sync()
        self.assertEqual(ids, dict(Lesson.objects.filter(package__slug="career").values_list("competency_code", "pk")))

    def test_all_activity_configurations_are_valid(self):
        for lesson in CAREER_LESSONS:
            for screen in lesson["slides"]:
                self.assertIsNone(validate_activity_configuration(screen["type"], screen["configuration"]))

    def test_safeguards_are_preserved(self):
        by_id = {lesson["lesson_id"]: lesson for lesson in CAREER_LESSONS}
        self.assertFalse(by_id["CAREER-01"]["assessment"]["automated_aptitude_test"])
        self.assertFalse(by_id["CAREER-02"]["assessment"]["deterministic_job_assignment"])
        self.assertTrue(by_id["CAREER-03"]["assessment"]["support_needs_are_not_negative_attitudes"])
