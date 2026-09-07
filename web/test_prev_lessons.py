from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase

from web.activity_templates import validate_activity_configuration
from web.models import Lesson, Profile
from web.prev_lessons import PREV_LESSONS


class PrevLessonIntegrationTests(TestCase):
    def setUp(self):
        user = get_user_model().objects.create_user(username="prev-owner", password="test-password")
        Profile.objects.create(user=user, role=Profile.Role.ADMIN, display_name="PREV owner")

    def sync(self):
        call_command("sync_prev_lessons", owner="prev-owner", stdout=StringIO())

    def test_sync_creates_three_ordered_approved_lessons(self):
        self.sync()
        lessons = Lesson.objects.filter(package__slug="pre_vocational", competency_code__startswith="TPPV-")
        self.assertEqual(lessons.count(), 3)
        for lesson in lessons:
            self.assertEqual(list(lesson.slides.values_list("position", flat=True)), list(range(8)))
            self.assertEqual(lesson.status, Lesson.Status.APPROVED)

    def test_sync_is_idempotent(self):
        self.sync()
        ids = dict(Lesson.objects.filter(package__slug="pre_vocational").values_list("competency_code", "pk"))
        self.sync()
        self.assertEqual(ids, dict(Lesson.objects.filter(package__slug="pre_vocational").values_list("competency_code", "pk")))

    def test_all_configurations_and_scored_feedback_are_valid(self):
        for lesson in PREV_LESSONS:
            for screen in lesson["slides"]:
                config = screen["configuration"]
                self.assertIsNone(validate_activity_configuration(screen["type"], config))
                if config.get("task_template"):
                    self.assertTrue(config["correct_feedback"])
                    self.assertTrue(config["retry_feedback"])

    def test_self_reports_are_not_scored_as_verified_skills(self):
        prev01 = next(lesson for lesson in PREV_LESSONS if lesson["lesson_id"] == "PREV-01")
        self.assertFalse(prev01["assessment"]["self_report_scored"])
        self.assertTrue(all(not slide["configuration"].get("assessment_metadata", {}).get("scored", True) for slide in prev01["slides"][4:6]))
