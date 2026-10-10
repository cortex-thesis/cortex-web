import json
from pathlib import Path

from django.test import SimpleTestCase

from .activity_templates import validate_activity_configuration
from .func_lessons import FUNC_LESSONS
from .game_validation import evaluate_game


class EnrichmentWorkflowTests(SimpleTestCase):
    def setUp(self):
        self.root = Path(__file__).resolve().parent.parent
        self.lessons = json.loads((self.root / 'web/enrichment_lessons.json').read_text(encoding='utf-8'))

    def test_all_guided_activities_have_valid_configuration_and_bundled_media(self):
        def check_media(value):
            if isinstance(value, list):
                for item in value:
                    check_media(item)
            elif isinstance(value, dict):
                for key, item in value.items():
                    if key in ('image_url', 'audio_url') and item:
                        self.assertTrue((self.root / 'frontend/public' / item.lstrip('/')).is_file(), item)
                    elif isinstance(item, (dict, list)):
                        check_media(item)

        for lesson in self.lessons:
            self.assertEqual(len(lesson['slides']), 8)
            for slide in lesson['slides']:
                with self.subTest(lesson=lesson['lesson_id'], slide=slide['title']):
                    self.assertIsNone(validate_activity_configuration(slide['type'], slide['configuration']))
                    check_media(slide['configuration'])

    def test_scenario_challenges_require_every_correct_answer(self):
        for lesson in self.lessons:
            for slide in lesson['slides']:
                config = slide['configuration']
                if config.get('task_template') != 'scenario_classifier':
                    continue
                answers = [row['answer'] for row in config['scenarios']]
                self.assertTrue(evaluate_game(config, json.dumps({'answers': answers})))
                self.assertFalse(evaluate_game(config, json.dumps({'answers': answers[:-1]})))
                self.assertFalse(evaluate_game(config, json.dumps({'answers': ['wrong'] * len(answers)})))

    def test_listening_rounds_save_replay_or_visual_support_and_require_complete_evidence(self):
        for lesson in self.lessons:
            for slide in lesson['slides']:
                config = slide['configuration']
                if config.get('task_template') != 'audio_sequence':
                    continue
                rounds = [{'round': index, 'picked': row['correct_order'], 'audio_played': True}
                          for index, row in enumerate(config['rounds'])]
                self.assertTrue(evaluate_game(config, json.dumps({'rounds': rounds})))
                self.assertFalse(evaluate_game(config, json.dumps({'rounds': rounds[:-1]})))
                for row in rounds:
                    row['audio_played'] = False
                    row['visual_prompt'] = True
                self.assertTrue(evaluate_game(config, json.dumps({'rounds': rounds})))

    def test_everyday_words_pictures_exist_in_the_authoritative_lesson(self):
        lesson = FUNC_LESSONS[0]
        for index in (0, 3, 4, 5):
            config = lesson['slides'][index]['configuration']
            self.assertTrue((self.root / 'frontend/public' / config['image_url'].lstrip('/')).is_file())
        for index in (1, 2, 7):
            for step in lesson['slides'][index]['configuration']['steps']:
                self.assertTrue((self.root / 'frontend/public' / step['image_url'].lstrip('/')).is_file())
