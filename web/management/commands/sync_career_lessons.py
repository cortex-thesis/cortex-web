from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from web.activity_templates import validate_activity_configuration
from web.career_lessons import CAREER_LESSONS
from web.models import Activity, CurriculumPackage, Lesson, Profile, Slide


class Command(BaseCommand):
    help = "Idempotently create or update CAREER-01--CAREER-03."

    def add_arguments(self, parser):
        parser.add_argument("--owner")

    @transaction.atomic
    def handle(self, *args, **options):
        if Lesson.objects.filter(package__slug='career', archived_at__isnull=True, slides__activity__configuration__task_template='creative_experience').exists():
            raise CommandError('Creative journeys are versioned. Use publish_creative_lessons instead of positional synchronization.')
        profiles = Profile.objects.select_related("user")
        owner = profiles.filter(user__username=options["owner"]).first() if options["owner"] else profiles.filter(role=Profile.Role.ADMIN).order_by("pk").first()
        if owner is None:
            raise CommandError("An owner profile is required. Create an administrator or pass --owner USERNAME.")
        package, _ = CurriculumPackage.objects.update_or_create(slug="career", defaults={"name": "Career", "domain_focus": "Career profiles, possible work pathways, and workplace attitudes", "is_active": True})
        for definition in CAREER_LESSONS:
            matches = Lesson.objects.filter(package=package, archived_at__isnull=True, competency_code=definition["competency_code"]).order_by("pk")
            lesson = matches.first() or Lesson(created_by=owner)
            guarded_positions = {'CAREER-01': (1, 5), 'CAREER-03': (3, 4)}
            if lesson.pk and definition['lesson_id'] in guarded_positions:
                positions = guarded_positions[definition['lesson_id']]
                revision = definition['slides'][positions[0]]['configuration'].get('publication_revision')
                current = {slide.position: slide.activity.configuration for slide in lesson.slides.select_related('activity')}
                if all(current.get(position, {}).get('publication_revision') == revision for position in positions):
                    self.stdout.write(f"{definition['lesson_id']}: retaining the published version and its activity identities.")
                    continue
                publisher = 'publish_career01_revision' if definition['lesson_id'] == 'CAREER-01' else 'publish_career03_revision'
                raise CommandError(f"Existing {definition['lesson_id']} must be versioned with {publisher}; positional replacement is not safe.")
            lesson.package, lesson.title, lesson.description = package, definition["title"], definition["description"]
            lesson.competency_code, lesson.competency_description = definition["competency_code"], definition["competency"]
            lesson.estimated_duration_seconds, lesson.status, lesson.archived_at = 15 * 60, Lesson.Status.APPROVED, None
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
        self.stdout.write(self.style.SUCCESS("CAREER-01--CAREER-03 synchronized successfully."))
