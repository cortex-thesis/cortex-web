"""Garden-specific practice using existing assets; seed quality remains unverified."""
from .care_lessons import ADAPTATION_POLICY
from .lesson_games import mix_choices

ROOT = '/assets/livelihood/common/'


def upgrade_live23(definitions):
    for lesson in definitions[1:]:
        lid = lesson['lesson_id']
        slides = []

        def screen(key, title, kind='image', columns=3, **config):
            config.update(lesson_id=lid, screen_key=key, adaptive_delivery=ADAPTATION_POLICY,
                          digital_mastery_claim=False, layout={'size': 'wide', 'preferred_columns': columns})
            if kind == 'interactive':
                config.setdefault('correct_feedback', 'You completed the digital practice.')
                config.setdefault('retry_feedback', 'Look at the task and try again.')
                config.setdefault('evidence_role', 'self_report' if config.get('scored') is False else 'primary_digital')
                mix_choices(config, lid + ':' + key)
            slides.append({'title': title, 'type': kind, 'configuration': config})

        def mission(key, label, instruction, answer, action, image, hint, feedback):
            return {'id': key, 'label': label, 'instruction': instruction, 'answer': answer,
                    'action_label': action, 'image_url': ROOT + image, 'hint': hint, 'feedback': feedback}

        def stories(rows):
            for index, row in enumerate(rows):
                mix_choices(row, lid + ':story' + str(index))
            screen('stories', 'What Would You Do?', 'interactive', task_template='scenario_classifier',
                   question='Solve one garden situation at a time.', scenarios=rows)

        def finish(title, summary, image, **metadata):
            screen('complete', title, columns=1, template='visual_narrative', steps=[{
                'id': 'done', 'title': summary, 'description': 'Practice with real materials and appropriate support.',
                'image_url': ROOT + image}], assessment_metadata={'physical_operation_verified': False, **metadata})

        if lid == 'LIVE-02':
            tools = [{'id': key, 'label': label, 'image_url': ROOT + image} for key, label, image in [
                ('trowel', 'Hand trowel', 'hand-trowel.png'), ('water', 'Watering can', 'watering-can.png'),
                ('measure', 'Measuring tape', 'measuring-tape.png')]]
            screen('goal', 'Choose the Right Garden Tool', columns=1, template='visual_narrative', steps=[{
                'id': 'goal', 'title': "Today's goal", 'description': 'Match a garden task with the tool it needs.',
                'image_url': ROOT + 'gardening.png'}])
            screen('discuss', 'Meet Your Tool Bench', template='visual_narrative', discussion=True,
                   narration_script='A hand trowel helps with small soil work. A watering can gives water to plants. A measuring tape checks length. Ask for help with unfamiliar tools. These pictures do not replace safe, supervised practice.',
                   steps=[{'id': item['id'], 'title': item['label'], 'description': description, 'image_url': item['image_url']}
                          for item, description in zip(tools, ['Small soil work.', 'Giving plants water.', 'Checking length.'])])
            screen('video', 'Watch: Garden Tools', 'video', template='instructional_video',
                   media_url='https://www.youtube.com/embed/mYaEBgeebf4', content_label='Gardening tools',
                   content_description='Look for tools used for soil, water, and measuring.',
                   video_review_status='Topic fit confirmed from public title; full viewing and expert review pending')
            screen('workbench', 'Garden Workbench', 'interactive', task_template='garden_mission',
                   question='Choose a tool, then tap or drop it on the target.', items=tools, missions=[
                       mission('soil', 'Soil work', 'Loosen a small patch of soil. Which tool fits?', 'trowel', 'Use tool on the soil', 'planting.png', 'Choose the tool for small digging and soil work.', 'Trowel matched to soil work.'),
                       mission('water', 'Water plants', 'Give water to a seedling. Choose the watering tool.', 'water', 'Use tool on the seedling', 'plants.png', 'Choose the tool that carries and pours water.', 'Watering can matched to watering.'),
                       mission('length', 'Measure', 'Check the length of a garden bed. Choose the measuring tool.', 'measure', 'Use tool on the garden bed', 'gardening-goal.png', 'Choose the tool that shows length.', 'Measuring tape matched to length.')],
                   correct_feedback='Three task–tool matches complete. Real tool use still needs safe practice.')
            for row, scene in zip(slides[-1]['configuration']['missions'], ('soil', 'water', 'measure')):
                row['scene'] = scene
            screen('kit', 'Pack for Soil and Water Work', 'interactive', task_template='garden_kit',
                   question='Choose the two tools needed for small soil work and watering.', workspace_label='Garden kit',
                   items=tools + [{'id': 'pencil', 'label': 'Pencil', 'image_url': '/assets/care/care-01/pencil.png'}], correct_item_ids=['trowel', 'water'],
                   retry_feedback='Pack a soil tool and a watering tool; measuring is not part of this task.')
            screen('sequence', 'Build a Safe Tool Routine', 'interactive', task_template='sequence_order',
                   question='Arrange the routine from first to last.', items=[
                       {'id': 'task', 'label': 'Check the task and ask for guidance', 'image_url': ROOT + 'checklist.png'},
                       {'id': 'tool', 'label': 'Choose the suitable tool', 'image_url': ROOT + 'hand-trowel.png'},
                       {'id': 'use', 'label': 'Use it safely with support', 'image_url': ROOT + 'gardening.png'}],
                   correct_order=['task', 'tool', 'use'])
            stories([
                {'clue': 'The task is watering. Someone offers a measuring tape. What should you do?', 'choices': ['Choose a watering can instead', 'Use the tape to pour water', 'Ignore the task'], 'answer': 'Choose a watering can instead', 'feedback': 'Choose by function, not just availability.'},
                {'clue': 'You have never used a garden tool before. What is a safe first step?', 'choices': ['Ask for guidance and a demonstration', 'Try it without checking', 'Use any tool quickly'], 'answer': 'Ask for guidance and a demonstration', 'feedback': 'Get support before unfamiliar tool use.'}])
            screen('reflect', 'Which Task Would You Practice?', 'interactive', task_template='picture_choice', scored=False,
                   selection_mode='single', correct_item_ids=[], self_report_field='gardenToolPractice',
                   question='Choose a task to explore. No wrong answers.', items=[
                       {'id': 'soil', 'label': 'Soil work', 'image_url': ROOT + 'hand-trowel.png'},
                       {'id': 'water', 'label': 'Watering', 'image_url': ROOT + 'watering-can.png'},
                       {'id': 'measure', 'label': 'Measuring', 'image_url': ROOT + 'measuring-tape.png'},
                       {'id': 'unsure', 'label': "I'm not sure yet", 'image_url': '/assets/pre-vocational/common/not-sure-yet.png'}])
            finish('Tool Bench Mission Complete', 'Check the task. Choose the tool. Use it safely.', 'gardening.png')
        else:
            screen('goal', 'Become a Seed Inspector', columns=1, template='visual_narrative', steps=[{
                'id': 'goal', 'title': "Today's goal", 'description': 'Practice inspecting and comparing before choosing seeds.',
                'image_url': ROOT + 'seed-inspection.png'}])
            screen('discuss', 'Look, Compare, Check', template='visual_narrative', discussion=True,
                   narration_script='Look closely at the seed and its information. Compare using the criteria your teacher has taught. Ask for confirmation if you are unsure. An illustration alone cannot prove that a seed is good or will grow.',
                   steps=[{'id': 'look', 'title': 'Look closely', 'description': 'Inspect the seed and its information.', 'image_url': ROOT + 'seed-inspection.png'},
                          {'id': 'compare', 'title': 'Compare', 'description': 'Use the teacher’s taught criteria.', 'image_url': ROOT + 'checklist.png'},
                          {'id': 'check', 'title': 'Check before choosing', 'description': 'Ask when unsure.', 'image_url': ROOT + 'choose-seed.png'}])
            screen('video', 'Watch: Comparing Seeds', 'video', template='instructional_video',
                   media_url='https://www.youtube.com/embed/uD6hCk58dVU', content_label='Comparing seed similarities and differences',
                   content_description='Notice similarities and differences—not proof of seed quality or growth.',
                   video_review_status='Comparison topic confirmed from public title; embedded playback, full viewing and expert review pending',
                   assessment_metadata={'seed_quality_demonstration': False})
            actions = [{'id': key, 'label': label, 'image_url': ROOT + image} for key, label, image in [
                ('look', 'Look closely', 'seed-inspection.png'), ('compare', 'Compare with criteria', 'checklist.png'),
                ('ask', 'Ask for confirmation', 'choose-seed.png')]]
            screen('inspector', 'Seed Inspector Workbench', 'interactive', task_template='garden_mission',
                   question='Choose an inspection action, then apply it to the target.', items=actions, missions=[
                       mission('inspect', 'Inspect', 'Start with the seed sample. What should you do first?', 'look', 'Inspect the sample', 'seed-variety.png', 'Start by looking closely, not choosing immediately.', 'Sample inspected—not yet judged.'),
                       mission('compare', 'Compare', 'Now use the teacher’s criteria to compare the sample.', 'compare', 'Compare with the reference', 'checklist.png', 'Use the taught criteria, not a guess from colour.', 'Comparison step practiced.'),
                       mission('confirm', 'Confirm', 'You are unsure whether the seed meets the criteria. What next?', 'ask', 'Check with the teacher', 'choose-seed.png', 'Ask for confirmation before choosing when unsure.', 'Confirmation requested before selection.')],
                   correct_feedback='Inspection routine complete. This does not certify seed quality.',
                   assessment_metadata={'seed_quality_verified': False, 'final_assessment_locked': True})
            inspection = slides[-1]['configuration']
            inspection['screen_key'] = 'inspection-tray-v2'
            inspection['question'] = 'Practice drawings only: look closely, compare, then check what guidance is needed.'
            inspection['items'] = [{'id': 'look', 'label': 'Enlarge samples'},
                                   {'id': 'compare', 'label': 'Show side by side'},
                                   {'id': 'ask', 'label': 'Open guidance card'}]
            inspection['missions'] = [
                {'id': 'inspect', 'label': 'Look', 'instruction': 'Enlarge the two practice drawings on the tray.',
                 'answer': 'look', 'action_label': 'Enlarge the tray', 'scene': 'inspect', 'available_item_ids': ['look'],
                 'hint': 'Use the enlargement action.', 'feedback': 'You can see the drawings more closely. They are not real quality-test samples.'},
                {'id': 'compare', 'label': 'Compare', 'instruction': 'Place the enlarged drawings side by side.',
                 'answer': 'compare', 'action_label': 'Compare the drawings', 'scene': 'compare', 'available_item_ids': ['compare'],
                 'hint': 'Use the comparison action.', 'feedback': 'These drawings differ in shape. Shape alone does not prove quality or whether a seed will grow.'},
                {'id': 'confirm', 'label': 'Check', 'instruction': 'Open the guidance card before making a quality decision.',
                 'answer': 'ask', 'action_label': 'Check the guidance card', 'scene': 'reference', 'available_item_ids': ['ask'],
                 'hint': 'Open the guidance card.', 'feedback': 'Ask your teacher for approved samples and selection criteria. No quality decision has been made.'}]
            inspection['correct_feedback'] = 'Inspection practice complete. Seed-quality selection remains locked until samples and criteria are approved.'
            inspection['evidence_role'] = 'supporting'
            screen('sort', 'Helpful Inspection or Guessing?', 'interactive', task_template='sort_groups',
                   question='Sort the actions—not the quality of these seed pictures.',
                   items=[{'id': 'look', 'label': 'Inspect closely', 'image_url': ROOT + 'seed-inspection.png'},
                          {'id': 'compare', 'label': 'Compare with taught criteria', 'image_url': ROOT + 'checklist.png'},
                          {'id': 'guess', 'label': 'Choose just because the picture is pretty'},
                          {'id': 'all', 'label': 'Assume every seed will grow'}],
                   categories=[{'id': 'helpful', 'label': 'Helpful inspection'}, {'id': 'guess', 'label': 'Guessing'}],
                   sort_answers={'look': 'helpful', 'compare': 'helpful', 'guess': 'guess', 'all': 'guess'})
            stories([
                {'clue': 'Two seed pictures look different. Can the pictures alone prove which will grow?', 'choices': ['No; use taught criteria and appropriate checks', 'Yes; pick the brighter picture', 'Every pictured seed will grow'], 'answer': 'No; use taught criteria and appropriate checks', 'feedback': 'Illustrations are not a quality test.'},
                {'clue': 'You do not understand one of the selection criteria. What should you do?', 'choices': ['Ask the teacher to demonstrate it', 'Choose randomly', 'Skip inspection'], 'answer': 'Ask the teacher to demonstrate it', 'feedback': 'Get the criteria clarified before selecting.'}])
            screen('sequence', 'Build the Inspector Routine', 'interactive', task_template='sequence_order',
                   question='Put the inspection routine in order.', items=[
                       {'id': 'inspect', 'label': 'Inspect the sample', 'image_url': ROOT + 'seed-inspection.png'},
                       {'id': 'compare', 'label': 'Compare using taught criteria', 'image_url': ROOT + 'checklist.png'},
                       {'id': 'select', 'label': 'Select after checking; ask if unsure', 'image_url': ROOT + 'choose-seed.png'}],
                   correct_order=['inspect', 'compare', 'select'])
            screen('reflect', 'What Support Would Help?', 'interactive', task_template='picture_choice', scored=False,
                   selection_mode='single', correct_item_ids=[], self_report_field='seedInspectionSupport',
                   question='Choose the support you would like. No wrong answers.', items=[
                       {'id': 'demo', 'label': 'A close-up demonstration', 'image_url': ROOT + 'seed-inspection.png'},
                       {'id': 'reference', 'label': 'A clear reference card', 'image_url': ROOT + 'checklist.png'},
                       {'id': 'practice', 'label': 'Practice with the teacher', 'image_url': ROOT + 'planting.png'},
                       {'id': 'unsure', 'label': "I'm not sure yet", 'image_url': '/assets/pre-vocational/common/not-sure-yet.png'}])
            finish('Seed Inspector Practice Complete', 'Inspect. Compare. Check before choosing.', 'seed-inspection.png', final_assessment_locked=True, seed_quality_verified=False)
        lesson['slides'] = slides
