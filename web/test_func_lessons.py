from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase

from web.activity_templates import validate_activity_configuration
from web.func_lessons import FUNC_LESSONS
from web.models import Lesson, Profile


class FuncLessonIntegrationTests(TestCase):
    def setUp(self):
        user = get_user_model().objects.create_user(username="func-owner", password="test-password")
        Profile.objects.create(user=user, role=Profile.Role.ADMIN, display_name="FUNC owner")

    def sync(self):
        call_command("sync_func_lessons", owner="func-owner", stdout=StringIO())

    def test_sync_creates_three_ordered_approved_lessons(self):
        self.sync()
        lessons = Lesson.objects.filter(package__slug="functional_academics")
        self.assertEqual(lessons.count(), 3)
        for lesson in lessons:
            self.assertEqual(list(lesson.slides.values_list("position", flat=True)), list(range(8)))
            self.assertEqual(lesson.status, Lesson.Status.APPROVED)

    def test_sync_is_idempotent(self):
        self.sync()
        ids = dict(Lesson.objects.filter(package__slug="functional_academics").values_list("competency_code", "pk"))
        self.sync()
        self.assertEqual(ids, dict(Lesson.objects.filter(package__slug="functional_academics").values_list("competency_code", "pk")))

    def test_all_activity_configurations_are_valid(self):
        for lesson in FUNC_LESSONS:
            for screen in lesson["slides"]:
                self.assertIsNone(validate_activity_configuration(screen["type"], screen["configuration"]))

    def test_competency_boundaries_are_preserved(self):
        by_id = {lesson["lesson_id"]: lesson for lesson in FUNC_LESSONS}
        self.assertFalse(by_id["FUNC-01"]["assessment"]["spoken_language_exclusive"])
        self.assertIn("excludes", by_id["FUNC-02"]["assessment"]["digital_scope"])
        self.assertEqual(by_id["FUNC-03"]["assessment"]["mastery_threshold"], "Panorama/SPED must determine")
