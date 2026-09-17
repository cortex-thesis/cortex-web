"""Back up and replace only the LIVE-03 video; retain IDs and learner records."""
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from django.conf import settings
from django.core import serializers
from django.db import transaction
from web.live_lessons import LIVE_LESSONS
from web.models import Activity, Lesson, Slide

assert not settings.TEMPLATE_ONLY and 'postgresql' in settings.DATABASES['default']['ENGINE']
definition = LIVE_LESSONS[2]
screen = definition['slides'][2]
with transaction.atomic():
    lesson = Lesson.objects.get(competency_code=definition['competency_code'], archived_at__isnull=True)
    slide = Slide.objects.select_for_update().get(lesson=lesson, position=2)
    activity = Activity.objects.select_for_update().get(pk=slide.activity_id)
    assert activity.type == 'video' and activity.configuration.get('screen_key') == 'video'
    backup = Path(settings.BASE_DIR) / '.runtime/backups' / ('live03-video-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
    backup.mkdir(parents=True)
    (backup / 'video-slide.json').write_text(serializers.serialize('json', [slide, activity], indent=2), encoding='utf-8')
    config = deepcopy(activity.configuration)
    for key in ('media_url', 'content_label', 'content_description', 'video_review_status'):
        config[key] = screen['configuration'][key]
    activity.title = slide.title = screen['title']
    activity.configuration = config
    activity.save(update_fields=['title', 'configuration'])
    slide.save(update_fields=['title'])
    print('Replaced only LIVE-03 video. Slide ID retained:', slide.pk, 'Backup:', backup)
