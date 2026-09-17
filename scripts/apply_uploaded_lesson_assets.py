"""Apply concrete classroom PNGs without reseeding LIFE lesson content."""
from django.db import transaction
from web.lesson_assets import attach_local_assets
from web.models import Lesson, LessonPracticeProgress

@transaction.atomic
def run():
    before = list(LessonPracticeProgress.objects.order_by('pk').values('pk', 'completed_slide_ids', 'activity_evidence'))
    count = 0
    for lesson in Lesson.objects.filter(competency_code='TPLS_CS-li-NG-4'):
        for slide in lesson.slides.select_related('activity'):
            count += attach_local_assets(slide.activity.configuration)
            slide.activity.save(update_fields=['configuration'])
    assert before == list(LessonPracticeProgress.objects.order_by('pk').values('pk', 'completed_slide_ids', 'activity_evidence'))
    print(f'Attached {count} classroom images; saved progress unchanged.')
