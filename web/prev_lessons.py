"""Authoritative Cortex configuration for PREV-01--PREV-03."""

from .care_lessons import ADAPTATION_POLICY


def _asset(lesson_id, purpose, *, required=True, narration=False):
    return {"lesson_id": lesson_id, "purpose": purpose, "required": required, "optional_narration": narration, "kind": "png", "status": "placeholder"}


def _screen(lesson_id, purpose, activity_type, title, **configuration):
    if configuration.get("assessment_metadata", {}).get("scored") is False:
        configuration["scored"] = False
    configuration.update({"lesson_id": lesson_id, "instructional_purpose": purpose, "adaptive_delivery": ADAPTATION_POLICY})
    return {"title": title, "type": activity_type, "configuration": configuration}


PREV_LESSONS = [
    {
        "lesson_id": "PREV-01", "title": "My Capabilities, Interests, and Skills", "competency_code": "TPPV-ST-NG-2",
        "competency": "Identify individual learner's capabilities, interests, talents and skills",
        "description": "Recognize personal interests, capabilities, talents, and developing skills without treating self-reports as verified mastery.",
        "assessment": {"teacher_verification": "recommended", "self_report_scored": False, "digital_scope": "Concept checks may be scored; personal interests and perceived skills are not right-or-wrong responses."},
        "slides": [
            _screen("PREV-01", "orientation", "image", "My Capabilities, Interests, and Skills", template="visual_narrative", steps=[{"id": "goal", "title": "Know what interests you", "description": "Interests and skills can guide what you choose to practise."}], asset_placeholders=[_asset("PREV-01", "Age-respectful personal strengths and responsibilities illustration", narration=True)]),
            _screen("PREV-01", "concept instruction", "image", "Interest and Skill", template="visual_narrative", steps=[{"id": "interest", "title": "Interest", "description": "Something you like or want to explore."}, {"id": "skill", "title": "Skill or capability", "description": "Something you can do or are learning to do."}, {"id": "practice", "title": "Practice", "description": "A way to develop an interest or skill."}], layout={"size": "wide", "preferred_columns": 3}),
            _screen("PREV-01", "modeling", "image", "Drawing and Computers", template="visual_narrative", steps=[{"id": "ana", "title": "Ana enjoys drawing", "description": "Drawing is her interest and a skill she is developing."}, {"id": "marco", "title": "Marco likes computers", "description": "His interest can guide what he practises next."}], asset_placeholders=[_asset("PREV-01", "Drawing and computer activity examples")]),
            _screen("PREV-01", "guided classification", "interactive", "Interest, Skill, or Both?", task_template="sort_groups", question="Sort each example into the best group.", items=[{"id": "plants", "label": "Likes caring for plants"}, {"id": "tools", "label": "Can arrange tools correctly"}, {"id": "singing", "label": "Enjoys singing and practises songs"}], categories=[{"id": "interest", "label": "Interest"}, {"id": "skill", "label": "Skill or capability"}, {"id": "both", "label": "Can be both"}], sort_answers={"plants": "interest", "tools": "skill", "singing": "both"}, correct_feedback="Correct. Interests describe enjoyment; skills describe ability or learning.", retry_feedback="Look for enjoyment, demonstrated ability, or both."),
            _screen("PREV-01", "interest self-reflection", "interactive", "Activities I Am Interested In", task_template="picture_choice", selection_mode="multiple", question="Choose any activities you are interested in.", items=[{"id": value, "label": label} for value, label in [("gardening", "Gardening"), ("cooking", "Food preparation"), ("computer", "Using a computer"), ("drawing", "Drawing or design"), ("organizing", "Organizing materials"), ("music", "Music")]], correct_item_ids=[], correct_feedback="Your interests can help you choose what to explore.", retry_feedback="Choose any activity you would like to explore.", assessment_metadata={"scored": False}),
            _screen("PREV-01", "skill self-reflection", "interactive", "Skills I Use or Am Learning", task_template="picture_choice", selection_mode="multiple", question="Choose activities you can do or are learning to do.", items=[{"id": value, "label": label} for value, label in [("plants", "Care for plants"), ("food", "Prepare food"), ("ict", "Use technology"), ("materials", "Organize materials"), ("crafts", "Make crafts"), ("household", "Help with household tasks")]], correct_item_ids=[], correct_feedback="Skills can grow with practice and support.", retry_feedback="Choose any activity you do or are learning.", assessment_metadata={"scored": False, "teacher_verification": "recommended"}),
            _screen("PREV-01", "real-life application", "interactive", "What Would Help Me Improve?", task_template="multiple_choice", question="Which can help a person improve a skill?", choices=["Practice, instruction, and suitable tools", "Never trying the activity", "Being an expert immediately"], answer="Practice, instruction, and suitable tools", correct_feedback="Correct. Skills can grow through practice, support, and training.", retry_feedback="Think about what helps someone learn and improve."),
            _screen("PREV-01", "summary", "image", "Know Your Strengths and Interests", template="visual_narrative", steps=[{"id": "summary", "title": "Choose, practise, improve", "description": "Knowing your interests and developing skills can guide future activities."}], assessment_metadata={"teacher_verification": "recommended"}),
        ],
    },
    {
        "lesson_id": "PREV-02", "title": "Livelihood Activities Around Us", "competency_code": "TPPV-LE-NG-1",
        "competency": "Identify examples of livelihood and entrepreneurial activities",
        "description": "Recognize familiar livelihood activities and connect them with the goods or services they provide.",
        "assessment": {"teacher_verification": "optional", "digital_scope": "Image recognition, matching, and categorization directly address identification."},
        "slides": [
            _screen("PREV-02", "orientation", "image", "Livelihood Activities Around Us", template="visual_narrative", steps=[{"id": "goal", "title": "Look around the community", "description": "People produce goods and provide services to help earn a living."}], asset_placeholders=[_asset("PREV-02", "Community livelihood scene", narration=True)]),
            _screen("PREV-02", "concept instruction", "image", "Products and Services", template="visual_narrative", steps=[{"id": "product", "title": "Product", "description": "Something made, grown, or sold."}, {"id": "service", "title": "Service", "description": "Useful work done for another person."}]),
            _screen("PREV-02", "modeling", "image", "Activity to Product or Service", template="visual_narrative", steps=[{"id": "garden", "title": "Grow vegetables", "description": "Produces vegetables that can be sold."}, {"id": "repair", "title": "Repair computers", "description": "Provides a technical service."}], asset_placeholders=[_asset("PREV-02", "Vegetable growing and computer repair scenes")]),
            _screen("PREV-02", "guided matching", "interactive", "Match the Livelihood Activity", task_template="matching_pairs", question="Match each activity with what it provides.", pairs=[{"id": "tailoring", "left": {"id": "tailor", "label": "Tailoring"}, "right": {"id": "clothes", "label": "Clothing or alteration service"}}, {"id": "gardening", "left": {"id": "garden", "label": "Gardening"}, "right": {"id": "vegetables", "label": "Vegetables or plants"}}, {"id": "repair", "left": {"id": "repair", "label": "Computer repair"}, "right": {"id": "technical", "label": "Technical service"}}, {"id": "food", "left": {"id": "processing", "label": "Food processing"}, "right": {"id": "food-product", "label": "Food product"}}], correct_feedback="Correct. Each activity connects with a product or service.", retry_feedback="Ask what the worker makes, sells, or does for a customer."),
            _screen("PREV-02", "classification", "interactive", "Livelihood or Recreation?", task_template="sort_groups", question="Sort each example by its purpose.", items=[{"id": "baked", "label": "Selling baked goods"}, {"id": "electronics", "label": "Repairing electronics for customers"}, {"id": "movie", "label": "Watching a movie for recreation"}, {"id": "vegetables", "label": "Growing vegetables for sale"}], categories=[{"id": "livelihood", "label": "Livelihood activity"}, {"id": "recreation", "label": "Recreation"}], sort_answers={"baked": "livelihood", "electronics": "livelihood", "movie": "recreation", "vegetables": "livelihood"}, correct_feedback="Correct. Livelihood examples provide goods or services.", retry_feedback="Look for work that produces, sells, or provides something."),
            _screen("PREV-02", "independent check", "interactive", "What Is Being Provided?", task_template="multiple_choice", question="A person repairs an appliance for a customer. What are they providing?", choices=["A repair service", "A leisure activity", "A sports event"], answer="A repair service", correct_feedback="Correct. Repair work provides a service.", retry_feedback="Think about the useful work done for the customer."),
            _screen("PREV-02", "community reflection", "interactive", "Livelihoods in My Community", task_template="picture_choice", selection_mode="multiple", question="Choose livelihood activities you have seen in your community.", items=[{"id": value, "label": label} for value, label in [("food", "Food selling"), ("store", "Community store"), ("tailoring", "Tailoring"), ("computer", "Computer service"), ("repair", "Repair work")]], correct_item_ids=[], correct_feedback="Communities can have many different livelihood activities.", retry_feedback="Choose any examples familiar to you.", assessment_metadata={"scored": False}),
            _screen("PREV-02", "summary", "image", "Goods, Services, and Livelihood", template="visual_narrative", steps=[{"id": "summary", "title": "People use many kinds of skills", "description": "Livelihood activities can produce goods, sell products, or provide services."}]),
        ],
    },
    {
        "lesson_id": "PREV-03", "title": "Livelihood Opportunities in My Community", "competency_code": "TPPV-OL-NG-1",
        "competency": "Identify livelihood and entrepreneurial opportunities that provide means of living for different people in the community",
        "description": "Connect familiar community needs with plausible livelihood products or services.",
        "assessment": {"teacher_verification": "recommended for open reflection", "digital_scope": "Structured need-to-opportunity matches may be scored; local open responses are teacher-guided."},
        "slides": [
            _screen("PREV-03", "orientation", "image", "Livelihood Opportunities in My Community", template="visual_narrative", steps=[{"id": "goal", "title": "Need → Product or service → Opportunity", "description": "Look at what people need and consider how someone could respond."}], asset_placeholders=[_asset("PREV-03", "Community need and service scene", narration=True)]),
            _screen("PREV-03", "concept instruction", "image", "Activity and Opportunity", template="visual_narrative", steps=[{"id": "activity", "title": "Activity", "description": "Something a person does, makes, or provides."}, {"id": "opportunity", "title": "Opportunity", "description": "A possible way to use skills and resources to meet a community need."}]),
            _screen("PREV-03", "modeling", "image", "A Community Need", template="visual_narrative", steps=[{"id": "need", "title": "People need device repairs", "description": "A trained person with suitable tools could provide a repair service."}], asset_placeholders=[_asset("PREV-03", "Repair tools or trained repair worker")]),
            _screen("PREV-03", "guided matching", "interactive", "Match the Need to an Opportunity", task_template="matching_pairs", question="Match each need with a suitable opportunity.", pairs=[{"id": "clothes", "left": {"id": "clothing-need", "label": "Clothes need repair"}, "right": {"id": "tailoring", "label": "Tailoring service"}}, {"id": "vegetables", "left": {"id": "vegetable-need", "label": "Residents want fresh vegetables"}, "right": {"id": "gardening", "label": "Grow and sell vegetables"}}, {"id": "devices", "left": {"id": "device-need", "label": "Broken devices need checking"}, "right": {"id": "repair", "label": "Electronics or computer repair"}}], correct_feedback="Correct. Each opportunity responds to the community need.", retry_feedback="Choose the product or service that directly addresses the need."),
            _screen("PREV-03", "food opportunity check", "interactive", "Affordable Snacks Near a School", task_template="multiple_choice", question="Which could be a livelihood opportunity?", choices=["Prepare and sell suitable snacks", "Offer clothing repair only", "Ignore what customers need"], answer="Prepare and sell suitable snacks", correct_feedback="Correct. A food activity could respond to snack demand.", retry_feedback="Which choice provides the product people want?"),
            _screen("PREV-03", "tailoring opportunity check", "interactive", "Households Need Clothing Alterations", task_template="multiple_choice", question="Which opportunity best fits this need?", choices=["Tailoring or dressmaking service", "Computer printing service", "Plant selling"], answer="Tailoring or dressmaking service", correct_feedback="Correct. Tailoring directly responds to alteration needs.", retry_feedback="Which service repairs or changes clothing?"),
            _screen("PREV-03", "context check", "interactive", "Does the Opportunity Fit?", task_template="yes_no", question="People need broken computers repaired. Would a trained computer repair service meet this need?", choices=["Yes", "No"], answer="Yes", correct_feedback="Correct. The service directly responds to the need.", retry_feedback="Compare the need with the offered service."),
            _screen("PREV-03", "summary", "image", "Needs Can Point to Opportunities", template="visual_narrative", steps=[{"id": "summary", "title": "Observe, connect, evaluate", "description": "Connect a community need with a useful product or service."}], assessment_metadata={"teacher_discussion": "recommended", "success_not_guaranteed": True}),
        ],
    },
]


from .prev01_discovery import upgrade_prev01
upgrade_prev01(PREV_LESSONS)
from .prev02_refresh import upgrade_prev02
upgrade_prev02(PREV_LESSONS)
from .lesson_assets import attach_definitions
attach_definitions(PREV_LESSONS)
