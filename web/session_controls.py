from datetime import timedelta

from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.http import require_http_methods

from .models import LearningSession, ManualOverride, Notification, Profile


@require_http_methods(['POST'])
def session_control(request, session_id):
    from .views import _require_profile, _body, _audit
    profile, error = _require_profile(request, {Profile.Role.STUDENT, Profile.Role.TEACHER})
    if error:
        return error
    try:
        data = _body(request)
        action = data.get('action')
    except (ValueError, AttributeError):
        return JsonResponse({'detail': 'Invalid control request.'}, status=400)
    with transaction.atomic():
        session = get_object_or_404(LearningSession.objects.select_for_update().select_related('school_class'), pk=session_id)
        if (profile.role == Profile.Role.STUDENT and session.student_id != profile.pk) or (profile.role == Profile.Role.TEACHER and session.school_class.teacher_id != profile.pk):
            return JsonResponse({'detail': 'You cannot control this session.'}, status=403)
        if session.class_session_id:
            return JsonResponse({'detail': 'Use the classroom controls for this session.'}, status=409)
        now = timezone.now()
        if action == 'heartbeat' and profile.role == Profile.Role.STUDENT:
            if not session.ended_at:
                session.last_seen_at = now
                session.save(update_fields=['last_seen_at'])
        elif profile.role == Profile.Role.TEACHER:
            if session.ended_at or not session.last_seen_at or session.last_seen_at < now - timedelta(seconds=12):
                return JsonResponse({'detail': 'This student is no longer online. Wait for them to reconnect.'}, status=409)
            if action not in ('claim', 'release', 'set_mode', 'pause', 'resume'):
                return JsonResponse({'detail': 'Unknown control action.'}, status=400)
            mode = data.get('mode')
            if action == 'set_mode' and mode not in ('focus', 'refocus', 'breathing'):
                return JsonResponse({'detail': 'Choose focus, refocus, or breathing.'}, status=400)
            if action != 'claim' and session.control_mode != 'teacher':
                return JsonResponse({'detail': 'Take control first.'}, status=409)
            if action == 'claim' and session.control_mode != 'teacher':
                if session.control_mode != 'free':
                    return JsonResponse({'detail': 'Only free-mode sessions can be overridden.'}, status=409)
                ManualOverride.objects.create(session=session, teacher=profile, previous_control_mode=session.control_mode,
                    previous_presentation_mode=session.active_presentation_mode, new_presentation_mode='focus', started_at=now)
                session.control_mode = 'teacher'
                session.active_presentation_mode = 'focus'
                Notification.objects.create(recipient=session.student, title='Your teacher is guiding this session', body='Your teacher can now choose learning modes and pause or resume your session.')
            elif action == 'release':
                session.control_mode = 'free'
                session.status = 'active'
                session.active_presentation_mode = 'focus'
                session.manual_overrides.filter(is_active=True).update(is_active=False, ended_at=now)
                Notification.objects.create(recipient=session.student, title='Free mode restored', body='Your teacher returned control of your session to you.')
            elif action == 'set_mode':
                session.active_presentation_mode = mode
                session.manual_overrides.filter(is_active=True).update(new_presentation_mode=mode)
            elif action in ('pause', 'resume'):
                session.status = 'paused' if action == 'pause' else 'active'
            session.save(update_fields=['control_mode', 'status', 'active_presentation_mode'])
            _audit(profile, f'session_control_{action}', session)
        else:
            return JsonResponse({'detail': 'Only your teacher can change controls.'}, status=403)
    return JsonResponse({'id': str(session.pk), 'control_mode': session.control_mode,
                         'presentation_mode': session.active_presentation_mode,
                         'status': session.status, 'ended_at': session.ended_at, 'last_seen_at': session.last_seen_at})
