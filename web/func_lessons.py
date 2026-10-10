"""Authoritative Cortex configuration for FUNC-01--FUNC-03."""

from .care_lessons import ADAPTATION_POLICY


def _screen(lesson_id, purpose, activity_type, title, **configuration):
    configuration.update({"lesson_id": lesson_id, "instructional_purpose": purpose, "adaptive_delivery": ADAPTATION_POLICY})
    return {"title": title, "type": activity_type, "configuration": configuration}


def _choice(lesson_id, purpose, title, question, choices, answer, correct, retry, **extra):
    return _screen(lesson_id, purpose, "interactive", title, task_template="multiple_choice", question=question, choices=choices, answer=answer, correct_feedback=correct, retry_feedback=retry, **extra)


FUNC_LESSONS = [
    {
        "lesson_id": "FUNC-01", "title": "Words I Use Every Day", "competency_code": "TP_EFP-0lf-NG-1",
        "competency": "Use words and expressions needed in everyday living",
        "description": "Use context-appropriate everyday expressions to communicate needs, boundaries, greetings, apologies, and appreciation.",
        "assessment": {"teacher_verification": "recommended", "valid_response_modes": ["speech", "pointing", "picture or AAC selection", "supported communication"], "spoken_language_exclusive": False},
        "slides": [
            _choice("FUNC-01", "opening scenario", "What Would You Say?", "You need assistance. What could you say?", ["Help, please.", "Goodbye.", "Welcome."], "Help, please.", "Yes. Help tells someone you need assistance.", "Which expression asks for assistance?"),
            _screen("FUNC-01", "expression stations", "image", "Everyday Expression Stations", template="visual_narrative", steps=[{"id": "help", "title": "Getting help", "description": "Help. Please."}, {"id": "needs", "title": "Communicating needs", "description": "Hungry. Eat. Drink. Water, please."}, {"id": "safety", "title": "Safety and boundaries", "description": "No. Stop."}, {"id": "social", "title": "Social interaction", "description": "Hello. Thank you. I'm sorry. Welcome."}], layout={"size": "wide", "preferred_columns": 4}),
            _screen("FUNC-01", "conversation modeling", "image", "Expressions in Conversation", template="visual_narrative", steps=[{"id": "offer", "title": "Can I help you?", "description": "Yes, please."}, {"id": "item", "title": "Someone gives you an item", "description": "Thank you."}, {"id": "assist", "title": "You need assistance", "description": "Help, please."}], asset_placeholders=[{"purpose": "Three contextual conversation scenes with optional audio", "status": "placeholder"}]),
            _choice("FUNC-01", "guided thanks", "Complete the Conversation", "Someone gives you a requested item. What could you say?", ["Thank you.", "Stop.", "Hungry."], "Thank you.", "Correct. Thank you shows appreciation.", "Which expression shows appreciation?"),
            _choice("FUNC-01", "boundary communication", "Communicate a Boundary", "Someone is doing something you want stopped. What can you say?", ["Stop.", "Welcome.", "Go."], "Stop.", "Correct. Stop clearly communicates the boundary.", "Choose the direct safety or boundary expression."),
            _choice("FUNC-01", "greeting", "Meet Someone", "You meet someone at school. Which expression is a greeting?", ["Hello.", "I'm sorry.", "No."], "Hello.", "Correct. Hello is a greeting.", "Which expression greets another person?"),
            _screen("FUNC-01", "two-turn application", "interactive", "A Two-Turn School Conversation", task_template="sequence_order", question="Ask for help finding materials, then respond after receiving them.", items=[{"id": "help", "label": "Help, please."}, {"id": "thanks", "label": "Thank you."}], correct_order=["help", "thanks"], correct_feedback="Correct. Ask for help, then thank the person.", retry_feedback="First communicate the need, then respond after receiving help."),
            _screen("FUNC-01", "completion", "image", "Everyday Communication Complete", template="visual_narrative", steps=[{"id": "summary", "title": "Match words to what you need", "description": "Use expressions for needs, boundaries, and social responses."}], assessment_metadata={"real_world_verification": "recommended"}),
        ],
    },
    {
        "lesson_id": "FUNC-02", "title": "Money Up to Twenty Pesos", "competency_code": "TP_MFP-nv-NG-31",
        "competency": "Recognize coins and bills up to Php20 and their notations",
        "description": "Recognize selected Philippine currency denominations up to twenty pesos and match them to their written notation.",
        "assessment": {"teacher_verification": "recommended", "digital_scope": "Recognition only; excludes counting sets, purchases, comparisons of totals, and calculating change.", "verified_currency_assets_required": True},
        "slides": [
            _choice("FUNC-02", "opening recognition", "Money Desk: What Money Is This?", "What value does the displayed money represent?", ["₱5", "₱10", "₱20"], "₱20", "Correct. This represents twenty pesos.", "Look at the denomination shown."),
            _screen("FUNC-02", "currency gallery", "image", "Currency Gallery", template="visual_narrative", steps=[{"id": "five", "title": "Five pesos — ₱5"}, {"id": "ten", "title": "Ten pesos — ₱10"}, {"id": "twenty", "title": "Twenty pesos — ₱20"}], layout={"size": "wide", "preferred_columns": 3}),
            _screen("FUNC-02", "notation modeling", "image", "Image → Value → Notation", template="visual_narrative", steps=[{"id": "example", "title": "Ten pesos", "description": "Its notation is ₱10."}]),
            _screen("FUNC-02", "notation matching", "interactive", "Match the Money", task_template="matching_pairs", question="Match each denomination with its notation.", pairs=[{"id": "five", "left": {"id": "five-money", "label": "Five-peso currency"}, "right": {"id": "five-label", "label": "₱5"}}, {"id": "ten", "left": {"id": "ten-money", "label": "Ten-peso currency"}, "right": {"id": "ten-label", "label": "₱10"}}, {"id": "twenty", "left": {"id": "twenty-money", "label": "Twenty-peso currency"}, "right": {"id": "twenty-label", "label": "₱20"}}], correct_feedback="Correct. Each denomination matches its notation.", retry_feedback="Look at the denomination, then find the written amount."),
            _screen("FUNC-02", "twenty-peso recognition", "interactive", "Find ₱20", task_template="picture_choice", question="Select the money that represents twenty pesos.", items=[{"id": "five", "label": "₱5"}, {"id": "ten", "label": "₱10"}, {"id": "twenty", "label": "₱20"}], correct_item_ids=["twenty"], correct_feedback="Correct. This represents ₱20.", retry_feedback="Look for the twenty-peso denomination."),
            _screen("FUNC-02", "ten-peso recognition", "interactive", "Find ₱10", task_template="picture_choice", question="Select the money that represents ten pesos.", items=[{"id": "five", "label": "₱5"}, {"id": "ten", "label": "₱10"}, {"id": "twenty", "label": "₱20"}], correct_item_ids=["ten"], correct_feedback="Correct. This represents ₱10.", retry_feedback="Look for the ten-peso denomination."),
            _choice("FUNC-02", "notation check", "Choose the Notation", "Which notation matches the displayed five-peso money?", ["₱5", "₱10", "₱20"], "₱5", "Correct. Five pesos is written ₱5.", "Choose the same written value."),
            _screen("FUNC-02", "completion", "image", "Money Recognition Complete", template="visual_narrative", steps=[{"id": "summary", "title": "See the money, recognize its value", "description": "Match currency with its denomination and notation."}], assessment_metadata={"transaction_skills_assessed": False}),
        ],
    },
    {
        "lesson_id": "FUNC-03", "title": "Tell Time Using Clocks", "competency_code": "TP_MFP-me-NG-2",
        "competency": "Tell time in hours and minutes, including a.m. and p.m., using analog and digital clocks",
        "description": "Read selected digital and analog times and connect them with daily schedules and a.m./p.m. periods.",
        "assessment": {"teacher_verification": "recommended", "mastery_threshold": "Panorama/SPED must determine", "staged_difficulty": ["whole hours", "common minute intervals", "broader combinations", "analog/digital with a.m./p.m."]},
        "slides": [
            _choice("FUNC-03", "daily schedule opening", "My Day on Time", "Your morning begins at 7:00 a.m. What time is shown?", ["7:00 a.m.", "7:00 p.m.", "3:00 p.m."], "7:00 a.m.", "Correct. The time is 7:00 a.m.", "Read the hour, minutes, and period.", asset_placeholders=[{"purpose": "Morning scene with matching analog and digital clocks", "status": "placeholder"}]),
            _screen("FUNC-03", "digital instruction", "image", "Read Digital Time", template="visual_narrative", steps=[{"id": "morning", "title": "8:15 a.m.", "description": "8 is the hour, 15 is the minutes, and a.m. indicates morning."}, {"id": "afternoon", "title": "2:30 p.m.", "description": "2 is the hour, 30 is the minutes, and p.m. indicates afternoon."}]),
            _screen("FUNC-03", "analog instruction", "image", "Read an Analog Clock", template="visual_narrative", steps=[{"id": "hour", "title": "Short hand", "description": "Shows the hour."}, {"id": "minute", "title": "Long hand", "description": "Shows the minutes."}, {"id": "face", "title": "Clock numbers", "description": "Show where the hands point."}], asset_placeholders=[{"purpose": "Approved analog clock face and hand diagrams", "status": "placeholder"}]),
            _screen("FUNC-03", "analog digital matching", "interactive", "Match Analog and Digital Time", task_template="matching_pairs", question="Match each analog representation with the digital time.", pairs=[{"id": "seven", "left": {"id": "analog-seven", "label": "Analog clock: 7:00"}, "right": {"id": "digital-seven", "label": "7:00 a.m."}}, {"id": "twelve", "left": {"id": "analog-twelve", "label": "Analog clock: 12:00"}, "right": {"id": "digital-twelve", "label": "12:00 p.m."}}, {"id": "three", "left": {"id": "analog-three", "label": "Analog clock: 3:00"}, "right": {"id": "digital-three", "label": "3:00 p.m."}}], correct_feedback="Correct. Each analog representation matches the digital time.", retry_feedback="Check the hour first, then the minutes.", asset_placeholders=[{"purpose": "Three analog clock representations", "status": "placeholder"}]),
            _screen("FUNC-03", "time period classification", "interactive", "A.M. or P.M.?", task_template="sort_groups", question="Sort each instructional example by its written period.", items=[{"id": "breakfast", "label": "Breakfast at 7:00 a.m."}, {"id": "morning", "label": "Morning activity at 8:00 a.m."}, {"id": "afternoon", "label": "Afternoon activity at 3:00 p.m."}, {"id": "sleep", "label": "Getting ready to sleep at 9:00 p.m."}], categories=[{"id": "am", "label": "a.m."}, {"id": "pm", "label": "p.m."}], sort_answers={"breakfast": "am", "morning": "am", "afternoon": "pm", "sleep": "pm"}, correct_feedback="Correct. You identified the written periods.", retry_feedback="Look at the a.m. or p.m. label."),
            _choice("FUNC-03", "digital reading check", "Read the Digital Clock", "The display reads 10:30 a.m. Which answer matches?", ["10:30 a.m.", "10:00 a.m.", "3:10 p.m."], "10:30 a.m.", "Correct. The time is 10:30 a.m.", "Check the hour, minutes, and period."),
            _choice("FUNC-03", "schedule application", "Find the Scheduled Time", "Your activity begins at 2:30 p.m. Which label matches?", ["2:30 p.m.", "2:30 a.m.", "3:20 p.m."], "2:30 p.m.", "Correct. You found the scheduled time.", "Match the hour, minutes, and period.", asset_placeholders=[{"purpose": "Three analog clock choices", "status": "placeholder"}]),
            _screen("FUNC-03", "completion", "image", "Daily Schedule Complete", template="visual_narrative", steps=[{"id": "summary", "title": "Know when activities happen", "description": "Clocks show hours and minutes; a.m. and p.m. identify the time period."}], assessment_metadata={"real_world_verification": "recommended"}),
        ],
    },
]


from .func03_refresh import upgrade_func03
upgrade_func03(FUNC_LESSONS)
# Concrete contextual pictures for every communication screen.
_communication = '/assets/functional-academics/func-01/'
_images = ['needs-assistance', None, None, 'show-gratitude', 'communicate-boundaries', 'social-interaction', None, None]
for screen, image in zip(FUNC_LESSONS[0]['slides'], _images):
    if image:
        screen['configuration'].update(image_url=_communication + image + '.png', alt_text=screen['title'])
FUNC_LESSONS[0]['slides'][1]['configuration']['steps'][1].update(
    image_url=_communication + 'communicate-hunger.png', alt_text='Communicating hunger and needs')
FUNC_LESSONS[0]['slides'][7]['configuration']['steps'][0].update(
    image_url=_communication + 'social-interaction.png', alt_text='Everyday social communication')
from .lesson_assets import attach_definitions
attach_definitions(FUNC_LESSONS)
