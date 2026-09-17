from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from copy import deepcopy
from web.lesson_assets import attach_shared_icons, shared_icon_urls

from web.activity_templates import validate_activity_configuration
from web.live_lessons import LIVE_LESSONS
from web.models import Activity, CurriculumPackage, Lesson, Profile, Slide


class Command(BaseCommand):
    help = "Idempotently create or update LIVE-01--LIVE-03."

    def add_arguments(self, parser):
        parser.add_argument("--owner")
        parser.add_argument("--lesson", choices=['LIVE-01', 'LIVE-02', 'LIVE-03'])

    @transaction.atomic
    def handle(self, *args, **options):
        profiles = Profile.objects.select_related("user")
        owner = profiles.filter(user__username=options["owner"]).first() if options["owner"] else profiles.filter(role=Profile.Role.ADMIN).order_by("pk").first()
        if owner is None:
            raise CommandError("An owner profile is required. Create an administrator or pass --owner USERNAME.")
        package, _ = CurriculumPackage.objects.update_or_create(slug="livelihood", defaults={"name": "Livelihood", "domain_focus": "Gardening concepts, tools, and planting-material selection", "is_active": True})
        icon_urls = shared_icon_urls()
        for definition in LIVE_LESSONS:
            if options.get('lesson') and definition['lesson_id'] != options['lesson']:
                continue
            matches = Lesson.objects.filter(competency_code=definition["competency_code"]).order_by("pk")
            lesson = matches.first() or Lesson(created_by=owner)
            lesson.package, lesson.title, lesson.description = package, definition["title"], definition["description"]
            lesson.competency_code, lesson.competency_description = definition["competency_code"], definition["competency"]
            lesson.estimated_duration_seconds, lesson.status, lesson.archived_at = 15 * 60, Lesson.Status.APPROVED, None
            lesson.save()
            matches.exclude(pk=lesson.pk).update(status=Lesson.Status.ARCHIVED, archived_at=timezone.now())
            existing = {slide.position: slide for slide in lesson.slides.select_related("activity") if not slide.activity.configuration.get('optional_review')}
            for position, screen in enumerate(definition["slides"]):
                config = deepcopy(screen["configuration"])
                attach_shared_icons(config, icon_urls)
                config["lesson_metadata"] = {"lesson_id": definition["lesson_id"], "official_competency": definition["competency"], "competency_code": definition["competency_code"], "assessment": definition["assessment"], "content_status": "Proposed for SPED expert validation"}
                error = validate_activity_configuration(screen["type"], config)
                if error:
                    raise CommandError(f'{definition["lesson_id"]} screen {position + 1}: {error}')
                slide = existing.pop(position, None)
                if slide is None:
                    activity = Activity.objects.create(type=screen["type"], title=screen["title"], configuration=config)
                    Slide.objects.create(lesson=lesson, position=position, title=screen["title"], activity=activity)
                else:
                    activity = slide.activity
                    activity.type, activity.title, activity.configuration, activity.asset = screen["type"], screen["title"], config, None
                    activity.save()
                    slide.title = screen["title"]
                    slide.save(update_fields=["title"])
            if existing:
                raise CommandError(f'{definition["lesson_id"]} has obsolete slides; archive them through a reviewed migration.')
            self.stdout.write(f'{definition["lesson_id"]}: {lesson.title} ({len(definition["slides"])} screens)')
        self.stdout.write(self.style.SUCCESS("LIVE-01--LIVE-03 synchronized successfully."))
