"""Run through manage.py shell: additive migration + scoped sync + ID/progress audit."""
from django.core.management import call_command
from web.care_lessons import CARE_LESSONS
from web.life_lessons import LIFE_LESSONS
from web.models import Lesson, LessonPracticeProgress


def run():
    codes = [lesson['competency_code'] for lesson in CARE_LESSONS + LIFE_LESSONS]
    lessons = Lesson.objects.filter(competency_code__in=codes, archived_at__isnull=True)
    ids = {lesson.pk: list(lesson.slides.values_list('pk', 'activity_id', 'position')) for lesson in lessons}
    progress = list(LessonPracticeProgress.objects.filter(lesson_id__in=ids).order_by('pk').values_list('pk', 'completed_slide_ids'))
    call_command('migrate', 'web', '0022_practice_activity_evidence', interactive=False)
    call_command('sync_care_lessons')
    call_command('sync_life_lessons')
    after = {lesson.pk: list(lesson.slides.values_list('pk', 'activity_id', 'position')) for lesson in Lesson.objects.filter(pk__in=ids)}
    assert ids == after, 'Existing slide/activity IDs or positions changed'
    assert progress == list(LessonPracticeProgress.objects.filter(lesson_id__in=ids).order_by('pk').values_list('pk', 'completed_slide_ids')), 'Saved practice progress changed'
    assert Lesson.objects.filter(competency_code__in=codes, archived_at__isnull=True).count() == 6
    print(f'Verified: {len(ids)} existing lesson IDs, {sum(map(len, ids.values()))} slide/activity IDs, and {len(progress)} practice-progress records preserved.')
