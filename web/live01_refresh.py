"""Compact gardening benefits workflow; digital practice is not physical mastery."""
from .care_lessons import ADAPTATION_POLICY
from .lesson_games import mix_choices, puzzle


def upgrade_live01(definitions):
    lesson = definitions[0]
    root = '/assets/livelihood/common/'
    slides = []

    def screen(key, title, kind='image', columns=3, **config):
        config.update(lesson_id='LIVE-01', screen_key=key, adaptive_delivery=ADAPTATION_POLICY,
                      digital_mastery_claim=False, layout={'size': 'wide', 'preferred_columns': columns})
        if kind == 'interactive':
            config.setdefault('correct_feedback', 'You identified a realistic gardening benefit.')
            config.setdefault('retry_feedback', 'Think about what gardening can actually provide.')
            config['evidence_role'] = 'self_report' if config.get('scored') is False else 'primary_digital'
            mix_choices(config, 'LIVE-01:' + key)
        slides.append({'title': title, 'type': kind, 'configuration': config})

    screen('goal', 'Why Gardening Matters', columns=1, template='visual_narrative', steps=[{
        'id': 'goal', 'title': "Today's goal", 'description': 'Discover how gardens provide food, useful plants, and skills.',
        'image_url': root + 'gardening-goal.png'}])
    screen('discuss', 'What Can a Garden Give Us?', columns=3, template='visual_narrative', discussion=True,
           narration_script='Gardens can provide food and flowers. Caring for plants helps us practice useful skills. Some plants may be sold, but income depends on costs, demand, and care. Ask for support and use tools safely.',
           steps=[{'id': 'food', 'title': 'Food', 'description': 'Vegetables can be used for meals.', 'image_url': '/assets/care/care-02/vegetables.png'},
                  {'id': 'plants', 'title': 'Useful plants', 'description': 'Flowers can brighten a space or become products.', 'image_url': root + 'flowers.png'},
                  {'id': 'skills', 'title': 'Practice', 'description': 'Learn to care for plants with support.', 'image_url': root + 'gardening.png'}])
    screen('video', 'Watch: Gardening', 'video', template='instructional_video',
           media_url='https://www.youtube.com/embed/-ZCdcTbXHYI', content_label='Gardening video',
           content_description='Watch for ways a garden can help people.')
    screen('garden-benefits', 'From Garden to Everyday Life', 'interactive', task_template='garden_mission',
           question='Choose a garden item, then tap its destination or drag it there.',
           items=[{'id': 'vegetables', 'label': 'Garden vegetables', 'image_url': '/assets/care/care-02/vegetables.png'},
                  {'id': 'flowers', 'label': 'Garden flowers', 'image_url': root + 'flowers.png'},
                  {'id': 'care', 'label': 'Supported plant care', 'image_url': root + 'gardening.png'}],
           missions=[
               {'id': 'meal', 'label': 'Food', 'instruction': 'Bring the collected vegetables to the meal plate.',
                'answer': 'vegetables', 'action_label': 'Add vegetables to the plate', 'scene': 'meal',
                'hint': 'Vegetables can become food for a meal.', 'feedback': 'The plate now has vegetables. Gardens can provide food.'},
               {'id': 'display', 'label': 'Useful plants', 'instruction': 'Bring the cut flowers to the vase.',
                'answer': 'flowers', 'action_label': 'Put flowers in the vase', 'scene': 'display',
                'hint': 'Flowers can brighten a space.', 'feedback': 'Flowers brighten this space. They may also become products to sell.'},
               {'id': 'practice', 'label': 'Skills', 'instruction': 'Bring supported plant care to the practice corner.',
                'answer': 'care', 'action_label': 'Practice with support', 'scene': 'practice',
                'hint': 'Practicing plant care with support builds useful skills.', 'feedback': 'Practice helps build skills. This screen does not verify real tool use.'}],
           correct_feedback='Gardens can provide food, useful plants, and opportunities to practice skills.',
           assessment_metadata={'harvest_readiness_verified': False, 'physical_operation_verified': False})
    screen('sort', 'Garden Benefit or Not?', 'interactive', task_template='sort_groups',
           question='Drag each example into a group, or tap it then tap a group.',
           items=[{'id': 'food', 'label': 'Provides vegetables', 'image_url': '/assets/care/care-02/vegetables.png'},
                  {'id': 'flowers', 'label': 'Grows flowers', 'image_url': root + 'flowers.png'},
                  {'id': 'practice', 'label': 'Practices plant care', 'image_url': root + 'gardening.png'},
                  {'id': 'guarantee', 'label': 'Guarantees money without effort'}],
           categories=[{'id': 'benefit', 'label': 'Realistic benefit'}, {'id': 'not', 'label': 'Not a realistic benefit'}],
           sort_answers={'food': 'benefit', 'flowers': 'benefit', 'practice': 'benefit', 'guarantee': 'not'})
    scenarios = [
        {'clue': 'A family uses vegetables from its garden for meals. What benefit is this?', 'choices': ['Provides food', 'Charges a phone', 'Guarantees income'], 'answer': 'Provides food'},
        {'clue': 'Sam learns to water plants with support. What is Sam developing?', 'choices': ['Practical skills', 'Instant money', 'Phone repair skills'], 'answer': 'Practical skills'},
        {'clue': 'Ana wants to sell flowers. What should she consider?', 'choices': ['Costs, customer demand, and plant care', 'Every flower is guaranteed to sell', 'Plants need no care'], 'answer': 'Costs, customer demand, and plant care'},
    ]
    for index, row in enumerate(scenarios):
        mix_choices(row, 'LIVE-01:story' + str(index))
    screen('stories', 'Garden Detective', 'interactive', task_template='scenario_classifier',
           question='Choose the benefit or sensible next step.', scenarios=scenarios)
    screen('hunt', 'Garden Word Hunt', 'interactive', task_template='word_search',
           question='Find the words connected with gardening.', **puzzle(['FOOD', 'PLANT', 'CARE']))
    screen('reflect', 'My Garden Idea', 'interactive', task_template='picture_choice', scored=False,
           selection_mode='single', correct_item_ids=[], self_report_field='gardenInterest',
           question='What would you like to explore? There are no wrong answers.',
           items=[{'id': 'food', 'label': 'Growing vegetables', 'image_url': '/assets/care/care-02/vegetables.png'},
                  {'id': 'flowers', 'label': 'Growing flowers', 'image_url': root + 'flowers.png'},
                  {'id': 'care', 'label': 'Caring for plants', 'image_url': root + 'gardening.png'},
                  {'id': 'unsure', 'label': "I'm not sure yet", 'image_url': '/assets/pre-vocational/common/not-sure-yet.png'}],
           correct_feedback='You saved an idea to explore.')
    screen('complete', 'Garden Mission Complete', columns=1, template='visual_narrative', steps=[{
        'id': 'done', 'title': 'Food, plants, and practice', 'description': 'You explored garden benefits. Try real plant care with appropriate support.',
        'image_url': root + 'flowers.png'}], assessment_metadata={'physical_operation_verified': False})
    lesson['slides'] = slides
