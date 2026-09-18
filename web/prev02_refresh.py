"""Compact PREV-02 multimedia and digital practice workflow."""
from .care_lessons import ADAPTATION_POLICY
from .lesson_games import mix_choices, puzzle


def upgrade_prev02(definitions):
    lesson = definitions[1]
    old = lesson['slides']
    root = '/assets/pre-vocational/common/'
    screens = []
    def screen(title, kind='image', **config):
        config.update(lesson_id='PREV-02', adaptive_delivery=ADAPTATION_POLICY, digital_mastery_claim=False,
                      layout={'size': 'wide', 'preferred_columns': 3})
        if kind == 'interactive':
            config.setdefault('evidence_role', 'primary_digital' if config.get('scored', True) else 'self_report')
            mix_choices(config, 'PREV-02:' + title)
        screens.append({'title': title, 'type': kind, 'configuration': config})
    screen('Livelihood Activities Around Us', template='visual_narrative', steps=[{
        'id': 'goal', 'title': "Today's goal", 'description': 'Identify work people do and the goods or services they provide.',
        'image_url': root + 'community.png'}])
    screen('Goods and Services', template='visual_narrative', discussion=True,
           narration_script='Livelihood activities help people earn a living. Goods are things people make or sell, such as bread or vegetables. Services are useful work people do for others, such as repairs or tailoring.',
           steps=[{'id': 'goods', 'title': 'Goods', 'description': 'Things people make or sell.', 'image_url': root + 'baked-goods.png'},
                  {'id': 'services', 'title': 'Services', 'description': 'Useful work people do for others.', 'image_url': root + 'repair.png'}])
    screen('Livelihoods in Action', 'video', template='instructional_video',
           media_url='https://www.youtube.com/embed/6fKVyeGdKxY', content_label='Livelihood activities',
           content_description='Notice what people make, sell, or do for others.', video_optional=True,
           video_status='user_supplied_pending_expert_validation')
    pairs = old[3]['configuration']['pairs']
    for pair in pairs:
        if pair['id'] == 'food':
            pair['left']['image_url'] = root + 'food-processing.png'
            pair['right']['image_url'] = root + 'food-product.png'
    screen('Flip and Match Livelihoods', 'interactive', task_template='memory_flip',
           question='Match each activity picture with what it provides.', pairs=pairs, hide_image_labels=True,
           correct_feedback='You connected activities with their products or services.', retry_feedback='Try another pair.')
    config = dict(old[4]['configuration'])
    config.pop('lesson_id', None); config.pop('adaptive_delivery', None)
    config['items'] += [{'id': 'draw', 'label': 'Drawing for enjoyment'}, {'id': 'tailor', 'label': 'Altering clothes for a customer'}]
    config['sort_answers'].update(draw='recreation', tailor='livelihood')
    for item in config['items']:
        if item['id'] == 'baked': item['image_url'] = root + 'baked-goods.png'
    screen('Work or Free Time?', 'interactive', **config)
    rows = [
        {'clue': 'A neighbour bakes bread and sells it at a stall. What does the customer receive?', 'choices': ['Goods', 'A repair service', 'A leisure activity'], 'answer': 'Goods', 'feedback': 'Bread is a product the customer can buy.'},
        {'clue': 'A customer brings a broken computer to a technician. What does the technician provide?', 'choices': ['A repair service', 'Vegetables', 'Clothing'], 'answer': 'A repair service', 'feedback': 'The technician provides useful repair work.'},
        {'clue': 'Mina enjoys growing plants. Which change makes this example a livelihood activity?', 'choices': ['Growing vegetables to sell', 'Looking at plants for fun', 'Watching a gardening show'], 'answer': 'Growing vegetables to sell', 'feedback': 'Selling vegetables can help earn a living.'},
    ]
    for i, row in enumerate(rows): mix_choices(row, 'PREV-02:clue' + str(i))
    screen('Think About the Customer', 'interactive', task_template='scenario_classifier', scenarios=rows,
           question='Use the story to decide what is being provided.', correct_feedback='You identified goods, services, and livelihood examples.', retry_feedback='What does the customer receive?')
    config = dict(old[6]['configuration'])
    config.pop('lesson_id', None); config.pop('adaptive_delivery', None)
    config.update(scored=False, evidence_role='self_report')
    screen('Livelihoods in My Community', 'interactive', **config)
    screen('Livelihood Word Hunt', 'interactive', task_template='word_search', question='Find the words: tap their endpoints or drag across the letters.',
           **puzzle(['GOODS', 'SERVICE', 'WORK']), correct_feedback='You found the livelihood words.', retry_feedback='Try another line of letters.')
    screen('Lesson Complete', template='visual_narrative', steps=[{'id': 'done', 'title': 'Goods and services help communities',
           'description': 'You identified livelihood activities and what they provide.', 'image_url': '/assets/shared/thumbs-up.png'}])
    for config in (screens[0]['configuration'], screens[-1]['configuration']):
        config['layout']['preferred_columns'] = 1
    for screen_data in screens:
        for item in screen_data['configuration'].get('items', []):
            if item['id'] == 'draw': item['image_url'] = root + 'drawing-interest.png'
            elif item['id'] == 'tailor': item['image_url'] = root + 'tailoring.png'
            elif 'food' in item['id'] or 'food' in item['label'].lower(): item['image_url'] = root + 'meal-preparation.png'
    lesson['slides'] = screens
