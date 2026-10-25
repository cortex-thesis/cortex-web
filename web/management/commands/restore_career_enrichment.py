"""Restore a reviewed publication without rewriting any slide or learner evidence."""
import hashlib
import json
import sqlite3
from pathlib import Path

from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from web.models import AuditLog, Lesson


class Command(BaseCommand):
    help = 'Restore original Career/Enrichment identities, retaining official metadata and history.'

    def add_arguments(self, parser):
        parser.add_argument('--publication', type=int, required=True)
        parser.add_argument('--backup-manifest', required=True)

    @transaction.atomic
    def handle(self, *args, **options):
        manifest = json.loads(Path(options['backup_manifest']).read_text())
        backup = Path(manifest['path'])
        if hashlib.sha256(backup.read_bytes()).hexdigest() != manifest['sha256']:
            raise CommandError('Backup checksum mismatch.')
        with sqlite3.connect(backup.as_uri() + '?mode=ro', uri=True) as check:
            if check.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
                raise CommandError('Backup integrity check failed.')
        publication = AuditLog.objects.get(pk=options['publication'], action='creative_publication')
        pairs = publication.metadata['lessons']
        if len(pairs) != 6 or any(len(p['previous']) != 1 for p in pairs):
            raise CommandError('Expected six original lessons; review this publication separately.')
        for pair in pairs:
            old = Lesson.objects.get(pk=pair['previous'][0])
            if old.slides.count() != 8 or old.package.slug not in ('career', 'enrichment'):
                raise CommandError('Original eight-slide baseline is missing.')
        call_command('publish_creative_lessons', rollback=publication.pk, stdout=self.stdout)
        metadata = []
        for pair in pairs:
            old = Lesson.objects.get(pk=pair['previous'][0])
            revised = Lesson.objects.get(pk=pair['new'])
            old.competency_code = revised.competency_code
            old.competency_description = revised.competency_description
            old.save(update_fields=['competency_code', 'competency_description'])
            config = revised.slides.order_by('position').first().activity.configuration
            metadata.append({'lesson_id': old.pk, 'competency_code': old.competency_code,
                             'competency_description': old.competency_description,
                             'source': config.get('lesson_metadata', {}).get('source')})
        AuditLog.objects.get_or_create(action='career_enrichment_restoration', object_type='AuditLog',
            object_id=str(publication.pk), defaults={'metadata': {'backup_sha256': manifest['sha256'], 'curriculum': metadata}})
        self.stdout.write('Restored original lesson identities and official metadata; slides and evidence unchanged.')
