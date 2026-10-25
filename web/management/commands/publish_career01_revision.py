"""Publish just the two CAREER-01 replacements without reusing evidence identities."""
import hashlib
import json
from copy import deepcopy
from pathlib import Path

from django.core import serializers
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from web.activity_templates import validate_activity_configuration
from web.models import Activity, AuditLog, ContentAssignment, CurriculumPackage, Lesson, Slide

DEFINITION = Path(__file__).resolve().parents[2] / 'career01_revision.json'


def snapshot(lesson, slides):
    return serializers.serialize('json', [lesson] + slides + [slide.activity for slide in slides])


class Command(BaseCommand):
    help = 'Version CAREER-01 only, preserving all old slides, evidence and sessions.'
    definition_path = DEFINITION
    publication_action = 'career01_publication'

    def add_arguments(self, parser):
        parser.add_argument('--source-lesson', type=int, required=True)
        parser.add_argument('--expected-source-sha256')
        parser.add_argument('--dry-run', action='store_true')

    @transaction.atomic
    def handle(self, *args, **options):
        definition = json.loads(self.definition_path.read_text(encoding='utf-8'))
        lesson_code = definition['lesson_id']
        positions = sorted(int(position) for position in definition['replacements'])
        # Same package lock as the existing publisher; no other lesson is rewritten.
        CurriculumPackage.objects.select_for_update().get(slug='career')
        old = Lesson.objects.select_for_update().select_related('package').get(pk=options['source_lesson'])
        prior = AuditLog.objects.filter(action=self.publication_action, object_type='Lesson', object_id=str(old.pk), metadata__revision=definition['revision']).first()
        if prior:
            self.stdout.write(f"Already published: lesson {prior.metadata['replacement']}.")
            return
        if old.package.slug != 'career' or old.competency_code != definition['competency_code'] or old.status != Lesson.Status.APPROVED or old.archived_at is not None:
            raise CommandError(f'Source must be the currently approved {lesson_code} lesson.')
        if Lesson.objects.filter(package=old.package, competency_code=old.competency_code, archived_at__isnull=True).exclude(pk=old.pk).exists():
            raise CommandError(f'More than one current {lesson_code} requires review.')
        slides = list(old.slides.select_for_update().select_related('activity').order_by('position'))
        if len(slides) != 8 or [slide.position for slide in slides] != list(range(8)):
            raise CommandError('Expected the existing eight-slide lesson.')
        original = snapshot(old, slides)
        fingerprint = hashlib.sha256(original.encode()).hexdigest()
        screens = []
        for index, slide in enumerate(slides):
            screen = {'type': slide.activity.type, 'title': slide.title, 'activity_title': slide.activity.title, 'configuration': deepcopy(slide.activity.configuration), 'asset_id': slide.activity.asset_id}
            delivery = {key: getattr(slide.activity, key) for key in ('cognitive_state', 'presentation_mode', 'visual_intensity', 'audio_intensity', 'pacing_level')}
            replacement = definition['replacements'].get(str(index))
            if replacement:
                screen = deepcopy(replacement) | {'asset_id': None, 'activity_title': replacement['title']}
                metadata = slide.activity.configuration.get('lesson_metadata')
                if metadata is not None:
                    screen['configuration']['lesson_metadata'] = deepcopy(metadata)
                screen['configuration']['publication_revision'] = definition['revision']
            error = validate_activity_configuration(screen['type'], screen['configuration'])
            if error:
                raise CommandError(f'Slide {index + 1}: {error}')
            screen['delivery'] = delivery
            screens.append(screen)
        if options['dry_run']:
            self.stdout.write(f'Validated {lesson_code}: eight slides, replacements {[position + 1 for position in positions]}. Source SHA256: {fingerprint}')
            return
        if options['expected_source_sha256'] != fingerprint:
            raise CommandError('Source changed or was not reviewed. Run --dry-run and pass its SHA256.')
        new = Lesson.objects.create(
            package=old.package, title=old.title, description=old.description,
            competency_code=old.competency_code, competency_description=old.competency_description,
            estimated_duration_seconds=old.estimated_duration_seconds, difficulty_level=old.difficulty_level,
            created_by=old.created_by, status=Lesson.Status.APPROVED,
        )
        for index, screen in enumerate(screens):
            activity = Activity.objects.create(type=screen['type'], title=screen['activity_title'], configuration=screen['configuration'], asset_id=screen['asset_id'], **screen['delivery'])
            Slide.objects.create(lesson=new, activity=activity, position=index, title=screen['title'])
        for assignment in old.assignments.all():
            ContentAssignment.objects.get_or_create(lesson=new, school_class=assignment.school_class, student=assignment.student, defaults={'assigned_by': assignment.assigned_by})
        # Reuse the existing history-access audit contract. This does not enable
        # the creative UI or copy any completion/response to the new version.
        AuditLog.objects.create(actor=old.created_by, action='creative_lesson_superseded', object_type='Lesson', object_id=str(old.pk), metadata={'replacement': new.pk, 'definition': original, 'publication_kind': f'{lesson_code.lower()}_targeted_revision'})
        AuditLog.objects.create(actor=old.created_by, action=self.publication_action, object_type='Lesson', object_id=str(old.pk), metadata={'replacement': new.pk, 'revision': definition['revision'], 'source_sha256': fingerprint, 'replaced_positions': positions})
        old.status = Lesson.Status.ARCHIVED
        old.archived_at = timezone.now()
        old.save(update_fields=['status', 'archived_at'])
        self.stdout.write(f'Published {lesson_code} lesson {new.pk}; preserved lesson {old.pk} and all historical evidence. No progress copied.')
