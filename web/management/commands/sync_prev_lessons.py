from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from web.activity_templates import validate_activity_configuration
from web.models import Activity, CurriculumPackage, Lesson, Profile, Slide
from web.prev_lessons import PREV_LESSONS


class Command(BaseCommand):
    help = "Idempotently create or update PREV-01--PREV-03."

    def add_arguments(self, parser):
        parser.add_argument("--owner", help="Username whose profile owns newly created lessons.")

    @transaction.atomic
    def handle(self, *args, **options):
        profiles = Profile.objects.select_related("user")
        owner = profiles.filter(user__username=options["owner"]).first() if options["owner"] else profiles.filter(role=Profile.Role.ADMIN).order_by("pk").first()
        if owner is None:
            raise CommandError("An owner profile is required. Create an administrator or pass --owner USERNAME.")
        package, _ = CurriculumPackage.objects.update_or_create(slug="pre_vocational", defaults={"name": "Pre-Vocational", "domain_focus": "Personal skills, livelihood activities, and community opportunities", "is_active": True})
        for definition in PREV_LESSONS:
            matches = Lesson.objects.filter(competency_code=definition["competency_code"]).order_by("pk")
            lesson = matches.first() or Lesson(created_by=owner)
            lesson.package, lesson.title, lesson.description = package, definition["title"], definition["description"]
            lesson.competency_code, lesson.competency_description = definition["competency_code"], definition["competency"]
            lesson.estimated_duration_seconds = 15 * 60
            lesson.status, lesson.archived_at = Lesson.Status.APPROVED, None
            lesson.save()
            matches.exclude(pk=lesson.pk).update(status=Lesson.Status.ARCHIVED, archived_at=timezone.now())
            existing = {slide.position: slide for slide in lesson.slides.select_related("activity")}
            for position, screen in enumerate(definition["slides"]):
                config = dict(screen["configuration"])
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
        self.stdout.write(self.style.SUCCESS("PREV-01--PREV-03 synchronized successfully."))
