import json
from copy import deepcopy
from io import StringIO
from pathlib import Path

from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import SimpleTestCase, TestCase

from web.activity_templates import validate_activity_configuration
from web.care_lessons import CARE_LESSONS, ADAPTATION_POLICY
from web.life_lessons import LIFE_LESSONS
from web.game_validation import evaluate_game, validate_game
from web.models import ActivityResponse, Enrollment, LearningSession, Lesson, LessonPracticeProgress, Profile, SchoolClass

DEFINITIONS = CARE_LESSONS + LIFE_LESSONS


def successful_response(config):
    template = config['task_template']
    if template == 'word_search':
        return {'found': [target['word'] for target in config['targets']], 'follow_ups': {target['word']: target['follow_up_question']['answer'] for target in config['targets'] if target.get('follow_up_question')}}
    if template == 'find_it':
        return {'picked': config['correct_item_ids']}
    if template == 'audio_sequence':
        return {'rounds': [{'round': index, 'picked': round['correct_order'], 'audio_played': True, 'replays': 0, 'visual_prompt': False, 'completion_support': 'without_replay'} for index, round in enumerate(config['rounds'])]}
    item = next(item for item in config['items'] if item['id'] == config['target_item_id'])
    return {'item': item['id'], 'price': item['price'], 'paid': config['payment'], 'given': config['given_change'], 'change': config['payment'] - item['price'], 'verified': True}


class LessonGameContractTests(SimpleTestCase):
    def test_all_screens_valid_and_answer_keys_invariant(self):
        for lesson in DEFINITIONS:
            self.assertEqual(len(lesson['slides']), {'CARE-01': 9, 'CARE-02': 10, 'CARE-03': 10, 'LIFE-01': 8, 'LIFE-02': 8, 'LIFE-03': 9}[lesson['lesson_id']])
            for screen in lesson['slides']:
                config = screen['configuration']
                self.assertIsNone(validate_activity_configuration(screen['type'], config), screen['title'])
                self.assertEqual(config['adaptive_delivery'], ADAPTATION_POLICY)
                if config.get('task_template'):
                    self.assertIn(config['evidence_role'], ('supporting', 'primary_digital'))
                    self.assertFalse(config['digital_mastery_claim'])
                    for state in ADAPTATION_POLICY:
                        self.assertNotIn('answer', config['adaptive_delivery'][state])

    def test_word_hunts_have_exact_unique_paths(self):
        expected = {'CARE-01': ['SOAP', 'WATER', 'RINSE', 'DRY'], 'CARE-02': ['RICE', 'FISH', 'EGG', 'MILK', 'MANGO'], 'CARE-03': ['COMB', 'TOWEL', 'BRUSH'], 'LIFE-02': ['STOP', 'EXIT', 'WALK', 'SAFE']}
        for lesson in DEFINITIONS:
            for screen in lesson['slides']:
                config = screen['configuration']
                if config.get('task_template') == 'word_search':
                    self.assertEqual([target['word'] for target in config['targets']], expected[lesson['lesson_id']])
                    self.assertIsNone(validate_game(config))
                    wrong = deepcopy(config)
                    wrong['targets'][0]['cells'][0] = [99, 99]
                    self.assertIsNotNone(validate_game(wrong))
                    duplicate = deepcopy(config)
                    word = config['targets'][0]['word']
                    duplicate['grid'] = [['X'] * 8 for _ in range(8)]
                    duplicate['targets'] = [deepcopy(config['targets'][0])]
                    duplicate['targets'][0]['cells'] = [[0, col] for col in range(len(word))]
                    duplicate['grid'][0][:len(word)] = list(word)
                    duplicate['grid'][-1][:len(word)] = list(word)
                    self.assertIsNotNone(validate_game(duplicate))

    def test_new_game_response_keys_correct_incorrect_and_retries(self):
        for lesson in DEFINITIONS:
            for screen in lesson['slides']:
                config = screen['configuration']
                if config.get('task_template') not in ('word_search', 'find_it', 'audio_sequence', 'shopping'):
                    continue
                response = json.dumps(successful_response(config))
                self.assertTrue(evaluate_game(config, response), screen['title'])
                self.assertFalse(evaluate_game(config, '{}'))
                self.assertFalse(evaluate_game(config, 'not json'))
                self.assertTrue(evaluate_game(config, response))

    def test_audio_directions_hidden_and_support_explicit(self):
        for screen in LIFE_LESSONS[0]['slides'][4:7]:
            config = screen['configuration']
            self.assertEqual(config['task_template'], 'audio_sequence')
            self.assertNotIn('instruction', config)
            self.assertNotIn('correct_order', config)
            self.assertNotIn('choices', config)
            response = successful_response(config)
            response['rounds'][0].update(replays=2, completion_support='after_replay')
            self.assertTrue(evaluate_game(config, json.dumps(response)))
            response['rounds'][0].update(audio_played=False, visual_prompt=True, completion_support='with_visual_prompt')
            self.assertTrue(evaluate_game(config, json.dumps(response)))
            response['rounds'][0].update(visual_prompt=False)
            self.assertFalse(evaluate_game(config, json.dumps(response)))

    def test_mixed_grids_assets_and_story_reasoning(self):
        from web.lesson_games import puzzle
        for words in (["SOAP", "WATER", "RINSE", "DRY"], ["RICE", "FISH", "EGG", "MILK", "MANGO"]):
            config = puzzle(words)
            self.assertEqual(config, puzzle(words))
            self.assertTrue(any(target['cells'][0][1] == target['cells'][-1][1] for target in config['targets']))
            self.assertTrue(any(target['cells'][0] > target['cells'][-1] for target in config['targets']))
            self.assertGreater(len({letter for row in config['grid'] for letter in row}), 15)
        food = CARE_LESSONS[1]['slides'][4]['configuration']
        self.assertEqual(food['task_template'], 'memory_flip')
        self.assertTrue(food['hide_image_labels'])
        egg = next(pair for pair in food['pairs'] if pair['id'] == 'egg')
        self.assertEqual(egg['left']['image_url'], '/assets/care/care-02/egg.png')
        star = next(item for item in LIFE_LESSONS[0]['slides'][5]['configuration']['items'] if item['id'] == 'star')
        self.assertEqual(star['image_url'], '/assets/life/life-01/star.png')
        story = LIFE_LESSONS[0]['slides'][4]['configuration']['rounds'][0]
        self.assertEqual(story['correct_order'], ['notebook', 'pencil'])
        self.assertNotIn('Tap', story['direction'])

    def test_lunch_accepts_multiple_valid_combinations(self):
        config = CARE_LESSONS[1]['slides'][7]['configuration']
        self.assertTrue(evaluate_game(config, json.dumps({'picked': ['rice', 'water']})))
        self.assertTrue(evaluate_game(config, json.dumps({'picked': ['banana', 'egg']})))
        self.assertFalse(evaluate_game(config, json.dumps({'picked': ['rice', 'snack']})))

    def test_safety_hunt_requires_meaning_followups(self):
        config = LIFE_LESSONS[1]['slides'][3]['configuration']
        response = successful_response(config)
        response['follow_ups'] = {}
        self.assertFalse(evaluate_game(config, json.dumps(response)))

    def test_shopping_accepts_sufficient_alternate_payment_and_change(self):
        config = LIFE_LESSONS[2]['slides'][5]['configuration']
        response = successful_response(config)
        response.update(paid=20, given=12, change=12)
        self.assertTrue(evaluate_game(config, json.dumps(response)))
        response['change'] = 2
        self.assertFalse(evaluate_game(config, json.dumps(response)))

    def test_all_referenced_game_images_exist(self):
        public = Path(__file__).resolve().parents[1] / 'frontend/public'
        def visit(value):
            if isinstance(value, list):
                for item in value: visit(item)
            elif isinstance(value, dict):
                for key, item in value.items():
                    if key in ('image_url', 'reveal_image') and item:
                        self.assertTrue((public / item.lstrip('/')).is_file(), item)
                    else: visit(item)
        for lesson in DEFINITIONS: visit(lesson)


class LessonGamePersistenceTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = Profile.objects.create(user=User.objects.create_user('games-owner'), role=Profile.Role.ADMIN)
        cls.teacher = Profile.objects.create(user=User.objects.create_user('games-teacher'), role=Profile.Role.TEACHER)
        cls.student = Profile.objects.create(user=User.objects.create_user('games-student'), role=Profile.Role.STUDENT)
        cls.school_class = SchoolClass.objects.create(name='Games', code='GAMES', teacher=cls.teacher)
        Enrollment.objects.create(school_class=cls.school_class, student=cls.student, enrolled_by=cls.teacher)
        call_command('sync_integrated_lessons', stdout=StringIO())

    def test_sync_preserves_completed_slide_and_activity_ids(self):
        lesson = Lesson.objects.get(competency_code='TPCS_HC-hh-NG-3')
        before = list(lesson.slides.values_list('pk', 'activity_id', 'position'))
        progress = LessonPracticeProgress.objects.create(student=self.student, school_class=self.school_class, lesson=lesson, completed_slide_ids=[before[0][0]])
        call_command('sync_care_lessons', stdout=StringIO())
        self.assertEqual(before, list(lesson.slides.values_list('pk', 'activity_id', 'position')))
        progress.refresh_from_db()
        self.assertEqual(progress.completed_slide_ids, [before[0][0]])

    def test_practice_records_support_without_mastery_and_keeps_old_progress(self):
        self.client.force_login(self.student.user)
        lesson = Lesson.objects.get(competency_code='TPLS_CS-li-NG-4')
        slide = lesson.slides.get(position=4)
        response = successful_response(slide.activity.configuration)
        response['rounds'][0].update(replays=1, completion_support='after_replay')
        url = f'/api/student/classes/{self.school_class.pk}/lessons/{lesson.pk}/'
        invalid = self.client.post(url, data={'slide_id': slide.pk, 'selected': '{}'}, content_type='application/json')
        self.assertEqual(invalid.status_code, 400)
        saved = self.client.post(url, data={'slide_id': slide.pk, 'selected': json.dumps(response)}, content_type='application/json')
        self.assertEqual(saved.status_code, 200)
        evidence = saved.json()['progress']['activity_evidence'][str(slide.pk)]
        self.assertFalse(evidence['digital_mastery_claim'])
        self.assertEqual(json.loads(evidence['selected'])['rounds'][0]['replays'], 1)
        self.assertFalse(self.student.learning_sessions.exists())

    def test_eeg_supporting_answers_do_not_count_as_primary_correct(self):
        self.client.force_login(self.student.user)
        lesson = Lesson.objects.get(competency_code='TPCS_HC-hh-NG-3')
        slide = lesson.slides.get(position=1)
        session = LearningSession.objects.create(student=self.student, school_class=self.school_class, lesson=lesson)
        url = f'/api/sessions/{session.pk}/slides/{slide.pk}/'
        selected = json.dumps(successful_response(slide.activity.configuration))
        self.assertEqual(self.client.post(url, data={'action': 'answer', 'correct': True, 'selected': selected}, content_type='application/json').status_code, 200)
        answer = ActivityResponse.objects.get(session=session)
        self.assertIsNone(answer.is_correct)
        self.assertTrue(answer.response['practice_correct'])
        self.assertEqual(answer.response['evidence_role'], 'supporting')
