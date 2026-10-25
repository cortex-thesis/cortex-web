from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET
from .models import ActivityResponse, Enrollment, LessonPracticeProgress, Profile, SchoolClass
from .views import _require_profile
import json

@require_GET
def creative_collection(request, class_id):
    profile, error = _require_profile(request, {Profile.Role.STUDENT})
    if error: return error
    section = get_object_or_404(SchoolClass, pk=class_id, status=SchoolClass.Status.ACTIVE)
    get_object_or_404(Enrollment, school_class=section, student=profile, removed_at__isnull=True)
    package = request.GET.get('package')
    if package not in ('career','enrichment'): return JsonResponse({'detail':'Choose Career or Enrichment.'},status=400)
    entries = {}
    def add(key, activity, selected, at):
        config=activity.configuration
        if config.get('task_template')!='creative_experience' or not config.get('content_version'): return
        try:
            value=json.loads(selected)
            if not isinstance(value,dict) or value.get('version') != config.get('content_version'):return
        except (ValueError,TypeError):return
        if key not in entries or entries[key]['at']<at:
            entries[key]={'key':key,'title':activity.title,'mode':config['experience']['mode'],'selected':selected,'at':at,'items':config['experience'].get('items',[]),'categories':config['experience'].get('categories',[]),'stations':config['experience'].get('stations',[])}
    for progress in LessonPracticeProgress.objects.filter(student=profile,school_class=section,lesson__package__slug=package).select_related('lesson').prefetch_related('lesson__slides__activity'):
        for slide in progress.lesson.slides.all():
            saved=progress.activity_evidence.get(str(slide.pk),{})
            if saved.get('selected'):add(str(slide.pk),slide.activity,saved['selected'],progress.updated_at)
    for response in ActivityResponse.objects.filter(session__student=profile,session__school_class=section,session__lesson__package__slug=package,activity__configuration__task_template='creative_experience').select_related('activity','session').order_by('-pk')[:100]:
        add(str(response.activity_id)+'-session',response.activity,response.response.get('selected'),response.answered_at)
    return JsonResponse({'entries':sorted(entries.values(),key=lambda row:row['at'])})
