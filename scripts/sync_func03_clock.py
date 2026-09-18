"""Back up and version FUNC-03 alone; preserve every old slide and evidence ID."""
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from django.conf import settings
from django.core import serializers
from django.core.management import call_command
from django.db import transaction
from web.func_lessons import FUNC_LESSONS
from web.models import Lesson

assert not settings.TEMPLATE_ONLY and 'postgresql' in settings.DATABASES['default']['ENGINE']
with transaction.atomic():
    lesson = Lesson.objects.select_for_update().get(competency_code=FUNC_LESSONS[2]['competency_code'], archived_at__isnull=True)
    slides = list(lesson.slides.select_related('activity'))
    old_ids = {row.pk for row in slides}
    backup = Path(settings.BASE_DIR) / '.runtime/backups' / ('func03-clock-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
    backup.mkdir(parents=True)
    (backup / 'definitions.json').write_text(serializers.serialize('json', [lesson] + slides + [row.activity for row in slides], indent=2), encoding='utf-8')
    next_position = max(row.position for row in slides) + 1
    for row in slides:
        if row.activity.configuration.get('optional_review') or row.activity.configuration.get('screen_key', '').startswith('clock-'):
            continue
        config = deepcopy(row.activity.configuration)
        config.update(optional_review=True, digital_activity_history=True, history_note='Replaced by clock lab; retained for historical evidence')
        row.activity.configuration = config
        row.activity.save(update_fields=['configuration'])
        row.position = next_position
        row.save(update_fields=['position'])
        next_position += 1
    call_command('sync_func_lessons', lesson='FUNC-03')
    assert old_ids <= set(lesson.slides.values_list('pk', flat=True))
    assert sum(not row.activity.configuration.get('optional_review') for row in lesson.slides.select_related('activity')) == 8
    print('FUNC-03 clock lab saved with previous IDs/history retained. Backup:', backup)
