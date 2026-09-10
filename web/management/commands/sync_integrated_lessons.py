import json
from pathlib import Path

from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from web.lesson_assets import attach_definitions
from web.activity_templates import validate_activity_configuration
from web.models import Activity, ClassPackage, CurriculumPackage, Lesson, Profile, SchoolClass, Slide


class Command(BaseCommand):
    help = 'Publish all 21 integrated lessons without resetting accounts, classes or session history.'

    def add_arguments(self, parser):
        parser.add_argument('--owner', help='Username of the content owner; defaults to an administrator.')

    @transaction.atomic
    def handle(self, *args, **options):
        for package in ('care', 'life', 'prev', 'live', 'func', 'career'):
            call_command(f'sync_{package}_lessons', owner=options['owner'], stdout=self.stdout)
        owners = Profile.objects.select_related('user')
        owner = owners.filter(user__username=options['owner']).first() if options['owner'] else owners.filter(role=Profile.Role.ADMIN).order_by('pk').first()
        if owner is None:
            raise CommandError('A content owner is required.')
        package, _ = CurriculumPackage.objects.update_or_create(slug='enrichment', defaults={'name': 'Enrichment', 'is_active': True})
        definitions = json.loads((Path(__file__).resolve().parents[2] / 'enrichment_lessons.json').read_text(encoding='utf-8'))
        attach_definitions(definitions)
        for definition in definitions:
            lesson, _ = Lesson.objects.get_or_create(package=package, competency_code=definition['competency_code'], defaults={'created_by': owner, 'title': definition['title']})
            lesson.title = definition['title']
            lesson.description = definition['description']
            lesson.status, lesson.archived_at = Lesson.Status.APPROVED, None
            lesson.save()
            existing = {slide.position: slide for slide in lesson.slides.select_related('activity')}
            for position, screen in enumerate(definition['slides']):
                config = screen['configuration']
                error = validate_activity_configuration(screen['type'], config)
                if error:
                    raise CommandError(f"{definition['lesson_id']}: {error}")
                slide = existing.pop(position, None)
                if slide:
                    activity = slide.activity
                    activity.type, activity.title, activity.configuration = screen['type'], screen['title'], config
                    activity.save()
                    slide.title = screen['title']
                    slide.save(update_fields=['title'])
                else:
                    activity = Activity.objects.create(type=screen['type'], title=screen['title'], configuration=config)
                    Slide.objects.create(lesson=lesson, position=position, title=screen['title'], activity=activity)
            if existing:
                raise CommandError('Obsolete slides require a reviewed migration; no content was changed.')
            self.stdout.write(f"{definition['lesson_id']}: {lesson.title} ({len(definition['slides'])} screens)")
        ClassPackage.objects.bulk_create([
            ClassPackage(school_class_id=class_id, package_id=package_id)
            for class_id in SchoolClass.objects.values_list('pk', flat=True)
            for package_id in CurriculumPackage.objects.filter(is_active=True).values_list('pk', flat=True)
        ], ignore_conflicts=True)
        self.stdout.write(self.style.SUCCESS('All integrated lessons are available to enrolled students.'))
