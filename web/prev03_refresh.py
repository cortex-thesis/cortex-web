"""Video-free community opportunity mini-games; no guaranteed livelihood claims."""
from .care_lessons import ADAPTATION_POLICY
from .lesson_games import mix_choices, puzzle


def upgrade_prev03(definitions):
    lesson = definitions[2]
    root = '/assets/pre-vocational/common/'
    slides = []

    def screen(key, title, kind='image', columns=3, **config):
        config.update(lesson_id='PREV-03', screen_key=key, adaptive_delivery=ADAPTATION_POLICY,
                      digital_mastery_claim=False, layout={'size': 'wide', 'preferred_columns': columns})
        if kind == 'interactive':
            config.setdefault('correct_feedback', 'You connected the need with a useful response.')
            config.setdefault('retry_feedback', 'Think about what the person needs.')
            config.setdefault('evidence_role', 'self_report' if config.get('scored') is False else 'primary_digital')
            mix_choices(config, 'PREV-03:' + key)
        slides.append({'title': title, 'type': kind, 'configuration': config})

    screen('goal', 'Find Opportunities Around Us', columns=1, template='visual_narrative', steps=[{
        'id': 'goal', 'title': "Today's goal", 'description': 'Notice a community need and connect it with useful work.',
        'image_url': root + 'opportunity.png'}])
    screen('concepts', 'A Need Can Inspire an Idea', columns=2, template='visual_narrative', discussion=True,
           narration_script='Start with what people need. Then think of useful goods or services. Check the skills, materials, safety, and support needed before starting. An idea is not a guarantee of success.',
           steps=[{'id': 'need', 'title': 'Notice the need', 'description': 'What would help people nearby?', 'image_url': root + 'community.png'},
                  {'id': 'idea', 'title': 'Connect useful work', 'description': 'What could someone make, sell, or do to help?', 'image_url': root + 'activity.png'}])
    examples = [('snacks', 'baked-goods.png', 'Families need suitable snacks', 'Prepare food to sell'),
                ('clothes', 'tailoring.png', 'Clothes need alterations', 'Offer tailoring services'),
                ('plants', 'gardening.png', 'Neighbours want fresh vegetables', 'Grow vegetables to sell'),
                ('devices', 'repair.png', 'Devices need checking', 'Offer trained repair services')]
    screen('match', 'Flip and Connect', 'interactive', task_template='memory_flip',
           question='Match each need with useful work.', hide_image_labels=False,
           pairs=[{'id': key, 'left': {'id': key + '-need', 'label': need, 'image_url': root + image},
                   'right': {'id': key + '-work', 'label': work}} for key, image, need, work in examples])
    screen('sort', 'Does It Meet the Need?', 'interactive', task_template='sort_groups',
           question='People need clothing repairs. Sort the ideas.',
           items=[{'id': 'alter', 'label': 'Alter clothes with the right skills', 'image_url': root + 'tailoring.png'},
                  {'id': 'repair', 'label': 'Check computers', 'image_url': root + 'repair.png'},
                  {'id': 'food', 'label': 'Sell snacks', 'image_url': root + 'baked-goods.png'},
                  {'id': 'sew', 'label': 'Repair loose seams with support', 'image_url': root + 'tailoring.png'}],
           categories=[{'id': 'fits', 'label': 'Meets this need'}, {'id': 'other', 'label': 'Meets a different need'}],
           sort_answers={'alter': 'fits', 'sew': 'fits', 'repair': 'other', 'food': 'other'})
    rows = [
        {'clue': 'Neighbours travel far to buy vegetables. Which idea responds to their need?', 'choices': ['Grow suitable vegetables to sell nearby', 'Repair their clothes', 'Print birthday cards'], 'answer': 'Grow suitable vegetables to sell nearby', 'feedback': 'A nearby vegetable seller could help.'},
        {'clue': 'A shirt needs shortening. Which service would help?', 'choices': ['Tailoring', 'Snack selling', 'Plant care'], 'answer': 'Tailoring', 'feedback': 'Tailoring can alter clothing.'},
        {'clue': 'People need repairs, but Ana has not learned electrical safety. What is a sensible next step?', 'choices': ['Seek training and qualified support', 'Start repairing electrical items alone', 'Promise every repair will succeed'], 'answer': 'Seek training and qualified support', 'feedback': 'An opportunity still needs safe skills and support.'},
    ]
    for index, row in enumerate(rows): mix_choices(row, 'PREV-03:story' + str(index))
    screen('stories', 'Community Detective', 'interactive', task_template='scenario_classifier',
           question='Read the situation and choose a useful response.', scenarios=rows)
    screen('check', 'Before Getting Started', 'interactive', task_template='multiple_choice',
           question='People want snacks. What should you check before offering them?',
           image_url=root + 'meal-preparation.png', choices=['Safe preparation, materials, skills, and support', 'Only the colour of the stall', 'Nothing: every idea succeeds'],
           answer='Safe preparation, materials, skills, and support')
    screen('reflect', 'An Idea to Explore', 'interactive', task_template='picture_choice', scored=False,
           selection_mode='single', correct_item_ids=[], self_report_field='activitiesToExplore',
           question='Which idea would you like to learn about? There are no wrong answers.',
           items=[{'id': key, 'label': work, 'image_url': root + image} for key, image, _, work in examples] +
                 [{'id': 'unsure', 'label': "I'm not sure yet", 'image_url': root + 'not-sure-yet.png'}],
           correct_feedback='You chose something to explore, not a verified work skill.')
    screen('hunt', 'Opportunity Word Hunt', 'interactive', task_template='word_search',
           question='Find the words that connect needs and useful work.', **puzzle(['NEED', 'WORK', 'HELP']))
    screen('complete', 'Lesson Complete', columns=1, template='visual_narrative', steps=[{
        'id': 'done', 'title': 'Notice, connect, and check', 'description': 'You explored how useful work can respond to community needs.',
        'image_url': '/assets/shared/thumbs-up.png'}])
    lesson['slides'] = slides
