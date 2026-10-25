"""Publish only the six creative journeys without rewriting historical activities."""
import hashlib
import json
from pathlib import Path
from django.core.management.base import BaseCommand, CommandError
from django.core import serializers
from django.db import transaction
from django.utils import timezone
from web.activity_templates import validate_activity_configuration
from web.models import Activity, AuditLog, ContentAssignment, CurriculumPackage, Lesson, Profile, Slide

DEFINITIONS = Path(__file__).resolve().parents[2] / 'creative_lessons.json'

class Command(BaseCommand):
    help = 'Version Career/Enrichment lessons, preserving old lesson, slide and response identities.'

    def add_arguments(self, parser):
        parser.add_argument('--owner')
        parser.add_argument('--dry-run', action='store_true')
        parser.add_argument('--rollback', type=int, help='Rollback one publication audit ID; definitions and evidence are retained.')

    @transaction.atomic
    def handle(self, *args, **options):
        owner = Profile.objects.filter(role=Profile.Role.ADMIN)
        owner = owner.filter(user__username=options['owner']).first() if options['owner'] else owner.order_by('pk').first()
        if not owner: raise CommandError('An administrator owner is required.')
        # Serialize publication/rollback of these packages without touching other packages.
        list(CurriculumPackage.objects.select_for_update().filter(slug__in=('career', 'enrichment')).order_by('pk'))
        if options['rollback']:
            publication = AuditLog.objects.select_for_update().get(pk=options['rollback'], action='creative_publication')
            if AuditLog.objects.filter(action='creative_publication_rollback', object_id=str(publication.pk)).exists():
                self.stdout.write('Publication already rolled back.'); return
            for pair in publication.metadata['lessons']:
                new = Lesson.objects.select_for_update().get(pk=pair['new'])
                if new.archived_at is not None:
                    raise CommandError('This publication is no longer current. Roll back newer publications first.')
                AuditLog.objects.create(actor=owner, action='creative_lesson_superseded', object_type='Lesson', object_id=str(new.pk), metadata={'rollback_of': publication.pk, 'replacement': pair['previous'][0] if pair['previous'] else None})
                new.status = Lesson.Status.ARCHIVED; new.archived_at = timezone.now(); new.save(update_fields=['status', 'archived_at'])
                for old_id in pair['previous']:
                    old = Lesson.objects.select_for_update().get(pk=old_id)
                    old.status = Lesson.Status.APPROVED; old.archived_at = None; old.save(update_fields=['status', 'archived_at'])
            AuditLog.objects.create(actor=owner, action='creative_publication_rollback', object_type='AuditLog', object_id=str(publication.pk))
            self.stdout.write('Previous definitions restored; all evidence retained.'); return
        definitions = json.loads(DEFINITIONS.read_text(encoding='utf-8'))
        fingerprint = hashlib.sha256(json.dumps(definitions, sort_keys=True, separators=(',', ':')).encode('utf-8')).hexdigest()
        for definition in definitions:
            if not 1 <= len(definition['slides']) <= 8: raise CommandError('Creative journeys require at most eight slides.')
            for slide in definition['slides']:
                if slide['configuration'].get('content_version') != definition['version']:
                    raise CommandError('Every screen must carry its lesson content version.')
                error = validate_activity_configuration(slide['type'], slide['configuration'])
                if error: raise CommandError(f"{definition['lesson_id']}: {error}")
        previous_publication = AuditLog.objects.filter(action='creative_publication', metadata__fingerprint=fingerprint).order_by('-pk').first()
        if previous_publication and not AuditLog.objects.filter(action='creative_publication_rollback', object_id=str(previous_publication.pk)).exists():
            self.stdout.write('This exact creative revision is already published.'); return
        for definition in definitions:
            current = Lesson.objects.filter(package__slug=definition['package'], competency_code=definition['competency_code'], archived_at__isnull=True, slides__activity__configuration__content_version=definition['version']).exists()
            if current:
                raise CommandError('This content version already exists with different definitions. Increment the version before publishing changes.')
        if options['dry_run']:
            self.stdout.write('Validated six journeys (at most eight slides each); no data changed.'); return
        changes = []
        for definition in definitions:
            package = CurriculumPackage.objects.get(slug=definition['package'])
            aliases = [definition['lesson_id'], definition['competency_code']]
            old_lessons = list(Lesson.objects.select_for_update().filter(package=package, competency_code__in=aliases, status=Lesson.Status.APPROVED, archived_at__isnull=True))
            # No slide or activity on the old lesson is updated, moved or deleted.
            new = Lesson.objects.create(package=package, title=definition['title'], description=definition['description'], competency_code=definition['competency_code'], competency_description=definition['competency'], created_by=owner, status=Lesson.Status.APPROVED, estimated_duration_seconds=900)
            for position, screen in enumerate(definition['slides']):
                activity = Activity.objects.create(type=screen['type'], title=screen['title'], configuration=screen['configuration'])
                Slide.objects.create(lesson=new, activity=activity, title=screen['title'], position=position)
            for old in old_lessons:
                for assignment in old.assignments.all():
                    ContentAssignment.objects.get_or_create(lesson=new, school_class=assignment.school_class, student=assignment.student, defaults={'assigned_by': assignment.assigned_by})
                # A per-lesson immutable snapshot also identifies resumable legacy practice.
                AuditLog.objects.create(actor=owner, action='creative_lesson_superseded', object_type='Lesson', object_id=str(old.pk), metadata={'replacement': new.pk, 'definition': serializers.serialize('json', [old] + list(old.slides.all()) + [s.activity for s in old.slides.select_related('activity')])})
                old.status = Lesson.Status.ARCHIVED; old.archived_at = timezone.now(); old.save(update_fields=['status', 'archived_at'])
            changes.append({'lesson_id': definition['lesson_id'], 'new': new.pk, 'previous': [l.pk for l in old_lessons]})
        audit = AuditLog.objects.create(actor=owner, action='creative_publication', object_type='CurriculumPackage', object_id='career,enrichment', metadata={'fingerprint': fingerprint, 'lessons': changes, 'version': definitions[0]['version']})
        self.stdout.write(self.style.SUCCESS(f'Published six versioned journeys. Publication audit ID: {audit.pk}. Historical progress is unchanged.'))
