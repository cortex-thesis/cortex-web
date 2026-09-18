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

    def test_clock_contract_requires_all_times_and_correct_period(self):
        import json
        from web.game_validation import evaluate_game
        config = FUNC_LESSONS[2]['slides'][4]['configuration']
        times = [{k: r[k] for k in ('id','hour','minute','period')} for r in config['clock_rounds']]
        self.assertTrue(evaluate_game(config,json.dumps({'times':times,'digital_only':True})))
        self.assertFalse(evaluate_game(config,json.dumps({'times':times[:-1],'digital_only':True})))
        times[0]['period']='pm'
        self.assertFalse(evaluate_game(config,json.dumps({'times':times,'digital_only':True})))

    def test_scoped_clock_sync_preserves_other_lessons_and_history(self):
        self.sync()
        other=Lesson.objects.get(competency_code=FUNC_LESSONS[0]['competency_code'])
        other.title='Teacher edit'
        other.save(update_fields=['title'])
        lesson=Lesson.objects.get(competency_code=FUNC_LESSONS[2]['competency_code'])
        old=lesson.slides.get(position=3)
        old.position=8
        old.save(update_fields=['position'])
        old.activity.configuration=dict(old.activity.configuration,optional_review=True,digital_activity_history=True)
        old.activity.save(update_fields=['configuration'])
        call_command('sync_func_lessons',owner='func-owner',lesson='FUNC-03',stdout=StringIO())
        other.refresh_from_db()
        self.assertEqual(other.title,'Teacher edit')
        self.assertNotEqual(lesson.slides.get(position=3).pk,old.pk)
        from web.views import _current_garden_rows, _practice_progress_data
        from types import SimpleNamespace
        self.assertEqual(lesson.slides.filter(_current_garden_rows('activity')).count(),8)
        self.assertEqual(_practice_progress_data(lesson,SimpleNamespace(completed_slide_ids=[old.pk],activity_evidence={}))['percentage'],0)
