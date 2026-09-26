"""Durable teacher-led classrooms, student lobby membership, and overview reports."""
import csv
import io

from django.db import IntegrityError, transaction
from django.db.models import Count
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.http import require_http_methods, require_POST

from .models import (
    AdaptationEvent, ClassSession, EEGConnection, EEGDevice, EEGRecording, Enrollment, LearningSession, Lesson, Notification, Profile,
    SchoolClass, SessionAnalytics, SessionSlideExposure, Slide,
)
from .statistics import percentages
from .views import _audit, _body, _lesson_data, _require_profile, _session_is_live

OPEN_STATUSES = (ClassSession.Status.SCHEDULED, ClassSession.Status.ACTIVE, ClassSession.Status.PAUSED)
STATES = ('focused', 'relaxed', 'distracted', 'overstimulated')


def available_lessons(school_class):
    return Lesson.objects.filter(
        package__class_assignments__school_class=school_class,
        package__is_active=True, status=Lesson.Status.APPROVED, archived_at__isnull=True,
    ).distinct().select_related('package').prefetch_related('slides__activity')


def permitted_group(profile, group_id):
    group = get_object_or_404(ClassSession.objects.select_related('school_class', 'lesson', 'started_by'), pk=group_id)
    if profile.role == Profile.Role.TEACHER:
        allowed = group.school_class.teacher_id == profile.pk
    else:
        allowed = Enrollment.objects.filter(school_class=group.school_class, student=profile, removed_at__isnull=True).exists()
    return group if allowed else None


def participant_data(session, group):
    now = group.ended_at or timezone.now()
    counts = {state: 0 for state in STATES}
    for row in session.eeg_samples.values('state').annotate(count=Count('pk')):
        counts[row['state']] = row['count']
    total = sum(counts.values())
    distribution = percentages(counts)
    latest = session.eeg_samples.order_by('-recorded_at').first()
    online = bool(session.last_seen_at and (timezone.now() - session.last_seen_at).total_seconds() <= 12 and not session.ended_at)
    status = 'completed' if session.ended_at else 'lobby' if session.status == LearningSession.Status.JOINED else 'paused' if group.status == ClassSession.Status.PAUSED else 'active'
    lesson_ids = {entry['id'] for entry in group.lesson_history}
    task_total = Slide.objects.filter(lesson_id__in=lesson_ids).count()
    completed_steps = session.slide_exposures.filter(completed_at__isnull=False, slide__lesson_id__in=lesson_ids).values('slide_id').distinct().count()
    lesson_total = Slide.objects.filter(lesson_id=group.lesson_id).count() if group.lesson_id else 0
    lesson_completed = session.slide_exposures.filter(completed_at__isnull=False, slide__lesson_id=group.lesson_id).values('slide_id').distinct().count() if group.lesson_id else 0
    answers = session.activity_responses
    start = max(session.started_at, group.started_at) if group.started_at else None
    end = session.ended_at or now
    return {
        'id': str(session.pk), 'student_id': session.student_id, 'name': session.student.display_name,
        'status': status, 'online': online, 'last_seen_at': session.last_seen_at,
        'state': latest.state if latest else None,
        'signal_channels': latest.accepted_channels if latest else 0,
        'signal_fresh': bool(latest and (timezone.now() - latest.recorded_at).total_seconds() <= 8),
        'focus_score': distribution['focused'] if total else None,
        'state_distribution': distribution, 'eeg_samples': total,
        'answered': answers.values('activity_id').distinct().count(),
        'correct': answers.filter(is_correct=True).values('activity_id').distinct().count(),
        'attempts': answers.count(), 'task_total': task_total,
        'completed_steps': completed_steps, 'progress_percentage': round(completed_steps * 100 / task_total, 1) if task_total else 0,
        'lesson_completed_steps': lesson_completed, 'lesson_step_total': lesson_total,
        'lesson_progress_percentage': round(lesson_completed * 100 / lesson_total, 1) if lesson_total else 0,
        'duration_seconds': max(0, int((end - start).total_seconds())) if start else 0,
    }


def group_data(group, profile, include_lesson=False, detailed=True):
    result = {
        'id': str(group.pk), 'class_id': group.school_class_id, 'class_name': group.school_class.name,
        'teacher_name': group.started_by.display_name, 'lesson_id': group.lesson_id,
        'lesson_title': group.lesson.title if group.lesson_id else None,
        'status': group.status, 'presentation_mode': group.presentation_mode,
        'lesson_revision': group.lesson_revision,
        'updated_at': group.updated_at.isoformat(),
        'invitation_revision': sum(item['action'] == 'invite' for item in group.control_history),
        'started_at': group.started_at, 'ended_at': group.ended_at,
    }
    sessions = group.student_sessions.select_related('student')
    if not detailed:
        if profile.role == Profile.Role.STUDENT:
            own = sessions.filter(student=profile).first()
            result['student_session'] = {'id': str(own.pk), 'status': own.status} if own else None
        return result
    if profile.role == Profile.Role.TEACHER:
        result['participants'] = [participant_data(session, group) for session in sessions]
        joined_ids = {session.student_id for session in sessions}
        result['roster'] = [
            {'student_id': enrollment.student_id, 'name': enrollment.student.display_name,
             'joined': enrollment.student_id in joined_ids}
            for enrollment in group.school_class.enrollments.filter(removed_at__isnull=True).select_related('student')
        ]
        result['report'] = group.overview_report or None
        result['lesson_history'] = group.lesson_history
    else:
        own = sessions.filter(student=profile).first()
        result['student_session'] = participant_data(own, group) if own else None
    if include_lesson:
        result['lesson'] = _lesson_data(group.lesson) if group.lesson_id else None
    return result


def invite_students(group):
    """Persist invitations for all unjoined students, including offline students."""
    for enrollment in group.school_class.enrollments.filter(removed_at__isnull=True).select_related('student'):
        if group.student_sessions.filter(student_id=enrollment.student_id).exists():
            continue
        Notification.objects.update_or_create(
            recipient=enrollment.student, kind=Notification.Kind.CLASS,
            link=f'/student/class-session/{group.pk}',
            defaults={'title': 'Your teacher has opened a session',
                      'body': f'Join {group.school_class.name} and wait for your teacher to begin.',
                      'read_at': None},
        )


def event(group, action, **details):
    group.control_history = [*group.control_history, {'action': action, 'at': timezone.now().isoformat(), **details}]


def finalize_student(session, now):
    if session.ended_at:
        return
    session.ended_at = now
    session.status = LearningSession.Status.COMPLETED
    lesson_ids = [item['id'] for item in session.class_session.lesson_history] if session.class_session_id else [session.lesson_id]
    task_total = Slide.objects.filter(lesson_id__in=lesson_ids).count()
    viewed = session.slide_exposures.filter(completed_at__isnull=False).values('slide_id').distinct().count()
    session.completion_percentage = min(100, round(viewed * 100 / task_total, 2)) if task_total else 0
    session.slide_exposures.filter(exited_at__isnull=True).update(exited_at=now)
    session.save(update_fields=['ended_at', 'status', 'completion_percentage'])
    recording = session.eeg_recordings.filter(ended_at__isnull=True).first()
    if recording:
        recording.ended_at = now
        recording.processing_status = EEGRecording.ProcessingStatus.COMPLETED
        recording.save(update_fields=['ended_at', 'processing_status', 'updated_at'])
        EEGConnection.objects.filter(pk=recording.connection_id, disconnected_at__isnull=True).update(
            disconnected_at=now, connection_status=EEGConnection.Status.DISCONNECTED)
        EEGDevice.objects.filter(pk=recording.connection.device_id).update(status=EEGDevice.Status.AVAILABLE)
    counts = {state: session.eeg_samples.filter(state=state).count() for state in STATES}
    total = sum(counts.values())
    duration = max(0, int((now - session.started_at).total_seconds()))
    SessionAnalytics.objects.update_or_create(session=session, defaults={
        'total_duration_seconds': duration,
        **{f'{state}_seconds': round(duration * count / total) if total else 0 for state, count in counts.items()},
        **{f'{state}_percentage': value for state, value in percentages(counts, places=3).items()},
    })


@require_http_methods(['GET', 'POST'])
def class_sessions(request):
    profile, error = _require_profile(request, {Profile.Role.TEACHER, Profile.Role.STUDENT})
    if error:
        return error
    if request.method == 'GET':
        groups = ClassSession.objects.select_related('school_class', 'lesson', 'started_by').order_by('-created_at')
        if profile.role == Profile.Role.TEACHER:
            groups = groups.filter(school_class__teacher=profile)
        else:
            groups = groups.filter(school_class__enrollments__student=profile, school_class__enrollments__removed_at__isnull=True, status__in=OPEN_STATUSES).distinct()
        return JsonResponse({'sessions': [group_data(group, profile, detailed=False) for group in groups[:50]]})
    if profile.role != Profile.Role.TEACHER:
        return JsonResponse({'detail': 'Only teachers can open a class session.'}, status=403)
    try:
        data = _body(request)
        with transaction.atomic():
            school_class = SchoolClass.objects.select_for_update().get(pk=data['class_id'], teacher=profile, status=SchoolClass.Status.ACTIVE)
            if school_class.class_sessions.filter(status__in=OPEN_STATUSES).exists():
                return JsonResponse({'detail': 'This class already has an open session. Reopen it below.'}, status=409)
            lesson = available_lessons(school_class).get(pk=data['lesson_id']) if data.get('lesson_id') else None
            group = ClassSession.objects.create(school_class=school_class, started_by=profile, lesson=lesson)
            if lesson:
                group.lesson_history = [{'id': lesson.pk, 'title': lesson.title}]
            event(group, 'open_lobby')
            group.save()
            invite_students(group)
    except (KeyError, ValueError, TypeError, SchoolClass.DoesNotExist, Lesson.DoesNotExist):
        return JsonResponse({'detail': 'Choose one of your active classes and an available lesson.'}, status=400)
    _audit(profile, 'class_session_opened', group)
    return JsonResponse(group_data(group, profile), status=201)


@require_http_methods(['GET'])
def class_session_lessons(request, class_id):
    profile, error = _require_profile(request, {Profile.Role.TEACHER})
    if error:
        return error
    school_class = get_object_or_404(SchoolClass, pk=class_id, teacher=profile, status=SchoolClass.Status.ACTIVE)
    return JsonResponse({'lessons': [{'id': lesson.pk, 'title': lesson.title, 'package': lesson.package.name} for lesson in available_lessons(school_class)]})


@require_http_methods(['GET', 'POST'])
def class_session_detail(request, group_id):
    profile, error = _require_profile(request, {Profile.Role.TEACHER, Profile.Role.STUDENT})
    if error:
        return error
    group = permitted_group(profile, group_id)
    if group is None:
        return JsonResponse({'detail': 'You do not belong to this class.'}, status=403)
    if request.method == 'GET':
        return JsonResponse(group_data(group, profile, include_lesson=True))
    try:
        data = _body(request)
        action = data['action']
    except (KeyError, ValueError, TypeError):
        return JsonResponse({'detail': 'A valid action is required.'}, status=400)
    if profile.role == Profile.Role.STUDENT:
        if action != 'heartbeat':
            return JsonResponse({'detail': 'Only the teacher can control this session.'}, status=403)
        group.student_sessions.filter(student=profile, ended_at__isnull=True).update(last_seen_at=timezone.now())
        return JsonResponse(group_data(group, profile, include_lesson=True))
    with transaction.atomic():
        group = ClassSession.objects.select_for_update(of=('self',)).select_related('school_class', 'lesson', 'started_by').get(pk=group.pk)
        if group.status not in OPEN_STATUSES:
            if action == 'end':
                return JsonResponse(group_data(group, profile))
            return JsonResponse({'detail': 'This class session has ended.'}, status=409)
        if action == 'invite':
            invite_students(group)
        elif action == 'set_lesson':
            try:
                group.lesson = available_lessons(group.school_class).get(pk=data['lesson_id'])
            except (KeyError, ValueError, TypeError, Lesson.DoesNotExist):
                return JsonResponse({'detail': 'Choose a lesson available in this class.'}, status=400)
            group.lesson_revision += 1
            if not any(item['id'] == group.lesson_id for item in group.lesson_history):
                group.lesson_history = [*group.lesson_history, {'id': group.lesson_id, 'title': group.lesson.title}]
            group.student_sessions.filter(ended_at__isnull=True).update(lesson=group.lesson)
        elif action == 'set_mode':
            if data.get('mode') not in ('focus', 'breathing', 'refocus', 'adaptive'):
                return JsonResponse({'detail': 'Choose focus, breathing, refocus, or adaptive.'}, status=400)
            group.presentation_mode = data['mode']
            next_mode = 'focus' if data['mode'] in ('focus', 'adaptive') else 'relax'
            for learner in group.student_sessions.filter(ended_at__isnull=True).exclude(active_presentation_mode=next_mode):
                AdaptationEvent.objects.create(session=learner, source=AdaptationEvent.Source.TEACHER,
                    previous_mode=learner.active_presentation_mode, new_mode=next_mode,
                    action_type='set_mode', triggered_at=timezone.now(), was_successful=True)
            group.student_sessions.filter(ended_at__isnull=True).update(active_presentation_mode=next_mode)
        elif action == 'start':
            if not group.lesson_id or group.status != ClassSession.Status.SCHEDULED:
                return JsonResponse({'detail': 'Choose a lesson before starting the lobby session.'}, status=409)
            group.status = ClassSession.Status.ACTIVE
            group.started_at = timezone.now()
        elif action == 'pause' and group.status == ClassSession.Status.ACTIVE:
            group.status = ClassSession.Status.PAUSED
            SessionSlideExposure.objects.filter(session__class_session=group, exited_at__isnull=True).update(exited_at=timezone.now())
        elif action == 'resume' and group.status == ClassSession.Status.PAUSED:
            group.status = ClassSession.Status.ACTIVE
        elif action == 'end':
            group.status = ClassSession.Status.COMPLETED
            group.ended_at = timezone.now()
            for session in group.student_sessions.all():
                finalize_student(session, group.ended_at)
        else:
            return JsonResponse({'detail': 'This action is not available in the current session state.'}, status=409)
        event(group, action, lesson_id=group.lesson_id, mode=group.presentation_mode)
        if action == 'end':
            rows = [participant_data(session, group) for session in group.student_sessions.select_related('student')]
            group.overview_report = {
                'class_name': group.school_class.name, 'teacher_name': group.started_by.display_name,
                'started_at': group.started_at.isoformat() if group.started_at else None,
                'ended_at': group.ended_at.isoformat(), 'lessons': group.lesson_history,
                'participants': rows, 'participant_count': len(rows),
                'answered': sum(row['answered'] for row in rows), 'correct': sum(row['correct'] for row in rows),
                'controls': group.control_history,
            }
            # JSON snapshots contain only scalar values and ISO timestamps.
            for row in rows:
                if row['last_seen_at']:
                    row['last_seen_at'] = row['last_seen_at'].isoformat()
        group.save()
    _audit(profile, 'class_session_control', group, {'action': action})
    return JsonResponse(group_data(group, profile, include_lesson=True))


@require_POST
def class_session_join(request, group_id):
    profile, error = _require_profile(request, {Profile.Role.STUDENT})
    if error:
        return error
    group = permitted_group(profile, group_id)
    if group is None:
        return JsonResponse({'detail': 'You are not enrolled in this class.'}, status=403)
    with transaction.atomic():
        group = ClassSession.objects.select_for_update(of=('self',)).select_related('school_class', 'lesson', 'started_by').get(pk=group.pk)
        if group.status not in OPEN_STATUSES:
            return JsonResponse({'detail': 'This session has ended.'}, status=409)
        previous = group.student_sessions.filter(student=profile, ended_at__isnull=False).first()
        if previous:
            return JsonResponse({'detail': 'You have already finished this teacher-led session.'}, status=409)
        existing = LearningSession.objects.filter(student=profile, ended_at__isnull=True).first()
        if existing and existing.class_session_id == group.pk:
            existing.last_seen_at = timezone.now()
            existing.save(update_fields=['last_seen_at'])
            return JsonResponse(group_data(group, profile, include_lesson=True))
        if existing:
            latest = existing.eeg_samples.order_by('-recorded_at').first()
            if _session_is_live(existing, latest):
                return JsonResponse({'detail': 'Finish your current session before joining this class.'}, status=409)
            finalize_student(existing, timezone.now())
        try:
            with transaction.atomic():
                LearningSession.objects.create(class_session=group, school_class=group.school_class, student=profile,
                    lesson=group.lesson, control_mode=LearningSession.ControlMode.TEACHER,
                    status=LearningSession.Status.JOINED, last_seen_at=timezone.now())
        except IntegrityError:
            return JsonResponse({'detail': 'You already have an active session.'}, status=409)
    _audit(profile, 'class_session_joined', group)
    return JsonResponse(group_data(group, profile, include_lesson=True), status=201)


def activate_student(profile, data):
    group = permitted_group(profile, data['class_session_id'])
    if group is None:
        return JsonResponse({'detail': 'You are not enrolled in this class.'}, status=403)
    with transaction.atomic():
        group = ClassSession.objects.select_for_update().get(pk=group.pk)
        if group.status != ClassSession.Status.ACTIVE or not group.lesson_id:
            return JsonResponse({'detail': 'Wait in the lobby until your teacher starts the lesson.'}, status=409)
        session = group.student_sessions.filter(student=profile, ended_at__isnull=True).first()
        if session is None:
            return JsonResponse({'detail': 'Join the class lobby first.'}, status=409)
        session.lesson_id = group.lesson_id
        session.status = LearningSession.Status.ACTIVE
        session.active_presentation_mode = 'focus' if group.presentation_mode in ('focus', 'adaptive') else 'relax'
        session.last_seen_at = timezone.now()
        session.save(update_fields=['lesson', 'status', 'active_presentation_mode', 'last_seen_at'])
    return JsonResponse({'id': str(session.pk), 'class_id': group.school_class_id,
        'lesson_id': group.lesson_id, 'class_session_id': str(group.pk), 'control_mode': 'teacher'})


@require_http_methods(['GET'])
def class_session_report(request, group_id):
    profile, error = _require_profile(request, {Profile.Role.TEACHER})
    if error:
        return error
    group = permitted_group(profile, group_id)
    if group is None:
        return JsonResponse({'detail': 'You do not teach this class.'}, status=403)
    if not group.overview_report:
        return JsonResponse({'detail': 'The overview is available after the session ends.'}, status=409)
    if request.GET.get('download') != 'csv':
        return JsonResponse(group.overview_report)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    def safe(value):
        value = str(value or '')
        return "'" + value if value.lstrip().startswith(('=', '+', '-', '@')) else value
    writer.writerow(['Teacher-led session overview'])
    writer.writerow(['Class', safe(group.overview_report['class_name'])])
    writer.writerow(['Teacher', safe(group.overview_report['teacher_name'])])
    writer.writerow(['Started', group.overview_report['started_at'] or 'Lobby only'])
    writer.writerow(['Ended', group.overview_report['ended_at']])
    writer.writerow(['Lessons', safe('; '.join(item['title'] for item in group.overview_report['lessons']))])
    writer.writerow([])
    writer.writerow(['Student', 'Completed lesson steps', 'Total lesson steps', 'Lesson progress (%)', 'Answered activities', 'Correct activities', 'Attempts', 'Duration (seconds)', 'EEG samples', *STATES])
    for row in group.overview_report['participants']:
        writer.writerow([safe(row['name']), row.get('completed_steps', ''), row['task_total'], row.get('progress_percentage', ''), row['answered'], row['correct'], row['attempts'], row['duration_seconds'], row['eeg_samples'], *[row['state_distribution'][state] for state in STATES]])
    writer.writerow([])
    writer.writerow(['Control', 'Time', 'Lesson ID', 'Mode'])
    for item in group.overview_report['controls']:
        writer.writerow([item['action'], item['at'], item.get('lesson_id', ''), item.get('mode', '')])
    response = HttpResponse('\ufeff' + buffer.getvalue(), content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="class-session-{group.pk}.csv"'
    return response
