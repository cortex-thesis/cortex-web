from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from web.activity_templates import validate_activity_configuration
from web.care_lessons import CARE_LESSONS
from web.models import Activity, CurriculumPackage, Lesson, Profile, Slide


class Command(BaseCommand):
    help = "Idempotently create or update the authoritative CARE-01--CARE-03 lessons."

    def add_arguments(self, parser):
        parser.add_argument("--owner", help="Username whose profile owns newly created lessons.")

    @transaction.atomic
    def handle(self, *args, **options):
        profiles = Profile.objects.select_related("user")
        if options["owner"]:
            owner = profiles.filter(user__username=options["owner"]).first()
        else:
            owner = profiles.filter(role=Profile.Role.ADMIN).order_by("pk").first()
        if owner is None:
            raise CommandError("An owner profile is required. Create an administrator or pass --owner USERNAME.")

        package, _ = CurriculumPackage.objects.update_or_create(
            slug="care", defaults={"name": "Care", "domain_focus": "Personal healthcare, nutrition, and grooming skills", "is_active": True}
        )
        for definition in CARE_LESSONS:
            matches = Lesson.objects.filter(competency_code=definition["competency_code"]).order_by("pk")
            lesson = matches.first()
            if lesson is None:
                lesson = Lesson(created_by=owner)
            lesson.package = package
            lesson.title = definition["title"]
            lesson.description = definition["description"]
            lesson.competency_code = definition["competency_code"]
            lesson.competency_description = definition["competency"]
            lesson.estimated_duration_seconds = 15 * 60
            lesson.status = Lesson.Status.APPROVED
            lesson.archived_at = None
            lesson.save()

            # Preserve duplicate records for audit/history while ensuring only one active lesson.
            matches.exclude(pk=lesson.pk).update(status=Lesson.Status.ARCHIVED, archived_at=timezone.now())
            existing_slides = {slide.position: slide for slide in lesson.slides.select_related("activity")}
            for position, screen in enumerate(definition["slides"]):
                config = dict(screen["configuration"])
                config["lesson_metadata"] = {
                    "lesson_id": definition["lesson_id"],
                    "official_competency": definition["competency"],
                    "competency_code": definition["competency_code"],
                    "assessment": definition["assessment"],
                    "content_status": "Proposed for SPED expert validation",
                }
                error = validate_activity_configuration(screen["type"], config)
                if error:
                    raise CommandError(f'{definition["lesson_id"]} screen {position + 1}: {error}')
                slide = existing_slides.pop(position, None)
                if slide is None:
                    activity = Activity.objects.create(type=screen["type"], title=screen["title"], configuration=config)
                    Slide.objects.create(lesson=lesson, position=position, title=screen["title"], activity=activity)
                else:
                    activity = slide.activity
                    activity.type = screen["type"]
                    activity.title = screen["title"]
                    activity.configuration = config
                    activity.asset = None
                    activity.save()
                    slide.title = screen["title"]
                    slide.save(update_fields=["title"])
            # Definitions currently only grow or remain stable. Refuse to erase an
            # exposed historical slide if a future definition becomes shorter.
            if existing_slides:
                raise CommandError(f'{definition["lesson_id"]} has obsolete slides; archive them through a reviewed migration.')
            self.stdout.write(f'{definition["lesson_id"]}: {lesson.title} ({len(definition["slides"])} screens)')
        self.stdout.write(self.style.SUCCESS("CARE-01--CARE-03 synchronized successfully."))
