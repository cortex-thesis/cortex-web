"""Back up and update only LIVE-01, retaining slide IDs and learner history."""
from datetime import datetime, timezone
from pathlib import Path
from django.conf import settings
from django.core import serializers
from django.core.management import call_command
from django.db import transaction
from web.models import Activity, Lesson, Slide
from web.live_lessons import LIVE_LESSONS

assert not settings.TEMPLATE_ONLY and 'postgresql' in settings.DATABASES['default']['ENGINE']
with transaction.atomic():
    lessons = list(Lesson.objects.select_for_update().filter(competency_code=LIVE_LESSONS[0]['competency_code'], archived_at__isnull=True))
    assert len(lessons) == 1, 'Expected one active LIVE-01 lesson'
    slides = list(Slide.objects.filter(lesson=lessons[0]))
    old_ids = {s.pk for s in slides}
    old_activity_ids = {s.activity_id for s in slides}
    backup = Path(settings.BASE_DIR) / '.runtime/backups' / ('live01-refresh-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
    backup.mkdir(parents=True)
    (backup / 'lesson-definitions.json').write_text(serializers.serialize('json', lessons + slides + list(Activity.objects.filter(pk__in=old_activity_ids)), indent=2), encoding='utf-8')
    call_command('sync_live_lessons', lesson='LIVE-01')
    assert old_ids <= set(Slide.objects.filter(lesson=lessons[0]).values_list('pk', flat=True))
    assert old_activity_ids <= set(Activity.objects.values_list('pk', flat=True))
    print('LIVE-01 updated; existing IDs retained. Backup:', backup)
