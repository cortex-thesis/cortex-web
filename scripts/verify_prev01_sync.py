"""Non-destructive PREV-01-only content sync and preservation audit."""
from django.core.management import call_command
from web.models import Lesson, LessonPracticeProgress, Slide


def run():
    lesson=Lesson.objects.get(competency_code='TPPV-ST-NG-2',archived_at__isnull=True)
    lesson_id=lesson.pk
    old_ids=dict(lesson.slides.values_list('pk','activity_id'))
    others=list(Slide.objects.exclude(lesson=lesson).order_by('pk').values('pk','position','title','activity__configuration'))
    progress=list(LessonPracticeProgress.objects.order_by('pk').values('pk','completed_slide_ids','activity_evidence'))
    call_command('sync_prev_lessons',lesson='PREV-01')
    assert Lesson.objects.get(competency_code='TPPV-ST-NG-2',archived_at__isnull=True).pk == lesson_id
    assert all(dict(lesson.slides.values_list('pk','activity_id')).get(key) == value for key,value in old_ids.items())
    assert others == list(Slide.objects.exclude(lesson=lesson).order_by('pk').values('pk','position','title','activity__configuration'))
    assert progress == list(LessonPracticeProgress.objects.order_by('pk').values('pk','completed_slide_ids','activity_evidence'))
    print(f'Preserved lesson {lesson_id}, {len(old_ids)} existing slide/activity IDs, {len(progress)} progress records and {len(others)} unrelated slides. PREV-01 now has {lesson.slides.count()} screens.')
