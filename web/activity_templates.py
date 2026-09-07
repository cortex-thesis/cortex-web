"""Paper-aligned activity template contract stored in Activity.configuration."""

ACTIVITY_TEMPLATES = {
    "instructional_video": {
        "label": "Instructional video",
        "mode": "focus",
        "purpose": "Primary instructional delivery",
        "activity_type": "video",
    },
    "visual_narrative": {
        "label": "Step-by-step visual narrative",
        "mode": "focus",
        "purpose": "Guided procedural learning",
        "activity_type": "image",
        "required": ("steps",),
    },
    "multiple_choice": {
        "label": "Interactive knowledge check",
        "mode": "focus",
        "purpose": "Micro-assessment and engagement",
        "activity_type": "interactive",
        "required": ("question", "choices", "answer"),
    },
    "reengagement_prompt": {
        "label": "Re-engagement prompt",
        "mode": "focus",
        "purpose": "Attention recapture during distraction",
        "activity_type": "interactive",
        "required": ("instruction",),
    },
    "breathing_exercise": {
        "label": "Breathing exercise",
        "mode": "relax",
        "purpose": "Arousal regulation",
        "activity_type": "video",
    },
    "calming_visual": {
        "label": "Calming visual",
        "mode": "relax",
        "purpose": "Low-stimulus sensory cooldown",
        "activity_type": "image",
    },
    "calming_soundscape": {
        "label": "Calming soundscape",
        "mode": "relax",
        "purpose": "Auditory regulation",
        "activity_type": "audio",
    },
}

TASK_TEMPLATES = {
    "multiple_choice": {"label": "Multiple choice", "required": ("question", "choices", "answer")},
    "picture_choice": {"label": "Picture choice", "required": ("question", "items", "correct_item_ids")},
    "yes_no": {"label": "Yes or no", "required": ("question", "choices", "answer")},
    "matching_pairs": {"label": "Matching pairs", "required": ("question", "pairs")},
    "sequence_order": {"label": "Order the steps", "required": ("question", "items", "correct_order")},
    "sort_groups": {"label": "Sort into groups", "required": ("question", "items", "categories", "sort_answers")},
    "tap_target": {"label": "Tap the correct item", "required": ("question", "items", "correct_item_ids")},
    "picture_puzzle": {"label": "Build the picture", "required": ("question", "items", "correct_order")},
    "drag_to_target": {"label": "Move to the right place", "required": ("question", "items", "categories", "sort_answers")},
    "hotspot_hunt": {"label": "Hotspot hunt", "required": ("question", "hotspot")},
    "trace_route": {"label": "Trace the route", "required": ("question", "items", "correct_order")},
    "memory_flip": {"label": "Memory flip", "required": ("question", "pairs")},
    "pattern_builder": {"label": "Pattern builder", "required": ("question", "pattern", "items", "answer")},
}

LAYOUT_OPTIONS = {
    "sizes": ("compact", "standard", "wide", "immersive"),
    "media_fits": ("contain", "cover"),
    "preferred_columns": {"minimum": 1, "maximum": 8},
    "board_min_height": {"minimum": 160, "maximum": 900},
}


def validate_activity_configuration(activity_type, configuration):
    """Return a user-facing error, or None for a valid/legacy configuration."""
    if not isinstance(configuration, dict):
        return "configuration must be a JSON object."
    layout = configuration.get("layout")
    if layout is not None:
        if not isinstance(layout, dict):
            return "layout must be a JSON object."
        size = layout.get("size")
        if size is not None and size not in LAYOUT_OPTIONS["sizes"]:
            return "layout size must be compact, standard, wide, or immersive."
        media_fit = layout.get("media_fit")
        if media_fit is not None and media_fit not in LAYOUT_OPTIONS["media_fits"]:
            return "layout media_fit must be contain or cover."
        for field in ("preferred_columns", "board_min_height"):
            value = layout.get(field)
            limits = LAYOUT_OPTIONS[field]
            if value is not None and (not isinstance(value, int) or isinstance(value, bool) or not limits["minimum"] <= value <= limits["maximum"]):
                return f"layout {field} must be an integer from {limits['minimum']} to {limits['maximum']}."
    template_id = configuration.get("template")
    if template_id:
        template = ACTIVITY_TEMPLATES.get(template_id)
        if template is None:
            return "Unknown presentation template."
        if activity_type != template["activity_type"]:
            return f"{template_id} requires activity type {template['activity_type']}."
        missing = [field for field in template.get("required", ()) if not configuration.get(field)]
        if missing:
            return f"Missing presentation configuration: {', '.join(missing)}."

    task_id = configuration.get("task_template")
    if task_id:
        task = TASK_TEMPLATES.get(task_id)
        if task is None:
            return "Unknown task template."
        missing = [field for field in task["required"] if field not in configuration or configuration[field] is None or configuration[field] == ""]
        if missing:
            return f"Missing task configuration: {', '.join(missing)}."
    if not template_id and not task_id:
        return None  # Preserve pre-template activities during the prototype transition.

    if task_id in {"multiple_choice", "yes_no"}:
        choices = configuration["choices"]
        if not isinstance(choices, list) or len(choices) < 2 or configuration["answer"] not in choices:
            return f"{task_id} requires at least two choices and an answer contained in choices."
    if task_id and configuration.get("lesson_id", "").startswith(("CARE-", "LIFE-", "PREV-", "LIVE-", "FUNC-")):
        missing_feedback = [field for field in ("correct_feedback", "retry_feedback") if not configuration.get(field)]
        if missing_feedback:
            return f"Scored lesson activities require: {', '.join(missing_feedback)}."
    if task_id in {"picture_choice", "tap_target"}:
        item_ids = {item.get("id") for item in configuration["items"] if isinstance(item, dict)}
        correct_ids = configuration["correct_item_ids"]
        unscored = configuration.get("scored") is False
        if not isinstance(correct_ids, list) or (not correct_ids and not unscored) or not set(correct_ids).issubset(item_ids):
            return f"{task_id} requires correct_item_ids contained in items."
    if template_id == "visual_narrative" and not isinstance(configuration["steps"], list):
        return "visual_narrative steps must be a list."
    return None
