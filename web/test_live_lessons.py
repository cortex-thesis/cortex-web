from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase

from web.activity_templates import validate_activity_configuration
from web.live_lessons import LIVE_LESSONS
from web.models import Lesson, Profile


class LiveLessonIntegrationTests(TestCase):
    def setUp(self):
        user = get_user_model().objects.create_user(username="live-owner", password="test-password")
        Profile.objects.create(user=user, role=Profile.Role.ADMIN, display_name="LIVE owner")

    def sync(self):
        call_command("sync_live_lessons", owner="live-owner", stdout=StringIO())

    def test_sync_creates_three_ordered_approved_lessons(self):
        self.sync()
        lessons = Lesson.objects.filter(package__slug="livelihood", competency_code__startswith="TC_LPGA-")
        self.assertEqual(lessons.count(), 3)
        for lesson in lessons:
            self.assertEqual(list(lesson.slides.values_list("position", flat=True)), list(range(8)))
            self.assertEqual(lesson.status, Lesson.Status.APPROVED)

    def test_sync_is_idempotent(self):
        self.sync()
        ids = dict(Lesson.objects.filter(package__slug="livelihood").values_list("competency_code", "pk"))
        self.sync()
        self.assertEqual(ids, dict(Lesson.objects.filter(package__slug="livelihood").values_list("competency_code", "pk")))

    def test_all_activity_configurations_are_valid(self):
        for lesson in LIVE_LESSONS:
            for screen in lesson["slides"]:
                self.assertIsNone(validate_activity_configuration(screen["type"], screen["configuration"]))

    def test_seed_assessment_stays_locked_pending_validation(self):
        lesson = next(item for item in LIVE_LESSONS if item["lesson_id"] == "LIVE-03")
        self.assertIn("No final seed-quality answer key", lesson["assessment"]["digital_scope"])
        self.assertTrue(lesson["slides"][-1]["configuration"]["assessment_metadata"]["final_assessment_locked"])
