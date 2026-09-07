from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase

from web.activity_templates import validate_activity_configuration
from web.care_lessons import ADAPTATION_POLICY, CARE_LESSONS
from web.models import CurriculumPackage, Lesson, Profile


class CareLessonIntegrationTests(TestCase):
    def setUp(self):
        user = get_user_model().objects.create_user(username="care-owner", password="test-password")
        self.owner = Profile.objects.create(user=user, role=Profile.Role.ADMIN, display_name="CARE owner")

    def sync(self):
        call_command("sync_care_lessons", owner="care-owner", stdout=StringIO())

    def test_sync_creates_three_approved_ordered_care_lessons(self):
        self.sync()
        lessons = Lesson.objects.filter(package__slug="care", competency_code__startswith="TPCS_").order_by("competency_code")
        self.assertEqual(lessons.count(), 3)
        self.assertTrue(all(item.status == Lesson.Status.APPROVED for item in lessons))
        for lesson in lessons:
            positions = list(lesson.slides.values_list("position", flat=True))
            self.assertEqual(positions, list(range(len(positions))))
            self.assertGreaterEqual(len(positions), 8)

    def test_sync_is_idempotent_and_preserves_unrelated_content(self):
        package, _ = CurriculumPackage.objects.get_or_create(slug="care", defaults={"name": "Existing Care"})
        unrelated = Lesson.objects.create(package=package, title="Existing lesson", created_by=self.owner)
        self.sync()
        lesson_ids = dict(Lesson.objects.exclude(pk=unrelated.pk).values_list("competency_code", "pk"))
        slide_ids = {code: list(Lesson.objects.get(pk=pk).slides.values_list("pk", flat=True)) for code, pk in lesson_ids.items()}
        self.sync()
        self.assertTrue(Lesson.objects.filter(pk=unrelated.pk).exists())
        self.assertEqual(lesson_ids, dict(Lesson.objects.exclude(pk=unrelated.pk).values_list("competency_code", "pk")))
        for code, pk in lesson_ids.items():
            self.assertEqual(slide_ids[code], list(Lesson.objects.get(pk=pk).slides.values_list("pk", flat=True)))

    def test_every_scored_item_has_valid_key_and_feedback(self):
        for lesson in CARE_LESSONS:
            for screen in lesson["slides"]:
                config = screen["configuration"]
                self.assertIsNone(validate_activity_configuration(screen["type"], config))
                if config.get("task_template"):
                    self.assertTrue(config["correct_feedback"])
                    self.assertTrue(config["retry_feedback"])

    def test_adaptation_changes_delivery_not_answers_or_competency(self):
        self.assertEqual(set(ADAPTATION_POLICY), {"focused", "distracted", "relaxed", "overstimulated"})
        for lesson in CARE_LESSONS:
            for screen in lesson["slides"]:
                config = screen["configuration"]
                self.assertEqual(config["adaptive_delivery"], ADAPTATION_POLICY)
                self.assertNotIn("answer", ADAPTATION_POLICY["distracted"])
                self.assertNotIn("answer", ADAPTATION_POLICY["overstimulated"])

    def test_assessment_boundaries_are_explicit(self):
        by_id = {item["lesson_id"]: item for item in CARE_LESSONS}
        self.assertEqual(by_id["CARE-01"]["assessment"]["teacher_verification"], "required")
        self.assertIn("not proof", by_id["CARE-01"]["assessment"]["mastery_note"])
        self.assertEqual(by_id["CARE-02"]["assessment"]["teacher_verification"], "optional")
        self.assertEqual(by_id["CARE-03"]["assessment"]["teacher_verification"], "not_required")
        self.assertIn("Recognition only", by_id["CARE-03"]["assessment"]["digital_scope"])
