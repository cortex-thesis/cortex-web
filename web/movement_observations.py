"""Authorized, append-only teacher observations; never inferred from digital sequencing."""
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_http_methods
from .models import AuditLog, Enrollment, Lesson, Profile, SchoolClass
from .views import _body, _require_profile

OUTCOMES = {'observed', 'adapted_observed', 'not_yet', 'declined'}

@require_http_methods(['GET', 'POST'])
def movement_observations(request, class_id, student_id):
    profile, error = _require_profile(request, {Profile.Role.TEACHER, Profile.Role.STUDENT})
    if error: return error
    section = get_object_or_404(SchoolClass, pk=class_id)
    if profile.role == Profile.Role.TEACHER and section.teacher_id != profile.pk:
        return JsonResponse({'detail': 'You do not teach this class.'}, status=403)
    if profile.role == Profile.Role.STUDENT and profile.pk != student_id:
        return JsonResponse({'detail': 'You may only read your own observations.'}, status=403)
    get_object_or_404(Enrollment, school_class=section, student_id=student_id, removed_at__isnull=True)
    lessons = Lesson.objects.filter(package__slug='enrichment', competency_code='TPEP-dc-NG-4', archived_at__isnull=True, package__class_assignments__school_class=section)
    if request.method == 'POST':
        if profile.role != Profile.Role.TEACHER: return JsonResponse({'detail': 'Only the assigned teacher can record an observation.'}, status=403)
        try:
            data = _body(request)
            lesson = lessons.get(pk=data.get('lesson_id'))
            outcome, note = data['outcome'], data.get('note', '')
            if outcome not in OUTCOMES or not isinstance(note, str) or len(note) > 500 or data.get('confirmed') is not True: raise ValueError
        except (ValueError, TypeError, KeyError, Lesson.DoesNotExist):
            return JsonResponse({'detail': 'Choose a valid lesson and observation outcome, confirm direct observation, and use at most 500 note characters.'}, status=400)
        AuditLog.objects.create(actor=profile, action='movement_observation', object_type='Lesson', object_id=str(lesson.pk), metadata={'class_id': section.pk, 'student_id': student_id, 'outcome': outcome, 'note': note, 'criterion': 'Perform basic dance steps /movements', 'source': 'teacher_direct_observation'})
    records = AuditLog.objects.filter(action='movement_observation', metadata__class_id=section.pk, metadata__student_id=student_id).select_related('actor').order_by('-created_at')[:50]
    return JsonResponse({'lessons': [{'id': l.pk, 'title': l.title} for l in lessons], 'observations': [{'id': r.pk, 'lesson_id': int(r.object_id), 'teacher': r.actor.display_name if r.actor else None, 'at': r.created_at, **r.metadata} for r in records]})
