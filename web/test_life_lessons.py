from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase

from web.activity_templates import validate_activity_configuration
from web.life_lessons import LIFE_LESSONS
from web.models import Lesson, Profile


class LifeLessonIntegrationTests(TestCase):
    def setUp(self):
        user = get_user_model().objects.create_user(username="life-owner", password="test-password")
        self.owner = Profile.objects.create(user=user, role=Profile.Role.ADMIN, display_name="LIFE owner")

    def sync(self):
        call_command("sync_life_lessons", owner="life-owner", stdout=StringIO())

    def test_sync_creates_three_ordered_approved_lessons(self):
        self.sync()
        lessons = Lesson.objects.filter(package__slug="life", competency_code__startswith="TPLS_")
        self.assertEqual(lessons.count(), 3)
        for lesson in lessons:
            positions = list(lesson.slides.values_list("position", flat=True))
            self.assertEqual(positions, list(range(len(positions))))
            self.assertEqual(lesson.status, Lesson.Status.APPROVED)

    def test_sync_is_idempotent(self):
        self.sync()
        ids = dict(Lesson.objects.filter(package__slug="life").values_list("competency_code", "pk"))
        slide_ids = {code: list(Lesson.objects.get(pk=pk).slides.values_list("pk", flat=True)) for code, pk in ids.items()}
        self.sync()
        self.assertEqual(ids, dict(Lesson.objects.filter(package__slug="life").values_list("competency_code", "pk")))
        for code, pk in ids.items():
            self.assertEqual(slide_ids[code], list(Lesson.objects.get(pk=pk).slides.values_list("pk", flat=True)))

    def test_all_scored_items_have_keys_and_instructional_feedback(self):
        for lesson in LIFE_LESSONS:
            for screen in lesson["slides"]:
                config = screen["configuration"]
                self.assertIsNone(validate_activity_configuration(screen["type"], config))
                if config.get("task_template"):
                    self.assertTrue(config["correct_feedback"])
                    self.assertTrue(config["retry_feedback"])

    def test_competency_boundaries_are_preserved(self):
        by_id = {lesson["lesson_id"]: lesson for lesson in LIFE_LESSONS}
        self.assertTrue(by_id["LIFE-01"]["assessment"]["prompting_allowed"])
        self.assertIn("insufficient", by_id["LIFE-02"]["assessment"]["digital_scope"])
        self.assertIn("complete simulated transaction", by_id["LIFE-03"]["assessment"]["digital_scope"])

