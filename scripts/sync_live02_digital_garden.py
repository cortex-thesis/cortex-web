"""Replace two LIVE-02 activities while retaining old definitions as history reviews."""
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from django.conf import settings
from django.core import serializers
from django.core.management import call_command
from django.db import transaction
from web.live_lessons import LIVE_LESSONS
from web.models import Activity, Lesson, Slide

assert not settings.TEMPLATE_ONLY and 'postgresql' in settings.DATABASES['default']['ENGINE']
with transaction.atomic():
    lesson = Lesson.objects.select_for_update().get(competency_code=LIVE_LESSONS[1]['competency_code'], archived_at__isnull=True)
    slides = list(lesson.slides.select_related('activity'))
    old_ids = {s.pk for s in slides}
    backup = Path(settings.BASE_DIR) / '.runtime/backups' / ('live02-garden-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
    backup.mkdir(parents=True)
    (backup / 'definitions.json').write_text(serializers.serialize('json', [lesson] + slides + [s.activity for s in slides], indent=2), encoding='utf-8')
    next_position = max(s.position for s in slides) + 1
    for slide in slides:
        if slide.position not in (3, 4):
            continue
        config = slide.activity.configuration
        upgraded = config.get('task_template') == 'garden_kit' or any(row.get('scene') for row in config.get('missions', []))
        if upgraded:
            continue
        preserved = deepcopy(config)
        preserved.update(optional_review=True, digital_garden_history=True, history_note='Replaced by digital garden action practice; retained for historical evidence')
        slide.activity.configuration = preserved
        slide.activity.save(update_fields=['configuration'])
        slide.position = next_position
        slide.save(update_fields=['position'])
        next_position += 1
    call_command('sync_live_lessons', lesson='LIVE-02')
    assert old_ids <= set(lesson.slides.values_list('pk', flat=True))
    core = [s for s in lesson.slides.select_related('activity') if not s.activity.configuration.get('optional_review')]
    assert len(core) == 9
    print('LIVE-02 digital garden saved. Prior activity IDs/history retained; new activities have fresh IDs. Backup:', backup)
