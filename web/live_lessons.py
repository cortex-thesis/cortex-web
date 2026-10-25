"""Authoritative Cortex configuration for LIVE-01--LIVE-03."""

from .care_lessons import ADAPTATION_POLICY


def _asset(lesson_id, purpose, *, narration=False):
    return {"lesson_id": lesson_id, "purpose": purpose, "required": True, "optional_narration": narration, "kind": "png", "status": "placeholder"}


def _screen(lesson_id, purpose, activity_type, title, **configuration):
    configuration.update({"lesson_id": lesson_id, "instructional_purpose": purpose, "adaptive_delivery": ADAPTATION_POLICY})
    return {"title": title, "type": activity_type, "configuration": configuration}


LIVE_LESSONS = [
    {
        "lesson_id": "LIVE-01", "title": "Why Gardening Matters", "competency_code": "TC_LPGA-BGC-NG-2",
        "competency": "Determine the importance of gardening",
        "description": "Identify practical ways gardening can provide useful plants or food, develop skills, and potentially support livelihood.",
        "assessment": {"teacher_verification": "optional", "digital_scope": "Scenario-to-benefit reasoning; gardening does not automatically guarantee income."},
        "slides": [
            _screen("LIVE-01", "mission introduction", "image", "Garden Mission 1: Why Gardening Matters", template="visual_narrative", steps=[{"id": "mission", "title": "How could this garden help?", "description": "Explore practical benefits for households and communities."}], asset_placeholders=[_asset("LIVE-01", "Small household vegetable garden", narration=True)]),
            _screen("LIVE-01", "garden exploration", "image", "Explore the Garden", template="visual_narrative", steps=[{"id": "food", "title": "Vegetables", "description": "Gardening can produce food."}, {"id": "harvest", "title": "Harvested produce", "description": "Products may be used at home or sold."}, {"id": "work", "title": "Garden work", "description": "Caring for plants develops practical skills."}], asset_placeholders=[_asset("LIVE-01", "Garden scene with vegetables, produce, tools, and worker")]),
            _screen("LIVE-01", "concept presentation", "image", "Why Gardening Is Important", template="visual_narrative", steps=[{"id": "plants", "title": "Useful plants and food"}, {"id": "skills", "title": "Practical skills"}, {"id": "livelihood", "title": "Possible livelihood"}]),
            _screen("LIVE-01", "scenario matching", "interactive", "Why Does This Garden Matter?", task_template="matching_pairs", question="Match each garden situation with its benefit.", pairs=[{"id": "meals", "left": {"id": "household", "label": "Household grows vegetables"}, "right": {"id": "food", "label": "Helps provide food"}}, {"id": "sell", "left": {"id": "plants", "label": "Person raises ornamental plants"}, "right": {"id": "product", "label": "May provide a product to sell"}}, {"id": "practise", "left": {"id": "learner", "label": "Learner plants and waters"}, "right": {"id": "skill", "label": "Develops practical skills"}}], correct_feedback="Correct. Each situation provides a practical benefit.", retry_feedback="Look at what the garden produces or what the person practices."),
            _screen("LIVE-01", "benefit classification", "interactive", "Useful or Not Related?", task_template="sort_groups", question="Sort the statements.", items=[{"id": "vegetables", "label": "Produces vegetables"}, {"id": "skills", "label": "Develops gardening skills"}, {"id": "livelihood", "label": "May support a livelihood"}, {"id": "phone", "label": "Makes a phone charge faster"}], categories=[{"id": "benefit", "label": "Gardening benefit"}, {"id": "unrelated", "label": "Not related"}], sort_answers={"vegetables": "benefit", "skills": "benefit", "livelihood": "benefit", "phone": "unrelated"}, correct_feedback="Correct. You identified realistic gardening benefits.", retry_feedback="Ask whether the statement is a practical result of gardening."),
            _screen("LIVE-01", "application", "interactive", "A Garden at Home or School", task_template="picture_choice", selection_mode="multiple", question="What could a small garden be used for?", items=[{"id": "vegetables", "label": "Grow vegetables"}, {"id": "herbs", "label": "Grow herbs"}, {"id": "sale", "label": "Grow plants for possible sale"}, {"id": "skills", "label": "Practice gardening skills"}], correct_item_ids=["vegetables", "herbs", "sale", "skills"], correct_feedback="Correct. A garden may have several useful purposes.", retry_feedback="Each choice shown is a meaningful possible use."),
            _screen("LIVE-01", "generalization", "interactive", "One Important Reason", task_template="multiple_choice", question="Why can gardening be important?", choices=["It can provide useful plants or food and build practical skills", "It always guarantees income", "It replaces every other kind of work"], answer="It can provide useful plants or food and build practical skills", correct_feedback="Correct. Gardening has practical benefits without guaranteeing income.", retry_feedback="Choose the realistic garden outcome."),
            _screen("LIVE-01", "completion", "image", "Garden Mission Complete", template="visual_narrative", steps=[{"id": "summary", "title": "Grow, care, use", "description": "Gardening can provide useful plants, develop skills, and may support livelihood."}]),
        ],
    },
    {
        "lesson_id": "LIVE-02", "title": "Choose the Right Garden Tool", "competency_code": "TC_LPGA-TES-NG-1",
        "competency": "Identify basic tools according to requirement/use",
        "description": "Select basic gardening tools according to the work requirement and primary use.",
        "assessment": {"teacher_verification": "recommended for transfer", "digital_scope": "Tool selection does not prove safe physical operation."},
        "slides": [
            _screen("LIVE-02", "work order introduction", "interactive", "Garden Mission 2: Tool Bench", task_template="picture_choice", question="WORK ORDER: Water the seedlings. Which tool should you take?", items=[{"id": "watering-can", "label": "Watering can"}, {"id": "trowel", "label": "Hand trowel"}, {"id": "measuring-tape", "label": "Measuring tape"}], correct_item_ids=["watering-can"], correct_feedback="Correct. A watering can matches the watering task.", retry_feedback="Which tool is made for giving water to plants?", asset_placeholders=[_asset("LIVE-02", "Watering can, hand trowel, and measuring tape", narration=True)]),
            _screen("LIVE-02", "tool exploration", "image", "Explore the Tool Bench", template="visual_narrative", steps=[{"id": "trowel", "title": "Hand trowel", "description": "Used for small digging or soil work."}, {"id": "watering", "title": "Watering can", "description": "Used to give water to plants."}, {"id": "measure", "title": "Measuring tool", "description": "Used when a task requires measurement."}], asset_placeholders=[_asset("LIVE-02", "Individual gardening tools on a workbench")]),
            _screen("LIVE-02", "task-to-tool modeling", "image", "Task → Function → Tool", template="visual_narrative", steps=[{"id": "task", "title": "Task", "description": "Water the plants."}, {"id": "function", "title": "Function needed", "description": "Carry and pour water."}, {"id": "tool", "title": "Choose", "description": "Use the watering can."}]),
            _screen("LIVE-02", "digging work order", "interactive", "Work Order: Loosen the Soil", task_template="picture_choice", question="Which tool fits small digging and soil work?", items=[{"id": "watering-can", "label": "Watering can"}, {"id": "trowel", "label": "Hand trowel"}, {"id": "measuring-tape", "label": "Measuring tape"}], correct_item_ids=["trowel"], correct_feedback="Correct. A hand trowel is suitable for small soil work.", retry_feedback="Which tool is used for digging?"),
            _screen("LIVE-02", "measuring work order", "interactive", "Work Order: Measure the Garden Bed", task_template="picture_choice", question="Which tool should you choose?", items=[{"id": "watering-can", "label": "Watering can"}, {"id": "trowel", "label": "Hand trowel"}, {"id": "measuring-tape", "label": "Measuring tape"}], correct_item_ids=["measuring-tape"], correct_feedback="Correct. A measuring tape matches the task.", retry_feedback="Which tool shows length or distance?"),
            _screen("LIVE-02", "mismatch check", "interactive", "Tool Mismatch Challenge", task_template="yes_no", question="The task is to water a seedling. Is a cutting tool correct?", choices=["Yes", "No"], answer="No", correct_feedback="Correct. Choose a watering tool instead.", retry_feedback="Compare the tool function with the watering task."),
            _screen("LIVE-02", "integrated sequence", "interactive", "Prepare for a Garden Task", task_template="sequence_order", question="Arrange the work in order.", items=[{"id": "loosen", "label": "Loosen soil with a trowel"}, {"id": "plant", "label": "Place the seed or seedling"}, {"id": "water", "label": "Water with a watering can"}], correct_order=["loosen", "plant", "water"], correct_feedback="Correct. You prepared the work in a sensible order.", retry_feedback="Begin with the soil, then plant, then water."),
            _screen("LIVE-02", "completion", "image", "Tool Bench Mission Complete", template="visual_narrative", steps=[{"id": "summary", "title": "Match the tool to the task", "description": "Choose gardening tools according to the required work."}], assessment_metadata={"physical_operation_verified": False}),
        ],
    },
    {
        "lesson_id": "LIVE-03", "title": "Choose Good Seeds for Planting", "competency_code": "TC_LPGA-GSC-NG-2",
        "competency": "Select good quality seeds",
        "description": "Inspect, compare, and select seeds using quality characteristics that must be validated by Panorama/SPED.",
        "assessment": {"teacher_verification": "required before final assessment", "digital_scope": "No final seed-quality answer key until criteria and visuals are approved."},
        "slides": [
            _screen("LIVE-03", "quality-control briefing", "image", "Garden Mission 3: Seed Inspector", template="visual_narrative", steps=[{"id": "brief", "title": "Inspect before selecting", "description": "Not every seed should automatically be selected."}], asset_placeholders=[_asset("LIVE-03", "Seed inspection tray", narration=True)]),
            _screen("LIVE-03", "inspection process", "image", "Inspect → Compare → Select", template="visual_narrative", steps=[{"id": "inspect", "title": "Inspect", "description": "Look closely."}, {"id": "compare", "title": "Compare", "description": "Use approved characteristics."}, {"id": "select", "title": "Select", "description": "Choose after comparison."}]),
            _screen("LIVE-03", "inspection demonstration", "video", "Inspection Demonstration", template="instructional_video", content_label="Video needed: contrasting seeds under magnification", content_description="Narration and criteria require Panorama approval.", duration_seconds=35),
            _screen("LIVE-03", "process check", "interactive", "What Should You Do First?", task_template="multiple_choice", question="Before selecting a seed, what should you do first?", choices=["Inspect it carefully", "Select every seed automatically", "Ignore the taught characteristics"], answer="Inspect it carefully", correct_feedback="Correct. Inspect before comparing and selecting.", retry_feedback="Follow the inspection process."),
            _screen("LIVE-03", "provisional comparison", "image", "Compare Two Seeds", template="visual_narrative", steps=[{"id": "pending", "title": "Validation required", "description": "Seed images and the answer key must be approved before this becomes scored."}], asset_placeholders=[_asset("LIVE-03", "Two contrasting, validated seed samples")]),
            _screen("LIVE-03", "provisional tray", "image", "Seed Inspection Tray", template="visual_narrative", steps=[{"id": "pending", "title": "Assessment locked", "description": "Do not score this activity until seed criteria, images, and keys are validated."}], asset_placeholders=[_asset("LIVE-03", "Three to five validated seed samples and comparison reference")]),
            _screen("LIVE-03", "real-life transfer", "image", "Prepare Seeds for a Small Garden", template="visual_narrative", steps=[{"id": "limit", "title": "Planting space is limited", "description": "Inspect materials carefully before choosing."}, {"id": "transfer", "title": "Use real samples", "description": "Practice with teacher supervision."}], assessment_metadata={"real_world_verification": "recommended"}),
            _screen("LIVE-03", "completion", "image", "Seed Inspection Complete", template="visual_narrative", steps=[{"id": "summary", "title": "Inspect, compare, select", "description": "Use only the quality characteristics taught and approved."}], assessment_metadata={"final_assessment_locked": True}),
        ],
    },
]


from .live01_refresh import upgrade_live01
upgrade_live01(LIVE_LESSONS)
from .live23_refresh import upgrade_live23
upgrade_live23(LIVE_LESSONS)
from .lesson_assets import attach_definitions
attach_definitions(LIVE_LESSONS)
