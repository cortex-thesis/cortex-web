"""Authoritative Cortex configuration for the validated CARE-01--CARE-03 plans."""

ADAPTATION_POLICY = {
    "focused": {
        "strategy": "steady_instruction", "pacing": "normal", "visible_scope": "full",
        "cue": None, "visual_intensity": 3, "audio_intensity": 3,
    },
    "distracted": {
        "strategy": "attention_reengagement", "pacing": "normal", "visible_scope": "reduced",
        "cue": "Look at the current item and choose the next small step.",
        "visual_intensity": 2, "audio_intensity": 2,
    },
    "relaxed": {
        "strategy": "gentle_reactivation", "pacing": "slow", "visible_scope": "full",
        "cue": "Take your time. Choose when you are ready.",
        "visual_intensity": 2, "audio_intensity": 2,
    },
    "overstimulated": {
        "strategy": "sensory_cooldown", "pacing": "slow", "visible_scope": "one_step_or_two_choices",
        "cue": "We will do one small step at a time.",
        "visual_intensity": 1, "audio_intensity": 1, "remove_nonessential_media": True,
    },
}


def _meta(lesson_id, purpose, *, required=False, narration=False):
    return {
        "lesson_id": lesson_id, "purpose": purpose, "required": required,
        "optional_narration": narration, "status": "placeholder",
    }


def _screen(lesson_id, purpose, activity_type, title, **configuration):
    configuration.update({
        "lesson_id": lesson_id,
        "instructional_purpose": purpose,
        "adaptive_delivery": ADAPTATION_POLICY,
    })
    return {"title": title, "type": activity_type, "configuration": configuration}


CARE_LESSONS = [
    {
        "lesson_id": "CARE-01", "title": "Wash Hands Step by Step",
        "competency_code": "TPCS_HC-hh-NG-3",
        "competency": "Demonstrate proper hand washing",
        "description": "Learn the materials and ordered steps for proper handwashing, then practise in a real setting with teacher observation.",
        "assessment": {
            "digital_scope": "Knowledge of materials, sequence, and everyday application only.",
            "teacher_verification": "required",
            "mastery_note": "Digital completion is not proof of physical handwashing performance. A SPED teacher must observe the real routine.",
        },
        "slides": [
            _screen("CARE-01", "orientation", "image", "Wash Hands Step by Step", template="visual_narrative", steps=[
                {"id": "goal", "title": "Today’s goal", "description": "Use water and soap and follow the handwashing steps in order."},
            ], layout={"size": "standard", "preferred_columns": 1}, asset_placeholders=[_meta("CARE-01", "Age-respectful lesson orientation at a sink", narration=True)]),
            _screen("CARE-01", "hook", "interactive", "Before Eating", task_template="multiple_choice",
                    question="You are about to eat after an activity, and your hands are dirty. What should you do first?",
                    choices=["Wash your hands", "Continue eating with dirty hands"], answer="Wash your hands",
                    correct_feedback="Correct. Wash your hands before eating.", retry_feedback="Look again. Your hands are dirty before snack time.",
                    layout={"size": "compact", "preferred_columns": 2}),
            _screen("CARE-01", "materials instruction", "interactive", "Choose What You Need", task_template="picture_choice",
                    question="Which materials are needed for proper handwashing?", items=[
                        {"id": "water", "label": "Clean water"}, {"id": "soap", "label": "Soap"},
                        {"id": "drying", "label": "Clean drying material"}, {"id": "pencil", "label": "Pencil"}],
                    correct_item_ids=["water", "soap", "drying"], selection_mode="multiple",
                    correct_feedback="Correct. Use clean water, soap, and a clean way to dry your hands.",
                    retry_feedback="Try again. Choose the things used at the sink to wash and dry hands.",
                    asset_placeholders=[_meta("CARE-01", "Realistic handwashing-material images", required=True, narration=True)]),
            _screen("CARE-01", "modeled demonstration", "video", "Watch the Handwashing Routine", template="instructional_video",
                    content_label="CARE-01 handwashing demonstration video", content_description="Watch what happens first, next, and last.",
                    duration_seconds=60, action_label="Continue to the steps",
                    asset_placeholders=[_meta("CARE-01", "Model the complete handwashing procedure", required=True, narration=True)]),
            _screen("CARE-01", "visual step sequence", "image", "The Steps in Order", template="visual_narrative", steps=[
                {"id": "wet", "title": "Wet", "description": "Wet the hands with clean water."},
                {"id": "soap", "title": "Apply soap", "description": "Put soap on the hands."},
                {"id": "rub", "title": "Rub thoroughly", "description": "Rub palms, backs, between fingers, fingertips, nails, and thumbs."},
                {"id": "rinse", "title": "Rinse", "description": "Rinse with clean water."},
                {"id": "dry", "title": "Dry", "description": "Dry the hands properly."}],
                    layout={"size": "wide", "preferred_columns": 5},
                    asset_placeholders=[_meta("CARE-01", "Five realistic handwashing step illustrations", required=True, narration=True)]),
            _screen("CARE-01", "guided practice", "interactive", "Put the Steps in Order", task_template="sequence_order",
                    question="Put the handwashing steps in the correct order.", items=[
                        {"id": "rub", "label": "Rub thoroughly"}, {"id": "dry", "label": "Dry hands"},
                        {"id": "wet", "label": "Wet hands"}, {"id": "rinse", "label": "Rinse hands"}, {"id": "soap", "label": "Apply soap"}],
                    correct_order=["wet", "soap", "rub", "rinse", "dry"],
                    correct_feedback="Correct. You placed the handwashing steps in order.",
                    retry_feedback="Check the order again. Wet your hands before using soap.",
                    layout={"size": "wide", "preferred_columns": 5}, asset_placeholders=[_meta("CARE-01", "Ordering cards using the step illustrations", required=True)]),
            _screen("CARE-01", "independent knowledge check", "interactive", "Which Step Comes First?", task_template="multiple_choice",
                    question="The steps shown are: apply soap, wet hands, rub, rinse. Which step should come first?",
                    choices=["Wet hands", "Apply soap", "Rub hands", "Rinse hands"], answer="Wet hands",
                    correct_feedback="Correct. Wet the hands before applying soap.", retry_feedback="Check the order again. Wet your hands before using soap."),
            _screen("CARE-01", "real-life application", "interactive", "After Gardening", task_template="multiple_choice",
                    question="You are about to eat after gardening. What should you do first?",
                    choices=["Wash your hands", "Start eating", "Put away your shoes"], answer="Wash your hands",
                    correct_feedback="Correct. Wash your hands before eating.", retry_feedback="Think about what your hands need after gardening."),
            _screen("CARE-01", "summary and completion", "image", "Remember the Routine", template="visual_narrative", steps=[
                {"id": "summary", "title": "Wash properly", "description": "Use water and soap, wash the whole hand carefully, rinse, and dry."},
                {"id": "verify", "title": "Show the routine", "description": "Complete the real handwashing routine with your teacher."}],
                    assessment_metadata={"teacher_verification": "required", "digital_mastery_claim": False}),
        ],
    },
    {
        "lesson_id": "CARE-02", "title": "Healthy Food Choices", "competency_code": "TPCS_NU-hl-NG-1",
        "competency": "Identify healthful from less healthful foods",
        "description": "Recognize and classify familiar foods as healthful or less healthful in everyday meal and snack situations.",
        "assessment": {"teacher_verification": "optional", "digital_scope": "Directly assesses recognition and classification."},
        "slides": [
            _screen("CARE-02", "orientation", "image", "Healthy Food Choices", template="visual_narrative", steps=[{"id": "goal", "title": "Today’s goal", "description": "Recognize healthful and less healthful foods."}], asset_placeholders=[_meta("CARE-02", "Realistic Philippine meal or snack setting", narration=True)]),
            _screen("CARE-02", "hook", "interactive", "Choose a Snack", task_template="picture_choice", question="Which choice would better support a healthy snack?", items=[{"id": "banana", "label": "Banana"}, {"id": "candy", "label": "Highly sugary candy"}], correct_item_ids=["banana"], correct_feedback="Correct. A banana is a healthful snack choice.", retry_feedback="Look again. Which choice would better support a healthy snack?", asset_placeholders=[_meta("CARE-02", "Neutral, realistic food images", required=True)]),
            _screen("CARE-02", "primary instruction", "image", "Healthful and Less Healthful", template="visual_narrative", steps=[{"id": "healthful", "title": "Healthful", "description": "Foods that support the body and can be chosen more often."}, {"id": "less", "title": "Less healthful", "description": "Foods that are better chosen less often."}], asset_placeholders=[_meta("CARE-02", "Paired food comparison images", required=True, narration=True)]),
            _screen("CARE-02", "modeling", "image", "See How to Classify", template="visual_narrative", steps=[{"id": "banana", "title": "Banana → Healthful", "description": "Place the banana under Healthful."}, {"id": "candy", "title": "Highly sugary candy → Less Healthful", "description": "Place the candy under Less Healthful."}], asset_placeholders=[_meta("CARE-02", "Modeled banana and candy classification", required=True)]),
            _screen("CARE-02", "guided classification", "interactive", "Sort the Foods", task_template="sort_groups", question="Place each food under Healthful or Less Healthful.", items=[{"id": "banana", "label": "Banana"}, {"id": "vegetables", "label": "Vegetables"}, {"id": "water", "label": "Water"}, {"id": "candy", "label": "Highly sugary candy"}, {"id": "softdrink", "label": "Very sugary soft drink"}], categories=[{"id": "healthful", "label": "Healthful"}, {"id": "less", "label": "Less Healthful"}], sort_answers={"banana": "healthful", "vegetables": "healthful", "water": "healthful", "candy": "less", "softdrink": "less"}, correct_feedback="Correct. You classified the foods as healthful or less healthful.", retry_feedback="Look again. Which choices would better support a healthy meal?", asset_placeholders=[_meta("CARE-02", "Culturally relevant, neutral food photographs or illustrations", required=True)]),
            _screen("CARE-02", "independent image selection", "interactive", "Choose the Healthful Food", task_template="picture_choice", question="Choose the healthful food.", items=[{"id": "fruit", "label": "Fresh fruit"}, {"id": "candy", "label": "Highly sugary candy"}, {"id": "chips", "label": "Heavily processed snack"}], correct_item_ids=["fruit"], correct_feedback="Correct. Fresh fruit is a healthful choice.", retry_feedback="Look again. Which choice would better support a healthy meal?", asset_placeholders=[_meta("CARE-02", "Three realistic food-choice images", required=True)]),
            _screen("CARE-02", "real-life application", "interactive", "Choose a Lunch Drink", task_template="multiple_choice", question="You need a drink with lunch. Which is the more healthful option?", choices=["Water", "Very sugary soft drink"], answer="Water", correct_feedback="Correct. Water is the more healthful choice.", retry_feedback="Look again. Which drink would better support a healthy meal?"),
            _screen("CARE-02", "summary and completion", "image", "Remember Your Choices", template="visual_narrative", steps=[{"id": "summary", "title": "Choose with care", "description": "Recognize healthful foods and choose them more often. Recognize less healthful foods and choose them less often."}]),
        ],
    },
    {
        "lesson_id": "CARE-03", "title": "Tools for Good Grooming", "competency_code": "TPCS_GG-gp-NG-2",
        "competency": "Recognize the different materials needed to maintain good grooming",
        "description": "Recognize common grooming materials, match them to their purposes, and select them for everyday situations.",
        "assessment": {"teacher_verification": "not_required", "digital_scope": "Recognition only; does not claim independent grooming performance."},
        "slides": [
            _screen("CARE-03", "orientation", "image", "Tools for Good Grooming", template="visual_narrative", steps=[{"id": "goal", "title": "Today’s goal", "description": "Recognize materials used for different grooming tasks."}], asset_placeholders=[_meta("CARE-03", "Age-respectful getting-ready scenario", narration=True)]),
            _screen("CARE-03", "hook", "interactive", "Getting Ready for School", task_template="picture_choice", question="Your hair needs to be arranged. Which material would you prepare?", items=[{"id": "comb", "label": "Comb"}, {"id": "toothbrush", "label": "Toothbrush"}, {"id": "trowel", "label": "Garden trowel"}], correct_item_ids=["comb"], correct_feedback="Correct. A comb is used for grooming the hair.", retry_feedback="Try again. Which material is used for the hair?", asset_placeholders=[_meta("CARE-03", "Realistic grooming-material images", required=True)]),
            _screen("CARE-03", "primary instruction", "image", "Materials and Their Purposes", template="visual_narrative", steps=[{"id": "toothbrush", "title": "Toothbrush", "description": "Used for cleaning the teeth."}, {"id": "comb", "title": "Comb or hairbrush", "description": "Used for arranging the hair."}, {"id": "clipper", "title": "Nail clipper", "description": "Used for trimming nails."}, {"id": "towel", "title": "Towel", "description": "Used for drying after washing or bathing."}], layout={"size": "wide", "preferred_columns": 4}, asset_placeholders=[_meta("CARE-03", "Labeled core grooming-material images", required=True, narration=True)]),
            _screen("CARE-03", "modeling", "image", "Match a Material to Its Purpose", template="visual_narrative", steps=[{"id": "model", "title": "Arrange hair → Comb", "description": "A toothbrush is not used to arrange hair. Choose a comb or hairbrush."}], asset_placeholders=[_meta("CARE-03", "Material-to-purpose model image", required=True)]),
            _screen("CARE-03", "guided matching", "interactive", "Match the Grooming Materials", task_template="matching_pairs", question="Match each material with what it is used for.", pairs=[{"id": "teeth", "left": {"id": "toothbrush", "label": "Toothbrush"}, "right": {"id": "clean-teeth", "label": "Clean teeth"}}, {"id": "hair", "left": {"id": "comb", "label": "Comb"}, "right": {"id": "arrange-hair", "label": "Arrange hair"}}, {"id": "nails", "left": {"id": "clipper", "label": "Nail clipper"}, "right": {"id": "trim-nails", "label": "Trim nails"}}, {"id": "dry", "left": {"id": "towel", "label": "Towel"}, "right": {"id": "dry-body", "label": "Dry after washing"}}], correct_feedback="Correct. Each grooming material matches its purpose.", retry_feedback="Try again. Think about what each material is used for.", asset_placeholders=[_meta("CARE-03", "Matching-card grooming images", required=True)]),
            _screen("CARE-03", "independent image selection", "interactive", "Choose an Item for Hair", task_template="picture_choice", question="Which item would you use to groom your hair?", items=[{"id": "comb", "label": "Comb or hairbrush"}, {"id": "toothbrush", "label": "Toothbrush"}, {"id": "towel", "label": "Towel"}], correct_item_ids=["comb"], correct_feedback="Correct. A comb or hairbrush is used for grooming hair.", retry_feedback="Try again. Which material is used for the hair?", asset_placeholders=[_meta("CARE-03", "Three grooming-material choice images", required=True)]),
            _screen("CARE-03", "scenario-based selection", "interactive", "Prepare to Clean Your Teeth", task_template="picture_choice", question="Which materials do you need to clean your teeth?", items=[{"id": "toothbrush", "label": "Toothbrush"}, {"id": "toothpaste", "label": "Toothpaste"}, {"id": "trowel", "label": "Garden trowel"}], correct_item_ids=["toothbrush", "toothpaste"], selection_mode="multiple", correct_feedback="Correct. Prepare a toothbrush and toothpaste.", retry_feedback="Try again. Choose the materials used for cleaning teeth.", asset_placeholders=[_meta("CARE-03", "Tooth-cleaning scenario images", required=True)]),
            _screen("CARE-03", "real-life application", "interactive", "Prepare a Grooming Kit", task_template="sort_groups", question="Sort each item by the grooming task it supports.", items=[{"id": "toothbrush", "label": "Toothbrush"}, {"id": "comb", "label": "Comb"}, {"id": "clipper", "label": "Nail clipper"}, {"id": "towel", "label": "Towel"}], categories=[{"id": "teeth", "label": "Clean teeth"}, {"id": "hair", "label": "Arrange hair"}, {"id": "nails", "label": "Trim nails"}, {"id": "dry", "label": "Dry after washing"}], sort_answers={"toothbrush": "teeth", "comb": "hair", "clipper": "nails", "towel": "dry"}, correct_feedback="Correct. You chose a suitable material for each grooming task.", retry_feedback="Check each task and choose the material made for it.", asset_placeholders=[_meta("CARE-03", "Grooming-kit scenario images", required=True)]),
            _screen("CARE-03", "summary and completion", "image", "Choose the Material for the Task", template="visual_narrative", steps=[{"id": "summary", "title": "Different tasks need different materials", "description": "Grooming materials help us take care of ourselves. Choose the material that matches the grooming task."}], assessment_metadata={"teacher_verification": "not_required", "performance_claim": False}),
        ],
    },
]



from .lesson_assets import attach_definitions
attach_definitions(CARE_LESSONS)
