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

    def test_life01_drawing_video_connects_to_pencil_preparation(self):
        video = LIFE_LESSONS[0]["slides"][3]
        self.assertEqual(video["type"], "video")
        self.assertEqual(video["configuration"]["media_url"], "https://www.youtube.com/embed/lrmOkhuwpzI")
        self.assertIn("pencil and paper", video["configuration"]["content_description"])
        self.assertNotIn("asset_placeholders", video["configuration"])

    def test_life02_road_safety_video_and_exit_assets(self):
        slides = LIFE_LESSONS[1]["slides"]
        self.assertEqual(slides[2]["configuration"]["media_url"], "https://www.youtube.com/embed/DaqR9Oyf1Zw")
        self.assertEqual(slides[0]["configuration"]["steps"][0]["image_url"], "/assets/life/life-02/traffic-cone.png")
        exit_step = next(step for step in slides[1]["configuration"]["steps"] if step["id"] == "exit")
        self.assertEqual(exit_step["image_url"], "/assets/life/life-02/emergency-exit.png")
        self.assertIn(exit_step["image_url"], [pair["left"]["image_url"] for pair in slides[4]["configuration"]["pairs"]])

    def test_uploaded_summary_and_change_assets_and_price_tag(self):
        self.assertEqual(LIFE_LESSONS[1]["slides"][-1]["configuration"]["steps"][0]["image_url"], "/assets/life/life-02/look-understand-follow.png")
        slides = LIFE_LESSONS[2]["slides"]
        self.assertEqual(slides[1]["configuration"]["steps"][3]["image_url"], "/assets/life/life-03/change.png")
        self.assertEqual(slides[2]["configuration"]["steps"][0]["image_url"], "/assets/life/life-03/compute-change.png")
        self.assertEqual(slides[5]["configuration"]["task_template"], "shopping")
        self.assertEqual(slides[3]["configuration"]["price_tag"], slides[3]["configuration"]["answer"])

    def test_life03_coin_choices_include_uploaded_one_peso(self):
        items = LIFE_LESSONS[2]["slides"][0]["configuration"]["money_items"]
        self.assertEqual([item["image_url"] for item in items], [
            "/assets/life/life-03/one-peso-coin-transparent.png",
            "/assets/life/life-03/five-peso-coin-transparent.png",
            "/assets/life/life-03/ten-peso-coin-transparent.png",
            "/assets/life/life-03/twenty-peso-coin.png",
        ])

    def test_life03_completion_uses_shared_thumbs_up(self):
        final_step = LIFE_LESSONS[2]["slides"][-1]["configuration"]["steps"][0]
        self.assertEqual(final_step["image_url"], "/assets/shared/thumbs-up.png")
        self.assertEqual(LIFE_LESSONS[0]["slides"][-1]["configuration"]["steps"][0]["image_url"], "/assets/life/life-01/completed-directions.png")

