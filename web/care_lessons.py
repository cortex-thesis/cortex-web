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
                {"id": "goal", "title": "Today’s goal", "description": "Use water and soap and follow the handwashing steps in order.", "image_url": "/assets/care/care-01/todays-goal.png", "alt_text": "Hands being washed thoroughly with soap and water"},
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
                    media_url="https://youtu.be/n6c0LRZcxSg?si=pbTHnbcAE-cexynQ",
                    layout={"size": "wide"},
                    asset_placeholders=[_meta("CARE-01", "Model the complete handwashing procedure", required=True, narration=True)]),
            _screen("CARE-01", "visual step sequence", "image", "The Steps in Order", template="visual_narrative", steps=[
                {"id": "wet", "title": "Wet", "description": "Wet the hands with clean water.", "image_url": "/assets/care/care-01/wet-hands.png", "alt_text": "Hands being wetted under clean running water"},
                {"id": "soap", "title": "Apply soap", "description": "Put soap on the hands.", "image_url": "/assets/care/care-01/apply-soap.png", "alt_text": "Soap being applied to a hand"},
                {"id": "rub", "title": "Rub thoroughly", "description": "Rub palms, backs, between fingers, fingertips, nails, and thumbs.", "image_url": "/assets/care/care-01/rub-thoroughly.png", "alt_text": "Hands rubbing thoroughly with soap"},
                {"id": "rinse", "title": "Rinse", "description": "Rinse with clean water.", "image_url": "/assets/care/care-01/rinse-hands.png", "alt_text": "Soapy hands being rinsed under clean running water"},
                {"id": "dry", "title": "Dry", "description": "Dry the hands properly.", "image_url": "/assets/care/care-01/dry-hands.png", "alt_text": "A clean hand after washing and drying"}],
                    layout={"size": "wide", "preferred_columns": 5},
                    asset_placeholders=[_meta("CARE-01", "Five realistic handwashing step illustrations", required=True, narration=True)]),
            _screen("CARE-01", "guided practice", "interactive", "Put the Steps in Order", task_template="sequence_order",
                    question="Put the handwashing steps in the correct order.", items=[
                        {"id": "rub", "label": "Rub thoroughly", "image_url": "/assets/care/care-01/rub-thoroughly.png", "alt_text": "Hands rubbing thoroughly with soap"}, {"id": "dry", "label": "Dry hands", "image_url": "/assets/care/care-01/dry-hands.png", "alt_text": "A clean hand after washing and drying"},
                        {"id": "wet", "label": "Wet hands", "image_url": "/assets/care/care-01/wet-hands.png", "alt_text": "Hands being wetted under clean running water"}, {"id": "rinse", "label": "Rinse hands", "image_url": "/assets/care/care-01/rinse-hands.png", "alt_text": "Soapy hands being rinsed under clean running water"}, {"id": "soap", "label": "Apply soap", "image_url": "/assets/care/care-01/apply-soap.png", "alt_text": "Soap being applied to a hand"}],
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
                {"id": "summary", "title": "Wash properly", "description": "Use water and soap, wash the whole hand carefully, rinse, and dry.", "image_url": "/assets/care/care-01/rub-thoroughly.png", "alt_text": "Hands rubbing thoroughly with soap"},
                {"id": "verify", "title": "Show the routine", "description": "Complete the real handwashing routine with your teacher.", "image_url": "/assets/care/care-01/todays-goal.png", "alt_text": "Hands being washed thoroughly with soap and water"}],
                    assessment_metadata={"teacher_verification": "required", "digital_mastery_claim": False}),
        ],
    },
    {
        "lesson_id": "CARE-02", "title": "Healthy Food Choices", "competency_code": "TPCS_NU-hl-NG-1",
        "competency": "Identify healthful from less healthful foods",
        "description": "Explore how familiar Go, Grow, and Glow foods support varied healthful choices, then distinguish foods to choose more often from those to choose less often.",
        "assessment": {
            "teacher_verification": "optional",
            "digital_scope": "Primary scoring assesses healthful versus less healthful recognition. Go, Grow, and Glow grouping is supporting instructional evidence.",
        },
        "slides": [
            _screen("CARE-02", "orientation", "image", "Healthy Food Mission", template="visual_narrative", steps=[
                {"id": "goal", "title": "Explore, compare, choose", "description": "Learn how healthful foods help in different ways, then make thoughtful meal and snack choices.", "image_url": "/assets/care/care-02/healthy-living.png", "alt_text": "Heart above green leaves representing healthy living"},
            ], layout={"size": "standard", "preferred_columns": 1}),
            _screen("CARE-02", "meal exploration", "image", "What Is on the Plate?", template="visual_narrative", steps=[
                {"id": "meal", "title": "A varied meal", "description": "Rice, fish, vegetables, fruit, and water can support the body in different ways.", "image_url": "/assets/care/care-02/vegetables-meal.png", "alt_text": "Vegetables and water as part of a varied meal"},
                {"id": "question", "title": "Do all foods do the same job?", "description": "No. We can use Go, Grow, and Glow to explore different healthful foods.", "image_url": "/assets/care/care-02/healthy-living.png", "alt_text": "Heart and leaves representing healthy living"},
            ], layout={"size": "wide", "preferred_columns": 2}),
            _screen("CARE-02", "instructional video", "video", "Watch: Go, Grow, and Glow Foods", template="instructional_video",
                content_label="Go, Grow, and Glow food groups", content_description="Watch how the three groups help us understand different healthful foods.",
                media_url="https://youtu.be/u_6nde6K1rQ?si=erNKP-pqtpFdpbZt", duration_seconds=120, layout={"size": "wide"}),
            _screen("CARE-02", "primary instruction and short reading", "image", "Read: Go, Grow, and Glow Foods", template="visual_narrative",
                content_label="Go, Grow, and Glow reading narration", steps=[
                {"id": "go", "title": "GO foods give us energy", "description": "They help us study, play, and move. Examples: rice, bread, corn, and oatmeal.", "image_url": "/assets/care/care-02/rice.png", "alt_text": "Rice as a Go food example", "audio_url": "/assets/care/care-02/go-foods.mp3"},
                {"id": "grow", "title": "GROW foods build the body", "description": "They help us grow and develop. Examples: fish, eggs, chicken, beans, and milk.", "image_url": "/assets/care/care-02/fish.png", "alt_text": "Fish as a Grow food example", "audio_url": "/assets/care/care-02/grow-foods.mp3"},
                {"id": "glow", "title": "GLOW foods keep us healthy", "description": "These include fruits and vegetables like bananas, mangoes, carrots, and leafy greens.", "image_url": "/assets/care/care-02/vegetables-meal.png", "alt_text": "Vegetables as Glow food examples", "audio_url": "/assets/care/care-02/glow-foods.mp3"},
            ], layout={"size": "wide", "preferred_columns": 3}),
            _screen("CARE-02", "supporting guided practice", "interactive", "Build the Go, Grow, Glow Plate", task_template="sort_groups", question="Place each familiar healthful food in the group used in this lesson.", items=[
                {"id": "rice", "label": "Rice", "image_url": "/assets/care/care-02/rice.png", "alt_text": "Rice"},
                {"id": "fish", "label": "Fish", "image_url": "/assets/care/care-02/fish.png", "alt_text": "Fish"},
                {"id": "banana", "label": "Banana", "image_url": "/assets/care/care-02/banana.png", "alt_text": "Banana"},
                {"id": "vegetables", "label": "Vegetables", "image_url": "/assets/care/care-02/vegetables-meal.png", "alt_text": "Vegetables"}],
                categories=[{"id": "go", "label": "Go — energy"}, {"id": "grow", "label": "Grow — development"}, {"id": "glow", "label": "Glow — body health"}],
                sort_answers={"rice": "go", "fish": "grow", "banana": "glow", "vegetables": "glow"}, scored=False,
                correct_feedback="You completed the plate. These are all healthful examples, grouped by how we discussed them.",
                retry_feedback="Use the examples: rice is Go, fish is Grow, and fruits and vegetables are Glow.", layout={"size": "wide", "preferred_columns": 4}),
            _screen("CARE-02", "primary competency assessment", "interactive", "Choose More Often or Less Often", task_template="sort_groups", question="Sort the foods into choices to have more often or less often.", items=[
                {"id": "rice", "label": "Rice", "image_url": "/assets/care/care-02/rice.png", "alt_text": "Rice"},
                {"id": "fish", "label": "Fish", "image_url": "/assets/care/care-02/fish.png", "alt_text": "Fish"},
                {"id": "vegetables", "label": "Vegetables", "image_url": "/assets/care/care-02/vegetables-meal.png", "alt_text": "Vegetables"},
                {"id": "water", "label": "Water", "image_url": "/assets/care/care-02/water.png", "alt_text": "Water"},
                {"id": "hotdog", "label": "Hot dog", "image_url": "/assets/care/care-02/hotdog.png", "alt_text": "Hot dog"},
                {"id": "snack", "label": "Packaged salty snack", "image_url": "/assets/care/care-02/packaged-snack.png", "alt_text": "Packaged snack"},
                {"id": "fastfood", "label": "Fast-food meal", "image_url": "/assets/care/care-02/fast-food.png", "alt_text": "Burger, fries, and sugary drink"},
                {"id": "fried", "label": "Fried chicken", "image_url": "/assets/care/care-02/fried-chicken.png", "alt_text": "Fried chicken"}],
                categories=[{"id": "more", "label": "Choose more often"}, {"id": "less", "label": "Choose less often"}],
                sort_answers={"rice": "more", "fish": "more", "vegetables": "more", "water": "more", "hotdog": "less", "snack": "less", "fastfood": "less", "fried": "less"},
                correct_feedback="Correct. You identified varied healthful choices and foods that are better chosen less often.",
                retry_feedback="Look again. Which foods were our Go, Grow, or Glow examples, and which are highly processed or fried choices?", layout={"size": "wide", "preferred_columns": 4}),
            _screen("CARE-02", "supporting concept check", "interactive", "Which Group Did We Learn?", task_template="multiple_choice",
                question="Fish is a healthful food. Which group did we learn it with?", choices=["Go", "Grow", "Glow"], answer="Grow",
                correct_feedback="Correct. Fish is one of our Grow examples.", retry_feedback="Think about the food that helps support growth and development."),
            _screen("CARE-02", "contextual meal decision", "interactive", "Complete the Meal", task_template="picture_choice",
                question="The meal already has rice and fish. Which choice would add a Glow food?", items=[
                    {"id": "vegetables", "label": "Vegetables", "image_url": "/assets/care/care-02/vegetables-meal.png", "alt_text": "Vegetables"},
                    {"id": "candy", "label": "Sugary candy", "image_url": "/assets/care/care-02/sugary-candy.png", "alt_text": "Sugary candy"},
                    {"id": "softdrink", "label": "Sugary soft drink", "image_url": "/assets/care/care-02/sugary-soft-drink.png", "alt_text": "Sugary soft drink"}],
                correct_item_ids=["vegetables"], correct_feedback="Correct. Vegetables add a Glow food to the meal.",
                retry_feedback="Choose the fruit or vegetable example that helps complete the varied meal.", layout={"size": "wide", "preferred_columns": 3}),
            _screen("CARE-02", "real-life application", "interactive", "Pack a School Snack", task_template="picture_choice",
                question="Choose all the options that could make a more healthful school snack.", items=[
                    {"id": "banana", "label": "Banana", "image_url": "/assets/care/care-02/banana.png", "alt_text": "Banana"},
                    {"id": "water", "label": "Water", "image_url": "/assets/care/care-02/water.png", "alt_text": "Water"},
                    {"id": "snack", "label": "Packaged salty snack", "image_url": "/assets/care/care-02/packaged-snack.png", "alt_text": "Packaged snack"},
                    {"id": "softdrink", "label": "Sugary soft drink", "image_url": "/assets/care/care-02/sugary-soft-drink.png", "alt_text": "Sugary soft drink"}],
                correct_item_ids=["banana", "water"], selection_mode="multiple",
                correct_feedback="Correct. Banana and water make a more healthful snack choice.",
                retry_feedback="Choose the fruit and the drink without added sugar.", layout={"size": "wide", "preferred_columns": 4}),
            _screen("CARE-02", "summary and completion", "image", "Healthy Food Mission Complete", template="visual_narrative", steps=[
                {"id": "groups", "title": "Different healthful foods help in different ways", "description": "Go foods provide energy, Grow foods support development, and Glow foods support body health.", "image_url": "/assets/care/care-02/balanced-meal.png", "alt_text": "A varied healthful meal"},
                {"id": "choice", "title": "Choose with care", "description": "Choose varied healthful foods more often and recognize foods that are better chosen less often.", "image_url": "/assets/care/care-02/healthy-living.png", "alt_text": "Heart and leaves representing healthy living"}],
                layout={"size": "wide", "preferred_columns": 2}),
        ],
    },
    {
        "lesson_id": "CARE-03", "title": "Tools for Good Grooming", "competency_code": "TPCS_GG-gp-NG-2",
        "competency": "Recognize the different materials needed to maintain good grooming",
        "description": "Recognize common grooming materials, match them to their purposes, and select them for everyday situations.",
        "assessment": {"teacher_verification": "not_required", "digital_scope": "Recognition only; does not claim independent grooming performance."},
        "slides": [
            _screen("CARE-03", "orientation", "image", "Tools for Good Grooming", template="visual_narrative", steps=[{"id": "goal", "title": "Today’s goal", "description": "Recognize materials used for different grooming tasks.", "image_url": "/assets/care/care-03/hygiene-tools.png", "alt_text": "A toothbrush, dental pick, scissors, and mirror representing hygiene and grooming tools"}]),
            _screen("CARE-03", "hook", "interactive", "Getting Ready for School", task_template="picture_choice", question="Your hair needs to be arranged. Which material would you prepare?", items=[{"id": "comb", "label": "Comb"}, {"id": "toothbrush", "label": "Toothbrush"}, {"id": "trowel", "label": "Garden trowel"}], correct_item_ids=["comb"], correct_feedback="Correct. A comb is used for grooming the hair.", retry_feedback="Try again. Which material is used for the hair?", asset_placeholders=[_meta("CARE-03", "Realistic grooming-material images", required=True)]),
            _screen("CARE-03", "primary instruction", "image", "Materials and Their Purposes", template="visual_narrative", steps=[{"id": "toothbrush", "title": "Toothbrush", "description": "Used for cleaning the teeth."}, {"id": "comb", "title": "Comb or hairbrush", "description": "Used for arranging the hair."}, {"id": "clipper", "title": "Nail clipper", "description": "Used for trimming nails."}, {"id": "towel", "title": "Towel", "description": "Used for drying after washing or bathing."}], layout={"size": "wide", "preferred_columns": 4}, asset_placeholders=[_meta("CARE-03", "Labeled core grooming-material images", required=True, narration=True)]),
            _screen("CARE-03", "instructional video", "video", "Watch: Personal Hygiene and Grooming", template="instructional_video",
                content_label="Personal hygiene and grooming", content_description="Watch how grooming tools help care for the teeth, hair, nails, and body.",
                media_url="https://youtu.be/xprsWjNvsvU?si=9W5tK7EaoRl-BovO", duration_seconds=120, layout={"size": "wide"}),
            _screen("CARE-03", "modeling", "image", "Match a Material to Its Purpose", template="visual_narrative", steps=[{"id": "model", "title": "Arrange hair → Comb", "description": "A toothbrush is not used to arrange hair. Choose a comb or hairbrush."}], asset_placeholders=[_meta("CARE-03", "Material-to-purpose model image", required=True)]),
            _screen("CARE-03", "guided matching", "interactive", "Match the Grooming Materials", task_template="matching_pairs", question="Match each material with what it is used for.", pairs=[{"id": "teeth", "left": {"id": "toothbrush", "label": "Toothbrush"}, "right": {"id": "clean-teeth", "label": "Clean teeth"}}, {"id": "hair", "left": {"id": "comb", "label": "Comb"}, "right": {"id": "arrange-hair", "label": "Arrange hair"}}, {"id": "nails", "left": {"id": "clipper", "label": "Nail clipper"}, "right": {"id": "trim-nails", "label": "Trim nails"}}, {"id": "dry", "left": {"id": "towel", "label": "Towel"}, "right": {"id": "dry-body", "label": "Dry after washing"}}], correct_feedback="Correct. Each grooming material matches its purpose.", retry_feedback="Try again. Think about what each material is used for.", asset_placeholders=[_meta("CARE-03", "Matching-card grooming images", required=True)]),
            _screen("CARE-03", "scenario-based selection", "interactive", "Prepare to Clean Your Teeth", task_template="picture_choice", question="Which materials do you need to clean your teeth?", items=[{"id": "toothbrush", "label": "Toothbrush"}, {"id": "toothpaste", "label": "Toothpaste"}, {"id": "trowel", "label": "Garden trowel"}], correct_item_ids=["toothbrush", "toothpaste"], selection_mode="multiple", correct_feedback="Correct. Prepare a toothbrush and toothpaste.", retry_feedback="Try again. Choose the materials used for cleaning teeth.", asset_placeholders=[_meta("CARE-03", "Tooth-cleaning scenario images", required=True)]),
            _screen("CARE-03", "interactive tooth-brushing practice", "interactive", "Brush Away the Plaque", task_template="tooth_brushing", question="Choose the right tool, then brush the teeth until they are clean.", items=[
                {"id": "toothbrush", "label": "Toothbrush", "image_url": "/assets/care/care-03/toothbrush.png", "alt_text": "Toothbrush"},
                {"id": "comb", "label": "Comb", "image_url": "/assets/care/care-03/comb.png", "alt_text": "Comb"},
                {"id": "towel", "label": "Towel", "image_url": "/assets/care/care-03/towel.png", "alt_text": "Towel"}],
                dirty_image_url="/assets/care/care-03/yellow-teeth.png", cleaning_image_url="/assets/care/care-03/teeth-cleaning.png",
                clean_image_url="/assets/care/care-03/teeth-white.png", tool_image_url="/assets/care/care-03/toothbrush.png",
                correct_feedback="Clean teeth! The toothbrush matches the task.", retry_feedback="That tool does not clean teeth. Try again.", layout={"size": "wide"}),
            _screen("CARE-03", "real-life application", "interactive", "Prepare a Grooming Kit", task_template="sort_groups", question="Sort each item by the grooming task it supports.", items=[{"id": "toothbrush", "label": "Toothbrush"}, {"id": "comb", "label": "Comb"}, {"id": "clipper", "label": "Nail clipper"}, {"id": "towel", "label": "Towel"}], categories=[{"id": "teeth", "label": "Clean teeth"}, {"id": "hair", "label": "Arrange hair"}, {"id": "nails", "label": "Trim nails"}, {"id": "dry", "label": "Dry after washing"}], sort_answers={"toothbrush": "teeth", "comb": "hair", "clipper": "nails", "towel": "dry"}, correct_feedback="Correct. You chose a suitable material for each grooming task.", retry_feedback="Check each task and choose the material made for it.", asset_placeholders=[_meta("CARE-03", "Grooming-kit scenario images", required=True)]),
            _screen("CARE-03", "summary and completion", "image", "Choose the Material for the Task", template="visual_narrative", steps=[{"id": "summary", "title": "Different tasks need different materials", "description": "Choose the grooming tool that matches each task.", "image_url": "/assets/care/care-03/hygiene-tools.png", "alt_text": "A toothbrush, dental pick, scissors, and mirror representing hygiene and grooming tools"}], assessment_metadata={"teacher_verification": "not_required", "performance_claim": False}),
        ],
    },
]



from .lesson_assets import attach_definitions
from .lesson_games import upgrade
upgrade(CARE_LESSONS)
attach_definitions(CARE_LESSONS)
