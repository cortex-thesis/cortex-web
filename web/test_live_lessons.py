from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase

from web.activity_templates import validate_activity_configuration
from web.live_lessons import LIVE_LESSONS
from web.models import Enrollment, Lesson, LessonPracticeProgress, Profile, SchoolClass


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
            count = 9
            self.assertEqual(list(lesson.slides.values_list("position", flat=True)), list(range(count)))
            self.assertEqual(lesson.status, Lesson.Status.APPROVED)

    def test_sync_is_idempotent(self):
        self.sync()
        ids = dict(Lesson.objects.filter(package__slug="livelihood").values_list("competency_code", "pk"))
        self.sync()
        self.assertEqual(ids, dict(Lesson.objects.filter(package__slug="livelihood").values_list("competency_code", "pk")))

    def test_live01_refresh_is_compact_and_scoped(self):
        self.sync()
        other = Lesson.objects.get(competency_code=LIVE_LESSONS[1]['competency_code'])
        other.title = 'Preserve teacher changes'
        other.save(update_fields=['title'])
        lesson = Lesson.objects.get(competency_code=LIVE_LESSONS[0]['competency_code'])
        ids = list(lesson.slides.values_list('pk', flat=True))
        call_command('sync_live_lessons', owner='live-owner', lesson='LIVE-01', stdout=StringIO())
        other.refresh_from_db()
        self.assertEqual(other.title, 'Preserve teacher changes')
        self.assertEqual(ids, list(lesson.slides.values_list('pk', flat=True)))
        screens = LIVE_LESSONS[0]['slides']
        self.assertEqual(len(screens), 9)
        self.assertIn('-ZCdcTbXHYI', screens[2]['configuration']['media_url'])
        self.assertFalse(screens[7]['configuration']['scored'])

    def test_all_activity_configurations_are_valid(self):
        for lesson in LIVE_LESSONS:
            for screen in lesson["slides"]:
                self.assertIsNone(validate_activity_configuration(screen["type"], screen["configuration"]))

    def test_seed_assessment_stays_locked_pending_validation(self):
        lesson = next(item for item in LIVE_LESSONS if item["lesson_id"] == "LIVE-03")
        self.assertIn("No final seed-quality answer key", lesson["assessment"]["digital_scope"])
        self.assertTrue(lesson["slides"][-1]["configuration"]["assessment_metadata"]["final_assessment_locked"])

    def test_garden_mission_validates_full_process_not_seed_quality(self):
        import json
        from .game_validation import evaluate_game, validate_game
        for lesson in LIVE_LESSONS:
            config = lesson['slides'][3]['configuration']
            self.assertIsNone(validate_game(config))
            steps = [{'id': row['id'], 'tool': row['answer'], 'target_applied': True} for row in config['missions']]
            self.assertTrue(evaluate_game(config, json.dumps({'missions': steps, 'digital_only': True})))
            self.assertFalse(evaluate_game(config, json.dumps({'missions': steps[:-1], 'digital_only': True})))
            steps[0]['tool'] = 'wrong-tool'
            self.assertFalse(evaluate_game(config, json.dumps({'missions': steps, 'digital_only': True})))
            bad = dict(config, missions=[dict(config['missions'][0], answer='missing')])
            self.assertIsNotNone(validate_game(bad))
        self.assertIn('mYaEBgeebf4', LIVE_LESSONS[1]['slides'][2]['configuration']['media_url'])
        self.assertIn('uD6hCk58dVU', LIVE_LESSONS[2]['slides'][2]['configuration']['media_url'])
        self.assertFalse(LIVE_LESSONS[2]['slides'][2]['configuration']['assessment_metadata']['seed_quality_demonstration'])

    def test_garden_benefits_and_inspection_use_visible_actions_without_quality_claims(self):
        from .game_validation import validate_game
        benefits = LIVE_LESSONS[0]['slides'][3]['configuration']
        self.assertEqual([row['scene'] for row in benefits['missions']], ['meal', 'display', 'practice'])
        self.assertFalse(benefits['assessment_metadata']['harvest_readiness_verified'])
        inspection = LIVE_LESSONS[2]['slides'][3]['configuration']
        self.assertEqual([row['scene'] for row in inspection['missions']], ['inspect', 'compare', 'reference'])
        self.assertEqual(inspection['evidence_role'], 'supporting')
        self.assertTrue(inspection['assessment_metadata']['final_assessment_locked'])
        self.assertFalse(inspection['assessment_metadata']['seed_quality_verified'])
        for row in inspection['missions']:
            self.assertEqual(row['available_item_ids'], [row['answer']])
        bad = dict(inspection, missions=[dict(inspection['missions'][0], available_item_ids=['ask'])])
        self.assertIsNotNone(validate_game(bad))
        bad = dict(inspection, missions=[dict(inspection['missions'][0], scene='quality-certified')])
        self.assertIsNotNone(validate_game(bad))

    def test_student_can_save_only_a_complete_workbench_response(self):
        import json
        self.sync()
        users = get_user_model()
        teacher = Profile.objects.create(user=users.objects.create_user('garden-teacher'), role=Profile.Role.TEACHER)
        student = Profile.objects.create(user=users.objects.create_user('garden-student'), role=Profile.Role.STUDENT)
        school_class = SchoolClass.objects.create(name='Garden', code='GARDEN', teacher=teacher)
        Enrollment.objects.create(school_class=school_class, student=student, enrolled_by=teacher)
        self.client.force_login(student.user)
        for definition in LIVE_LESSONS[1:]:
            lesson = Lesson.objects.get(competency_code=definition['competency_code'])
            slide = lesson.slides.get(position=3)
            url = f'/api/student/classes/{school_class.pk}/lessons/{lesson.pk}/'
            invalid = self.client.post(url, data={'slide_id': slide.pk, 'selected': '{}'}, content_type='application/json')
            self.assertEqual(invalid.status_code, 400)
            evidence = {'digital_only': True, 'missions': [
                {'id': row['id'], 'tool': row['answer'], 'target_applied': True}
                for row in slide.activity.configuration['missions']]}
            saved = self.client.post(url, data={'slide_id': slide.pk, 'selected': json.dumps(evidence)}, content_type='application/json')
            self.assertEqual(saved.status_code, 200)
            progress = LessonPracticeProgress.objects.get(student=student, school_class=school_class, lesson=lesson)
            self.assertIn(slide.pk, progress.completed_slide_ids)
            self.assertFalse(progress.activity_evidence[str(slide.pk)]['digital_mastery_claim'])

    def test_gardening_kit_requires_all_suitable_tools(self):
        import json
        from .game_validation import evaluate_game
        config = LIVE_LESSONS[1]['slides'][4]['configuration']
        self.assertEqual(config['task_template'], 'garden_kit')
        self.assertTrue(evaluate_game(config, json.dumps({'picked':['trowel','water']})))
        for picks in (['trowel'], ['trowel','pencil'], ['trowel','water','water']):
            self.assertFalse(evaluate_game(config, json.dumps({'picked':picks})))
        self.assertEqual([row['scene'] for row in LIVE_LESSONS[1]['slides'][3]['configuration']['missions']], ['soil','water','measure'])

    def test_sync_preserves_history_reviews_and_excludes_them_from_current_progress(self):
        from web.views import _practice_progress_data
        self.sync()
        lesson = Lesson.objects.get(competency_code=LIVE_LESSONS[1]['competency_code'])
        old = lesson.slides.get(position=4)
        old.activity.configuration = dict(old.activity.configuration, optional_review=True, digital_garden_history=True)
        old.activity.save(update_fields=['configuration'])
        old.position=9
        old.save(update_fields=['position'])
        call_command('sync_live_lessons', owner='live-owner', lesson='LIVE-02', stdout=StringIO())
        old.refresh_from_db()
        self.assertTrue(old.activity.configuration['optional_review'])
        from types import SimpleNamespace
        data = _practice_progress_data(lesson, SimpleNamespace(completed_slide_ids=[old.pk],activity_evidence={}))
        self.assertEqual(data['completed_slide_ids'],[])
        self.assertEqual(data['percentage'],0)
        self.assertNotEqual(lesson.slides.get(position=4).pk,old.pk)
        from web.views import _current_garden_rows
        self.assertEqual(lesson.slides.filter(_current_garden_rows('activity')).count(),9)
