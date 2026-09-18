"""Back up and update only shared PREV-03 plus supplied unsure-picture slots."""
from datetime import datetime, timezone
from pathlib import Path

from django.conf import settings
from django.core import serializers
from django.core.management import call_command
from django.db import transaction
from web.models import Activity, Lesson, Slide
from web.prev_lessons import PREV_LESSONS

assert not settings.TEMPLATE_ONLY and 'postgresql' in settings.DATABASES['default']['ENGINE']
code = PREV_LESSONS[2]['competency_code']
with transaction.atomic():
    lessons = list(Lesson.objects.select_for_update().filter(competency_code=code, archived_at__isnull=True))
    assert len(lessons) == 1, 'Expected one shared PREV-03 lesson'
    slides = list(Slide.objects.filter(lesson=lessons[0]).select_related('activity'))
    old_ids = {slide.pk for slide in slides}
    old_activities = {slide.activity_id for slide in slides}
    unsure_ids = Slide.objects.filter(lesson__competency_code__in=[d['competency_code'] for d in PREV_LESSONS[:2]], lesson__archived_at__isnull=True).values_list('activity_id', flat=True)
    unsure_activities = list(Activity.objects.select_for_update().filter(pk__in=unsure_ids))
    backup = Path(settings.BASE_DIR) / '.runtime' / 'backups' / ('prev03-refresh-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
    backup.mkdir(parents=True)
    objects = lessons + slides + list(Activity.objects.filter(pk__in=old_activities)) + unsure_activities
    (backup / 'lesson-definitions.json').write_text(serializers.serialize('json', objects, indent=2), encoding='utf-8')
    call_command('sync_prev_lessons', lesson='PREV-03')
    assert old_ids <= set(Slide.objects.filter(lesson=lessons[0]).values_list('pk', flat=True))
    assert old_activities <= set(Activity.objects.values_list('pk', flat=True))
    updated = 0
    for activity in unsure_activities:
        config = dict(activity.configuration)
        items = [dict(item) for item in config.get('items', [])]
        if not any(item.get('id') == 'unsure' for item in items):
            continue
        for item in items:
            if item.get('id') == 'unsure':
                item['image_url'] = '/assets/pre-vocational/common/not-sure-yet.png'
        config['items'] = items
        activity.configuration = config
        activity.save(update_fields=['configuration'])
        updated += 1
    print('Backed up definitions to:', backup)
    print('Shared PREV-03 upgraded; existing slide/activity IDs retained. Unsure picture slots updated:', updated)
