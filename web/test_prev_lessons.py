from io import StringIO
import json
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase

from web.activity_templates import validate_activity_configuration
from web.models import Activity, ActivityResponse, ClassPackage, CurriculumPackage, Enrollment, LearningSession, Lesson, LessonPracticeProgress, Profile, SchoolClass, Slide
from web.game_validation import evaluate_game
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
            expected = next(definition for definition in PREV_LESSONS if definition['competency_code'] == lesson.competency_code)
            self.assertEqual(list(lesson.slides.values_list("position", flat=True)), list(range(len(expected['slides']))))
            self.assertEqual(lesson.status, Lesson.Status.APPROVED)

    def test_sync_is_idempotent(self):
        self.sync()
        ids = dict(Lesson.objects.filter(package__slug="pre_vocational").values_list("competency_code", "pk"))
        self.sync()
        self.assertEqual(ids, dict(Lesson.objects.filter(package__slug="pre_vocational").values_list("competency_code", "pk")))

    def test_compact_sequence_preserves_review_ids_and_counts_core_progress(self):
        from types import SimpleNamespace
        from web.views import _lesson_data, _practice_progress_data
        self.sync()
        lesson = Lesson.objects.get(competency_code='TPPV-ST-NG-2')
        payload = _lesson_data(lesson)
        self.assertEqual(len(payload['slides']), 9)
        self.assertEqual(lesson.slides.count(), 18)
        completed = [slide['id'] for slide in payload['slides']]
        progress = SimpleNamespace(completed_slide_ids=completed, activity_evidence={})
        self.assertEqual(_practice_progress_data(lesson, progress)['percentage'], 100)
        self.assertEqual(_practice_progress_data(lesson, progress)['status'], 'completed')

    def test_prev02_compact_multimedia_workflow(self):
        self.sync()
        lesson = Lesson.objects.get(competency_code='TPPV-LE-NG-1')
        configs = [slide.activity.configuration for slide in lesson.slides.select_related('activity')]
        self.assertEqual(len(configs), 9)
        self.assertEqual(configs[2]['media_url'], 'https://www.youtube.com/embed/6fKVyeGdKxY')
        self.assertEqual(configs[3]['task_template'], 'memory_flip')
        self.assertEqual(configs[5]['task_template'], 'scenario_classifier')
        self.assertFalse(configs[6]['scored'])
        self.assertEqual(configs[7]['task_template'], 'word_search')

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
        reflections = [slide['configuration'] for slide in prev01['slides'] if slide['configuration'].get('evidence_role') == 'self_report']
        self.assertEqual(len(reflections), 4)
        self.assertTrue(all(config['scored'] is False for config in reflections))

    def test_curriculum_order_narration_and_video(self):
        definition = PREV_LESSONS[0]
        self.assertEqual(definition['competency_code'], 'TPPV-ST-NG-2')
        self.assertEqual(definition['competency'], 'Identify individual learner’s capabilities, interests, talents and skills')
        self.assertEqual(definition['content_standard'], 'The learner… Demonstrates understanding of the underlying concept and principles of assessing one’s personal strengths, talents, abilities and skills')
        self.assertEqual(definition['performance_standard'], 'The learner… Recognizes individual talents, skills, abilities and strengths')
        screens = {screen['configuration']['screen_key']: screen['configuration'] for screen in definition['slides']}
        self.assertEqual(len(screens), 18)
        self.assertEqual(screens['video']['media_url'], 'https://www.youtube.com/embed/JwNI1F21eK8')
        self.assertTrue(screens['video']['video_optional'])
        keys = list(screens)
        self.assertEqual(sum(not config.get('optional_review') for config in screens.values()), 9)
        self.assertLess(keys.index('concepts'), keys.index('video'))
        self.assertLess(keys.index('knowledge'), keys.index('reflection'))
        for key in ['interest','skill','talent','capability','concepts','story','summary']:
            self.assertTrue(screens[key]['narration_script'])
        self.assertIn('Receiving support does not mean', screens['capability']['narration_script'])
        self.assertFalse(any('career' in config.get('self_report_fields', {}).values() for config in screens.values()))

    def test_scenario_keys_and_discovery_overlap_are_server_verified(self):
        for screen in PREV_LESSONS[0]['slides']:
            config = screen['configuration']
            if config.get('task_template') == 'scenario_classifier':
                answers = [row['answer'] for row in config['scenarios']]
                self.assertTrue(evaluate_game(config, json.dumps({'answers':answers})))
                self.assertFalse(evaluate_game(config, json.dumps({'answers':answers[:-1]})))
                self.assertFalse(evaluate_game(config, json.dumps({'answers':['wrong'] * len(answers)})))
            if config.get('task_template') == 'discovery_board':
                selections = {area['id']: ['gardening'] for area in config['categories']}
                response = {'evidence_type':'self_report','selections':selections,'fields':{config['self_report_fields'][key]:value for key,value in selections.items()}}
                self.assertTrue(evaluate_game(config,json.dumps(response)))
                for key in selections: selections[key]=['unsure']
                response['fields']={config['self_report_fields'][key]:value for key,value in selections.items()}
                self.assertTrue(evaluate_game(config,json.dumps(response)))
                response['evidence_type']='verified_skill'
                self.assertFalse(evaluate_game(config,json.dumps(response)))

    def test_scoped_sync_preserves_other_lessons(self):
        self.sync()
        others = list(Slide.objects.exclude(lesson__competency_code='TPPV-ST-NG-2').values('pk','position','activity__configuration'))
        call_command('sync_prev_lessons', owner='prev-owner', lesson='PREV-01', stdout=StringIO())
        self.assertEqual(others,list(Slide.objects.exclude(lesson__competency_code='TPPV-ST-NG-2').values('pk','position','activity__configuration')))

    def test_legacy_upgrade_preserves_ids_completion_and_evidence(self):
        owner=Profile.objects.get(user__username='prev-owner')
        package,_=CurriculumPackage.objects.get_or_create(slug='pre_vocational',defaults={'name':'Pre-Vocational'})
        lesson=Lesson.objects.create(package=package,created_by=owner,competency_code='TPPV-ST-NG-2',title='Legacy PREV-01')
        legacy=[]
        for position in range(8):
            activity=Activity.objects.create(type='image',title='Legacy',configuration={})
            legacy.append(Slide.objects.create(lesson=lesson,position=position,title='Legacy',activity=activity))
        school_class=SchoolClass.objects.create(name='Discovery',code='DISCOVERY',teacher=owner)
        progress=LessonPracticeProgress.objects.create(student=owner,school_class=school_class,lesson=lesson,completed_slide_ids=[legacy[4].pk],activity_evidence={str(legacy[4].pk):{'selected':'gardening'}})
        call_command('sync_prev_lessons',owner='prev-owner',lesson='PREV-01',stdout=StringIO())
        for slide,key in zip(legacy,['orientation','concepts','story','classification','interests','board','knowledge','summary']):
            activity_id=slide.activity_id
            slide.refresh_from_db()
            self.assertEqual(slide.activity_id,activity_id)
            self.assertEqual(slide.activity.configuration['screen_key'],key)
        progress.refresh_from_db()
        self.assertEqual(progress.completed_slide_ids,[legacy[4].pk])
        self.assertEqual(progress.activity_evidence[str(legacy[4].pk)]['selected'],'gardening')
        before=list(lesson.slides.values_list('pk','activity_id','position'))
        call_command('sync_prev_lessons',owner='prev-owner',lesson='PREV-01',stdout=StringIO())
        self.assertEqual(before,list(lesson.slides.values_list('pk','activity_id','position')))

    def test_assets_reuse_existing_files_and_no_unknown_activity_images(self):
        root=Path(__file__).resolve().parents[1]/'frontend/public'
        for screen in PREV_LESSONS[0]['slides']:
            for item in screen['configuration'].get('items',[]):
                if item.get('image_url'): self.assertTrue((root/item['image_url'].lstrip('/')).is_file())

    def test_eeg_self_report_is_never_primary_correct_and_practice_restores_it(self):
        self.sync()
        owner=Profile.objects.get(user__username='prev-owner')
        user=get_user_model().objects.create_user(username='discovery-student',password='test-password')
        student=Profile.objects.create(user=user,role=Profile.Role.STUDENT,display_name='Student')
        school_class=SchoolClass.objects.create(name='Discovery',code='DISCOVERY',teacher=owner)
        Enrollment.objects.create(school_class=school_class,student=student,enrolled_by=owner)
        lesson=Lesson.objects.get(competency_code='TPPV-ST-NG-2')
        ClassPackage.objects.get_or_create(school_class=school_class,package=lesson.package)
        slide=lesson.slides.get(activity__configuration__screen_key='board')
        config=slide.activity.configuration
        selections={area['id']:['gardening'] for area in config['categories']}
        selected=json.dumps({'evidence_type':'self_report','selections':selections,'fields':{config['self_report_fields'][key]:value for key,value in selections.items()}})
        self.client.force_login(user)
        practice=f'/api/student/classes/{school_class.pk}/lessons/{lesson.pk}/'
        self.assertEqual(self.client.post(practice,data={'slide_id':slide.pk,'selected':selected},content_type='application/json').status_code,200)
        evidence=self.client.get(practice).json()['progress']['activity_evidence'][str(slide.pk)]
        self.assertEqual(evidence['evidence_role'],'self_report')
        self.assertEqual(json.loads(evidence['selected'])['fields']['selfReportedCapabilities'],['gardening'])
        session=LearningSession.objects.create(student=student,school_class=school_class,lesson=lesson)
        answer=self.client.post(f'/api/sessions/{session.pk}/slides/{slide.pk}/',data={'action':'answer','correct':True,'selected':selected},content_type='application/json')
        self.assertEqual(answer.status_code,200)
        self.assertIsNone(ActivityResponse.objects.get(session=session,activity=slide.activity).is_correct)
