"""Version garden activity 4 in LIVE-01/03; preserve prior definitions and evidence."""
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from django.conf import settings
from django.core import serializers
from django.core.management import call_command
from django.db import transaction
from web.live_lessons import LIVE_LESSONS
from web.models import Lesson

assert not settings.TEMPLATE_ONLY and 'postgresql' in settings.DATABASES['default']['ENGINE']
with transaction.atomic():
    for definition in (LIVE_LESSONS[0], LIVE_LESSONS[2]):
        lesson = Lesson.objects.select_for_update().get(competency_code=definition['competency_code'], archived_at__isnull=True)
        slides = list(lesson.slides.select_related('activity'))
        old_ids = {s.pk for s in slides}
        backup = Path(settings.BASE_DIR) / '.runtime/backups' / (definition['lesson_id'].lower() + '-garden-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
        backup.mkdir(parents=True)
        (backup / 'definitions.json').write_text(serializers.serialize('json', [lesson] + slides + [s.activity for s in slides], indent=2), encoding='utf-8')
        old = next(s for s in slides if s.position == 3)
        target = definition['slides'][3]['configuration']
        if old.activity.configuration.get('screen_key') != target['screen_key']:
            preserved = deepcopy(old.activity.configuration)
            preserved.update(optional_review=True, digital_garden_history=True, history_note='Replaced by garden action practice; retained for historical evidence')
            old.activity.configuration = preserved
            old.activity.save(update_fields=['configuration'])
            old.position = max(s.position for s in slides) + 1
            old.save(update_fields=['position'])
        call_command('sync_live_lessons', lesson=definition['lesson_id'])
        assert old_ids <= set(lesson.slides.values_list('pk', flat=True))
        core = [s for s in lesson.slides.select_related('activity') if not s.activity.configuration.get('optional_review')]
        assert len(core) == 9
        print(definition['lesson_id'], 'garden activity saved with history retained. Backup:', backup)
