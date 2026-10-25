"""Apply six reviewed display-only refinements to restored lesson identities."""
import json
from pathlib import Path
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from web.activity_templates import validate_activity_configuration
from web.models import AuditLog, Lesson

ROOT = Path(__file__).resolve().parents[2]


class Command(BaseCommand):
    help = 'Refine one existing screen per restored lesson without altering assessment or progress.'

    def add_arguments(self, parser):
        parser.add_argument('--publication', type=int, required=True)

    @transaction.atomic
    def handle(self, *args, **options):
        publication = AuditLog.objects.get(pk=options['publication'], action='creative_publication')
        if not AuditLog.objects.filter(action='career_enrichment_restoration', object_id=str(publication.pk)).exists():
            raise CommandError('Restore and verify the original lessons first.')
        if AuditLog.objects.filter(action='restored_lesson_refinements', object_id=str(publication.pk)).exists():
            self.stdout.write('Refinements already applied.'); return
        patches = json.loads((ROOT / 'restored_lesson_refinements.json').read_text(encoding='utf-8'))
        enrichment = {d['lesson_id']: d for d in json.loads((ROOT / 'enrichment_lessons.json').read_text(encoding='utf-8'))}
        originals = {p['lesson_id']: p['previous'][0] for p in publication.metadata['lessons']}
        snapshots = []
        for patch in patches:
            lesson = Lesson.objects.select_for_update().get(pk=originals[patch['lesson_id']], status='approved', archived_at__isnull=True)
            if lesson.slides.count() != 8:
                raise CommandError('Expected the verified eight-slide baseline.')
            if set(patch['changes']) - {'question', 'steps', 'content_description', 'correct_feedback', 'retry_feedback'}:
                raise CommandError('Only reviewed display changes are allowed.')
            for slide in lesson.slides.select_related('activity').order_by('position'):
                config = dict(slide.activity.configuration)
                changed = False
                if slide.position == patch['position']:
                    snapshots.append({'lesson_id': lesson.pk, 'slide_id': slide.pk, 'activity_id': slide.activity_id,
                                      'previous_configuration': config.copy(), 'changes': patch['changes']})
                    config.update(patch['changes']); changed = True
                if patch['lesson_id'] in enrichment:
                    official = enrichment[patch['lesson_id']]
                    config['lesson_metadata'] = official['slides'][slide.position]['configuration']['lesson_metadata']
                    changed = True
                if changed:
                    error = validate_activity_configuration(slide.activity.type, config)
                    if error: raise CommandError(error)
                    slide.activity.configuration = config
                    slide.activity.save(update_fields=['configuration'])
        AuditLog.objects.create(action='restored_lesson_refinements', object_type='AuditLog', object_id=str(publication.pk),
                                metadata={'changes': snapshots, 'assessment_identities_unchanged': True})
        self.stdout.write('Refined exactly one screen per original lesson; answer keys and evidence unchanged.')
