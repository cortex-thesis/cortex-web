from pathlib import Path
from django.core.management.base import BaseCommand
from django.db import transaction
from web.lesson_assets import attach_local_assets
from web.models import Slide

class Command(BaseCommand):
    help = "Fill missing lesson images from bundled assets, preserving existing content and media."

    @transaction.atomic
    def handle(self, *args, **options):
        count = 0
        changed = 0
        gaps = ["# Remaining lesson media gaps", "", "Unmatched visual items and missing video/audio sources. Existing media is preserved.", ""]
        for slide in Slide.objects.select_related("activity", "lesson").filter(lesson__status="approved", lesson__archived_at__isnull=True):
            activity = slide.activity
            config = activity.configuration
            added = attach_local_assets(config)
            if added:
                activity.save(update_fields=["configuration"])
                count += added
                changed += 1
            def audit(value, location):
                if isinstance(value, list):
                    for index, item in enumerate(value):
                        audit(item, f"{location}[{index}]")
                elif isinstance(value, dict):
                    label = value.get("title") or value.get("label")
                    if label and not value.get("image_url"):
                        gaps.append(f"- {slide.lesson.competency_code} / {slide.title} / {location}: {label}")
                    for key in ("steps", "items", "pairs", "left", "right"):
                        if key in value:
                            audit(value[key], f"{location}.{key}")
            audit(config, "configuration")
            if activity.type in ("video", "audio") and not activity.asset_id and not any(config.get(key) for key in ("video_url", "audio_url", "media_url")):
                gaps.append(f"- {slide.lesson.competency_code} / {slide.title}: {activity.type} needed")
        Path("docs/remaining-lesson-assets.md").write_text("\n".join(gaps) + "\n", encoding="utf-8")
        self.stdout.write(self.style.SUCCESS(f"Linked {count} images across {changed} slides. Remaining gaps: docs/remaining-lesson-assets.md"))
