"""Back up only LIVE-02/03; preserve learner data and all existing slide IDs."""
from datetime import datetime, timezone
from pathlib import Path
from django.conf import settings
from django.core import serializers
from django.core.management import call_command
from django.db import transaction
from web.models import Activity, Lesson, Slide
from web.live_lessons import LIVE_LESSONS

assert not settings.TEMPLATE_ONLY and 'postgresql' in settings.DATABASES['default']['ENGINE']
codes = [definition['competency_code'] for definition in LIVE_LESSONS[1:]]
with transaction.atomic():
    lessons = list(Lesson.objects.select_for_update().filter(competency_code__in=codes, archived_at__isnull=True))
    assert len(lessons) == 2, 'Expected one active lesson per competency'
    slides = list(Slide.objects.filter(lesson__in=lessons))
    old_ids = {s.pk for s in slides}
    old_activities = {s.activity_id for s in slides}
    backup = Path(settings.BASE_DIR) / '.runtime/backups' / ('live23-refresh-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
    backup.mkdir(parents=True)
    (backup / 'lesson-definitions.json').write_text(serializers.serialize('json', lessons + slides + list(Activity.objects.filter(pk__in=old_activities)), indent=2), encoding='utf-8')
    for lesson_id in ('LIVE-02', 'LIVE-03'):
        call_command('sync_live_lessons', lesson=lesson_id)
    assert old_ids <= set(Slide.objects.filter(lesson__in=lessons).values_list('pk', flat=True))
    assert old_activities <= set(Activity.objects.values_list('pk', flat=True))
    print('LIVE-02/03 updated; existing slide/activity IDs retained. Backup:', backup)
