"""Back up and transactionally sync the user-approved eight shared lessons."""
import json
from datetime import datetime, timezone
from pathlib import Path
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import serializers
from django.core.management import call_command
from django.db import connection, transaction
from web.care_lessons import CARE_LESSONS
from web.life_lessons import LIFE_LESSONS
from web.prev_lessons import PREV_LESSONS
from web.models import Activity, ActivityResponse, CurriculumPackage, Enrollment, LearningSession, Lesson, LessonPracticeProgress, Profile, Slide


def run():
    assert connection.vendor == 'postgresql', 'This audit is only for the approved shared PostgreSQL database.'
    assert not settings.TEMPLATE_ONLY
    definitions = CARE_LESSONS + LIFE_LESSONS + PREV_LESSONS[:2]
    codes = [row['competency_code'] for row in definitions]
    backup_dir = settings.BASE_DIR / '.runtime' / 'backups' / datetime.now(timezone.utc).strftime('shared-lessons-%Y%m%dT%H%M%S%fZ')
    backup_dir.mkdir(parents=True, exist_ok=False)
    protected = [get_user_model(), Profile, Enrollment, LessonPracticeProgress, ActivityResponse, LearningSession]
    def snapshot():
        return {model._meta.label: list(model.objects.order_by('pk').values()) for model in protected}
    with transaction.atomic():
        lessons = list(Lesson.objects.select_for_update().filter(competency_code__in=codes).order_by('pk'))
        assert len(lessons) == 8, 'Expected exactly eight lessons; resolve duplicates before syncing.'
        ids = [row.pk for row in lessons]
        slides = list(Slide.objects.filter(lesson_id__in=ids).order_by('pk'))
        activity_ids = [row.activity_id for row in slides]
        packages = list(CurriculumPackage.objects.filter(pk__in={row.package_id for row in lessons}))
        objects = packages + lessons + list(Activity.objects.filter(pk__in=activity_ids).order_by('pk')) + slides
        with (backup_dir / 'lesson-definitions.json').open('w', encoding='utf-8') as stream:
            serializers.serialize('json', objects, stream=stream, indent=2)
        (backup_dir / 'manifest.json').write_text(json.dumps({'codes': codes, 'lesson_ids': ids, 'slide_ids': [s.pk for s in slides], 'purpose': 'Before user-approved CARE/LIFE/PREV-01/02 sync; lesson configuration backup, not a full database backup.'}, indent=2), encoding='utf-8')
        before = snapshot()
        unrelated = list(Slide.objects.exclude(lesson_id__in=ids).order_by('pk').values('pk','position','title','activity__configuration','activity_id'))
        old_pairs = {s.pk:s.activity_id for s in slides}
        call_command('sync_care_lessons', preserve_history=True)
        call_command('sync_life_lessons')
        call_command('sync_prev_lessons', lesson='PREV-01')
        call_command('sync_prev_lessons', lesson='PREV-02')
        assert before == snapshot(), 'Protected accounts/progress/session data changed; rolled back.'
        assert unrelated == list(Slide.objects.exclude(lesson_id__in=ids).order_by('pk').values('pk','position','title','activity__configuration','activity_id')), 'Unrelated slides changed; rolled back.'
        current_pairs = dict(Slide.objects.filter(lesson_id__in=ids).values_list('pk','activity_id'))
        assert all(current_pairs.get(pk) == aid for pk,aid in old_pairs.items()), 'Historical slide/activity identities changed; rolled back.'
        assert set(Lesson.objects.filter(competency_code__in=codes).values_list('pk',flat=True)) == set(ids)
        for lesson in Lesson.objects.filter(pk__in=ids).prefetch_related('slides__activity').order_by('pk'):
            active = [s for s in lesson.slides.all() if not s.activity.configuration.get('optional_review')]
            print(lesson.title + ': ' + str(len(active)) + ' active slides')
    print('Shared sync committed. Accounts, progress, sessions, old slide/activity IDs and unrelated lesson configurations preserved.')
    print('Definition backup:', backup_dir / 'lesson-definitions.json')
