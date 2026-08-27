import json
from datetime import timedelta
from pathlib import Path

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.db.models import F, Q
from django.http import FileResponse, HttpResponseServerError, JsonResponse
from django.shortcuts import get_object_or_404, render
from django.utils import timezone
from django.views.decorators.http import require_http_methods, require_POST

from .models import (
    Asset, AuditLog, ContentAssignment, CurriculumPackage, Activity, ConsentRecord,
    Enrollment, Intervention, InterventionAlert, LearningSession, Lesson, Profile, SchoolClass, Slide,
)

PACKAGE_NAMES = {
    "care": "Care", "life": "Life Skills", "pre_vocational": "Pre-Vocational",
    "livelihood": "Livelihood", "functional_academics": "Functional Academics",
    "career": "Career", "enrichment": "Enrichment",
}
ALLOWED_UPLOADS = {"image/jpeg", "image/png", "image/gif", "image/webp", "audio/mpeg", "audio/wav", "video/mp4", "video/webm", "application/pdf"}
MAX_ASSET_BYTES = 10 * 1024 * 1024


def health(request):
    return JsonResponse({"status": "ok", "service": "cortex"})


def frontend(request):
    """Render the React shell; React Router handles the existing client routes."""
    manifest_path = settings.BASE_DIR / "frontend_dist" / ".vite" / "manifest.json"
    if not manifest_path.exists():
        return HttpResponseServerError(
            "Frontend assets are missing. Run `npm run build`, then restart Django."
        )

    with manifest_path.open(encoding="utf-8") as manifest_file:
        manifest = json.load(manifest_file)

    entry = manifest.get("index.html")
    if not entry:
        return HttpResponseServerError("The Vite manifest has no index.html entry.")

    return render(request, "index.html", {"script_file": entry["file"], "css_files": entry.get("css", [])})


def _body(request):
    try:
        return json.loads(request.body or "{}")
    except json.JSONDecodeError as exc:
        raise ValueError("Request body must be valid JSON.") from exc


def _profile(request):
    return getattr(request.user, "profile", None) if request.user.is_authenticated else None


def _require_profile(request, roles=None):
    profile = _profile(request)
    if profile is None:
        return None, JsonResponse({"detail": "Authentication required."}, status=401)
    if roles and profile.role not in roles:
        return None, JsonResponse({"detail": "You do not have permission for this action."}, status=403)
    return profile, None


def _audit(actor, action, obj, metadata=None):
    AuditLog.objects.create(actor=actor, action=action, object_type=obj.__class__.__name__, object_id=str(obj.pk), metadata=metadata or {})


def _profile_data(profile):
    return {"id": profile.pk, "name": profile.display_name, "role": profile.role, "pseudonym": str(profile.pseudonym)}


def _class_data(school_class, include_students=False):
    data = {"id": school_class.pk, "name": school_class.name, "code": school_class.code, "teacher": _profile_data(school_class.teacher)}
    if include_students:
        data["students"] = [_profile_data(item.student) for item in school_class.enrollments.filter(removed_at__isnull=True).select_related("student")]
    return data


def _lesson_data(lesson, include_slides=True):
    data = {"id": lesson.pk, "package": lesson.package.slug, "title": lesson.title, "description": lesson.description, "archived": lesson.archived_at is not None}
    if include_slides:
        data["slides"] = [{"id": slide.pk, "position": slide.position, "title": slide.title, "activity": {"id": slide.activity.pk, "type": slide.activity.type, "title": slide.activity.title, "configuration": slide.activity.configuration, "asset_id": slide.activity.asset_id}} for slide in lesson.slides.select_related("activity")]
    return data


def _content_teacher(request):
    return _require_profile(request, {Profile.Role.TEACHER, Profile.Role.ADMIN})


def content_packages(request):
    profile, error = _require_profile(request)
    if error:
        return error
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed."}, status=405)
    for slug, name in PACKAGE_NAMES.items():
        CurriculumPackage.objects.get_or_create(slug=slug, defaults={"name": name})
    packages = CurriculumPackage.objects.prefetch_related("lessons").all()
    return JsonResponse({"packages": [{"id": item.pk, "slug": item.slug, "name": item.name, "lessons": [_lesson_data(lesson, False) for lesson in item.lessons.filter(archived_at__isnull=True)]} for item in packages]})


@require_http_methods(["GET", "POST"])
def content_lessons(request):
    profile, error = _require_profile(request)
    if error:
        return error
    if request.method == "GET":
        lessons = Lesson.objects.filter(archived_at__isnull=True).select_related("package")
        package = request.GET.get("package")
        if package:
            lessons = lessons.filter(package__slug=package)
        if profile.role == Profile.Role.STUDENT:
            lessons = lessons.filter(assignments__student=profile) | lessons.filter(assignments__school_class__enrollments__student=profile, assignments__school_class__enrollments__removed_at__isnull=True)
            lessons = lessons.distinct()
        return JsonResponse({"lessons": [_lesson_data(lesson) for lesson in lessons]})
    if profile.role not in {Profile.Role.TEACHER, Profile.Role.ADMIN}:
        return JsonResponse({"detail": "You do not have permission for this action."}, status=403)
    try:
        data = _body(request)
        package = CurriculumPackage.objects.get(slug=str(data["package"]))
        title = str(data["title"]).strip()
        if not title:
            raise ValueError
        lesson = Lesson.objects.create(package=package, title=title, description=str(data.get("description", "")), created_by=profile)
    except (KeyError, ValueError, CurriculumPackage.DoesNotExist):
        return JsonResponse({"detail": "A valid package and non-empty title are required."}, status=400)
    _audit(profile, "lesson_created", lesson)
    return JsonResponse(_lesson_data(lesson), status=201)


@require_http_methods(["PUT", "DELETE"])
def content_lesson_detail(request, lesson_id):
    profile, error = _content_teacher(request)
    if error:
        return error
    lesson = get_object_or_404(Lesson, pk=lesson_id)
    if request.method == "DELETE":
        lesson.archived_at = timezone.now()
        lesson.save(update_fields=["archived_at"])
        _audit(profile, "lesson_archived", lesson)
        return JsonResponse({"status": "archived"})
    try:
        data = _body(request)
        lesson.title = str(data.get("title", lesson.title)).strip()
        lesson.description = str(data.get("description", lesson.description))
        if not lesson.title:
            raise ValueError
        lesson.save(update_fields=["title", "description"])
    except ValueError:
        return JsonResponse({"detail": "title cannot be empty."}, status=400)
    return JsonResponse(_lesson_data(lesson))


@require_POST
def content_upload(request):
    profile, error = _content_teacher(request)
    if error:
        return error
    uploaded = request.FILES.get("file")
    if not uploaded:
        return JsonResponse({"detail": "A file is required."}, status=400)
    if uploaded.size > MAX_ASSET_BYTES or uploaded.content_type not in ALLOWED_UPLOADS:
        return JsonResponse({"detail": "Unsupported file type or file exceeds the 10 MB limit."}, status=400)
    asset = Asset.objects.create(file=uploaded, original_name=Path(uploaded.name).name, mime_type=uploaded.content_type, size_bytes=uploaded.size, uploaded_by=profile)
    _audit(profile, "asset_uploaded", asset, {"mime_type": asset.mime_type, "size_bytes": asset.size_bytes})
    return JsonResponse({"id": asset.pk, "name": asset.original_name, "mime_type": asset.mime_type, "size_bytes": asset.size_bytes, "status": asset.status}, status=201)


@require_http_methods(["PUT", "POST", "DELETE"])
def content_asset_detail(request, asset_id):
    profile, error = _content_teacher(request)
    if error:
        return error
    asset = get_object_or_404(Asset, pk=asset_id)
    if request.method == "PUT":
        try:
            data = _body(request)
            asset.original_name = Path(str(data.get("name", asset.original_name))).name
            asset.save(update_fields=["original_name"])
        except ValueError:
            return JsonResponse({"detail": "Metadata must be valid JSON."}, status=400)
        return JsonResponse({"id": asset.pk, "name": asset.original_name, "mime_type": asset.mime_type, "size_bytes": asset.size_bytes, "status": asset.status})
    asset.archived_at = timezone.now()
    asset.save(update_fields=["archived_at"])
    _audit(profile, "asset_archived", asset)
    return JsonResponse({"status": "archived"})


def content_asset_preview(request, asset_id):
    profile, error = _require_profile(request)
    if error:
        return error
    asset = get_object_or_404(Asset, pk=asset_id, archived_at__isnull=True, status=Asset.Status.VALIDATED)
    if profile.role == Profile.Role.STUDENT and not ContentAssignment.objects.filter(lesson__slides__activity__asset=asset).filter(
        Q(student=profile) | Q(school_class__enrollments__student=profile, school_class__enrollments__removed_at__isnull=True)
    ).exists():
        return JsonResponse({"detail": "You do not have access to this asset."}, status=403)
    if profile.role == Profile.Role.TEACHER and asset.uploaded_by_id != profile.id and not Lesson.objects.filter(slides__activity__asset=asset, created_by=profile).exists():
        return JsonResponse({"detail": "You do not own this asset."}, status=403)
    return FileResponse(asset.file.open("rb"), content_type=asset.mime_type)


@require_POST
def content_slide(request, lesson_id):
    profile, error = _content_teacher(request)
    if error:
        return error
    lesson = get_object_or_404(Lesson, pk=lesson_id, archived_at__isnull=True)
    try:
        data = _body(request)
        activity = Activity.objects.create(type=str(data["type"]), title=str(data.get("title", "Activity")), configuration=data.get("configuration", {}), asset_id=data.get("asset_id"))
        position = int(data.get("position", lesson.slides.count()))
        Slide.objects.filter(lesson=lesson, position__gte=position).update(position=F("position") + 1)
        slide = Slide.objects.create(lesson=lesson, position=position, title=str(data.get("title", "Slide")), activity=activity)
    except (KeyError, ValueError, TypeError, Asset.DoesNotExist):
        return JsonResponse({"detail": "A valid activity type and position are required."}, status=400)
    return JsonResponse(_lesson_data(lesson), status=201)


@require_POST
def content_assignment(request, lesson_id):
    profile, error = _content_teacher(request)
    if error:
        return error
    lesson = get_object_or_404(Lesson, pk=lesson_id, archived_at__isnull=True)
    try:
        data = _body(request)
        school_class = SchoolClass.objects.get(pk=data["class_id"], teacher=profile) if profile.role == Profile.Role.TEACHER else SchoolClass.objects.get(pk=data["class_id"])
        student_id = data.get("student_id")
        student = Profile.objects.get(pk=student_id, role=Profile.Role.STUDENT) if student_id else None
        if student and not Enrollment.objects.filter(school_class=school_class, student=student, removed_at__isnull=True).exists():
            raise ValueError
        assignment = ContentAssignment.objects.create(lesson=lesson, school_class=school_class, student=student, assigned_by=profile)
    except (KeyError, ValueError, SchoolClass.DoesNotExist, Profile.DoesNotExist):
        return JsonResponse({"detail": "A valid class and enrolled student are required."}, status=400)
    return JsonResponse({"id": assignment.pk, "lesson_id": lesson.pk, "class_id": school_class.pk, "student_id": student.pk if student else None}, status=201)


@require_POST
def register(request):
    try:
        data = _body(request)
        username, password, name = str(data["username"]).strip(), str(data["password"]), str(data["name"]).strip()
        role = str(data.get("role", Profile.Role.STUDENT))
        if role not in (Profile.Role.STUDENT, Profile.Role.TEACHER):
            return JsonResponse({"detail": "Only student and teacher accounts can self-register."}, status=400)
        if len(password) < 12:
            return JsonResponse({"detail": "Password must be at least 12 characters."}, status=400)
        with transaction.atomic():
            user = User.objects.create_user(username=username, password=password)
            profile = Profile.objects.create(user=user, role=role, display_name=name)
        _audit(profile, "account_created", profile, {"role": role})
        return JsonResponse(_profile_data(profile), status=201)
    except (KeyError, ValueError):
        return JsonResponse({"detail": "username, password, and name are required."}, status=400)
    except IntegrityError:
        return JsonResponse({"detail": "That username is already in use."}, status=409)


@require_POST
def login_view(request):
    try:
        data = _body(request)
        user = authenticate(request, username=data.get("username", ""), password=data.get("password", ""))
    except ValueError:
        return JsonResponse({"detail": "Request body must be valid JSON."}, status=400)
    if user is None or not hasattr(user, "profile"):
        return JsonResponse({"detail": "Invalid credentials."}, status=401)
    login(request, user)
    _audit(user.profile, "login", user.profile)
    return JsonResponse(_profile_data(user.profile))


@require_POST
def logout_view(request):
    profile = _profile(request)
    if profile:
        _audit(profile, "logout", profile)
    logout(request)
    return JsonResponse({"status": "ok"})


def me(request):
    profile, error = _require_profile(request)
    return error or JsonResponse(_profile_data(profile))


@require_http_methods(["GET", "POST"])
def classes(request):
    profile, error = _require_profile(request, {Profile.Role.STUDENT, Profile.Role.TEACHER, Profile.Role.ADMIN})
    if error:
        return error
    if request.method == "POST":
        if profile.role != Profile.Role.TEACHER:
            return JsonResponse({"detail": "Only teachers can create classes."}, status=403)
        try:
            data = _body(request)
            school_class = SchoolClass.objects.create(name=str(data["name"]).strip(), code=str(data["code"]).strip().upper(), teacher=profile)
        except (KeyError, ValueError):
            return JsonResponse({"detail": "name and code are required."}, status=400)
        _audit(profile, "class_created", school_class)
        return JsonResponse(_class_data(school_class), status=201)
    if profile.role == Profile.Role.TEACHER:
        queryset = SchoolClass.objects.filter(teacher=profile)
    elif profile.role == Profile.Role.STUDENT:
        queryset = SchoolClass.objects.filter(enrollments__student=profile, enrollments__removed_at__isnull=True).distinct()
    else:
        queryset = SchoolClass.objects.all()
    return JsonResponse({"classes": [_class_data(item) for item in queryset.select_related("teacher")]})


def class_detail(request, class_id):
    profile, error = _require_profile(request, {Profile.Role.STUDENT, Profile.Role.TEACHER, Profile.Role.ADMIN})
    if error:
        return error
    school_class = get_object_or_404(SchoolClass.objects.select_related("teacher"), pk=class_id)
    if profile.role == Profile.Role.STUDENT and not Enrollment.objects.filter(school_class=school_class, student=profile, removed_at__isnull=True).exists():
        return JsonResponse({"detail": "You are not enrolled in this class."}, status=403)
    if profile.role == Profile.Role.TEACHER and school_class.teacher_id != profile.id:
        return JsonResponse({"detail": "You do not teach this class."}, status=403)
    return JsonResponse(_class_data(school_class, include_students=profile.role != Profile.Role.STUDENT))


@require_POST
def assign_teacher(request, class_id):
    profile, error = _require_profile(request, {Profile.Role.ADMIN})
    if error:
        return error
    school_class = get_object_or_404(SchoolClass, pk=class_id)
    try:
        teacher = Profile.objects.get(pk=_body(request)["teacher_id"], role=Profile.Role.TEACHER)
    except (KeyError, ValueError, Profile.DoesNotExist):
        return JsonResponse({"detail": "A valid teacher_id is required."}, status=400)
    school_class.teacher = teacher
    school_class.save(update_fields=["teacher"])
    _audit(profile, "teacher_assigned", school_class, {"teacher_id": teacher.pk})
    return JsonResponse(_class_data(school_class))


@require_http_methods(["POST", "DELETE"])
def enrollment(request, class_id, student_id):
    profile, error = _require_profile(request, {Profile.Role.TEACHER, Profile.Role.ADMIN})
    if error:
        return error
    school_class = get_object_or_404(SchoolClass, pk=class_id)
    if profile.role == Profile.Role.TEACHER and school_class.teacher_id != profile.id:
        return JsonResponse({"detail": "You do not teach this class."}, status=403)
    student = get_object_or_404(Profile, pk=student_id, role=Profile.Role.STUDENT)
    record, created = Enrollment.objects.get_or_create(school_class=school_class, student=student, defaults={"enrolled_by": profile})
    if request.method == "POST":
        record.removed_at, record.enrolled_by = None, profile
        record.save(update_fields=["removed_at", "enrolled_by"])
        _audit(profile, "student_enrolled", record, {"student_pseudonym": str(student.pseudonym)})
        return JsonResponse({"status": "enrolled"}, status=201 if created else 200)
    record.removed_at = timezone.now()
    record.save(update_fields=["removed_at"])
    _audit(profile, "student_removed", record, {"student_pseudonym": str(student.pseudonym)})
    return JsonResponse({"status": "removed"})


@require_POST
def start_session(request):
    profile, error = _require_profile(request, {Profile.Role.STUDENT})
    if error:
        return error
    try:
        school_class = SchoolClass.objects.get(pk=_body(request)["class_id"])
    except (KeyError, ValueError, SchoolClass.DoesNotExist):
        return JsonResponse({"detail": "A valid class_id is required."}, status=400)
    if not Enrollment.objects.filter(school_class=school_class, student=profile, removed_at__isnull=True).exists():
        return JsonResponse({"detail": "You are not enrolled in this class."}, status=403)
    session = LearningSession.objects.create(school_class=school_class, student=profile)
    _audit(profile, "session_started", session, {"student_pseudonym": str(profile.pseudonym)})
    return JsonResponse({"id": str(session.id), "class_id": school_class.pk, "student_pseudonym": str(profile.pseudonym), "started_at": session.started_at}, status=201)


@require_POST
def end_session(request, session_id):
    profile, error = _require_profile(request, {Profile.Role.STUDENT, Profile.Role.TEACHER})
    if error:
        return error
    session = get_object_or_404(LearningSession.objects.select_related("school_class"), pk=session_id)
    if profile.role == Profile.Role.STUDENT and session.student_id != profile.id:
        return JsonResponse({"detail": "You do not own this session."}, status=403)
    if profile.role == Profile.Role.TEACHER and session.school_class.teacher_id != profile.id:
        return JsonResponse({"detail": "You do not teach this class."}, status=403)
    session.ended_at = timezone.now()
    session.save(update_fields=["ended_at"])
    _audit(profile, "session_ended", session)
    return JsonResponse({"id": str(session.id), "ended_at": session.ended_at})


def _intervention_data(item):
    return {
        "id": str(item.id), "session_id": str(item.session_id), "student_id": item.student_id,
        "action": item.action, "priority": item.priority, "state": item.state,
        "mode": item.mode, "content_id": item.content_id, "status": item.status,
        "actor_id": item.actor_id, "requested_at": item.requested_at, "delivered_at": item.delivered_at,
        "applied_at": item.applied_at, "ended_at": item.ended_at, "duration_seconds": item.duration_seconds,
        "expires_at": item.expires_at, "payload": item.payload,
    }


def _session_for_profile(request, session_id, roles):
    profile, error = _require_profile(request, roles)
    if error:
        return None, None, error
    session = get_object_or_404(LearningSession.objects.select_related("school_class", "student"), pk=session_id)
    if profile.role == Profile.Role.TEACHER and session.school_class.teacher_id != profile.id:
        return None, None, JsonResponse({"detail": "You do not teach this class."}, status=403)
    if profile.role == Profile.Role.STUDENT and session.student_id != profile.id:
        return None, None, JsonResponse({"detail": "You do not own this session."}, status=403)
    return profile, session, None


@require_http_methods(["GET", "POST"])
def session_interventions(request, session_id):
    profile, session, error = _session_for_profile(request, session_id, {Profile.Role.TEACHER, Profile.Role.ADMIN})
    if error:
        return error
    if request.method == "GET":
        items = session.interventions.select_related("content").order_by("-requested_at")
        return JsonResponse({"interventions": [_intervention_data(item) for item in items]})
    if session.ended_at:
        return JsonResponse({"detail": "The session has ended."}, status=409)
    try:
        data = _body(request)
        action = str(data["action"])
        if action not in Intervention.Action.values:
            raise ValueError
        content = Lesson.objects.get(pk=data["content_id"], archived_at__isnull=True) if data.get("content_id") else None
        duration = int(data["duration_seconds"]) if data.get("duration_seconds") is not None else None
        item = Intervention.objects.create(session=session, student=session.student, actor=profile, action=action, priority=str(data.get("priority", Intervention.Priority.NORMAL)), state=str(data.get("state", "")), mode=str(data.get("mode", "")), content=content, duration_seconds=duration, expires_at=timezone.now() + timedelta(seconds=30), payload=data.get("payload", {}))
    except (KeyError, ValueError, TypeError, Lesson.DoesNotExist):
        return JsonResponse({"detail": "A valid action and command payload are required."}, status=400)
    InterventionAlert.objects.create(intervention=item, title=f"Teacher intervention: {item.get_action_display()}", message=f"{profile.display_name} sent {item.get_action_display().lower()} to {session.student.display_name}.", priority=item.priority)
    _audit(profile, "intervention_requested", item, {"state": item.state, "action": item.action, "mode": item.mode, "content_id": item.content_id, "priority": item.priority, "duration_seconds": item.duration_seconds})
    return JsonResponse(_intervention_data(item), status=201)


@require_POST
def student_intervention_command(request, student_id):
    profile, error = _require_profile(request, {Profile.Role.TEACHER, Profile.Role.ADMIN})
    if error:
        return error
    session = LearningSession.objects.filter(student_id=student_id, ended_at__isnull=True).select_related("school_class", "student").order_by("-started_at").first()
    if session is None:
        return JsonResponse({"detail": "No active session exists for this student."}, status=409)
    if profile.role == Profile.Role.TEACHER and session.school_class.teacher_id != profile.id:
        return JsonResponse({"detail": "You do not teach this class."}, status=403)
    return session_interventions(request, session.pk)


@require_http_methods(["GET", "POST"])
def student_intervention_delivery(request, session_id):
    profile, session, error = _session_for_profile(request, session_id, {Profile.Role.STUDENT})
    if error:
        return error
    if request.method == "GET":
        now = timezone.now()
        session.interventions.filter(status=Intervention.Status.PENDING, expires_at__lt=now).update(status=Intervention.Status.EXPIRED)
        pending = session.interventions.filter(status=Intervention.Status.PENDING).order_by("-priority", "requested_at")
        return JsonResponse({"commands": [_intervention_data(item) for item in pending]})
    try:
        data = _body(request)
        intervention = session.interventions.get(pk=data["intervention_id"])
        status = str(data.get("status", Intervention.Status.APPLIED))
        if status not in {Intervention.Status.DELIVERED, Intervention.Status.APPLIED, Intervention.Status.REJECTED}:
            raise ValueError
    except (KeyError, ValueError, Intervention.DoesNotExist):
        return JsonResponse({"detail": "A valid intervention_id and acknowledgement status are required."}, status=400)
    now = timezone.now()
    intervention.status = status
    intervention.delivered_at = intervention.delivered_at or now
    intervention.applied_at = now if status == Intervention.Status.APPLIED else intervention.applied_at
    intervention.ended_at = now if status in {Intervention.Status.APPLIED, Intervention.Status.REJECTED} else intervention.ended_at
    intervention.save(update_fields=["status", "delivered_at", "applied_at", "ended_at"])
    _audit(profile, f"intervention_{status}", intervention, {"action": intervention.action, "duration_seconds": intervention.duration_seconds})
    return JsonResponse(_intervention_data(intervention))


@require_http_methods(["GET", "POST"])
def intervention_alerts(request):
    profile, error = _require_profile(request, {Profile.Role.TEACHER, Profile.Role.ADMIN})
    if error:
        return error
    if request.method == "POST":
        try:
            alert = InterventionAlert.objects.get(pk=_body(request)["alert_id"], intervention__actor=profile)
        except (KeyError, ValueError, InterventionAlert.DoesNotExist):
            return JsonResponse({"detail": "A valid alert_id is required."}, status=400)
        alert.read_at = timezone.now()
        alert.save(update_fields=["read_at"])
    priority_order = {Intervention.Priority.URGENT: 0, Intervention.Priority.HIGH: 1, Intervention.Priority.NORMAL: 2}
    alerts = sorted(InterventionAlert.objects.filter(intervention__actor=profile), key=lambda item: (priority_order[item.priority], -item.created_at.timestamp()))
    return JsonResponse({"alerts": [{"id": alert.pk, "title": alert.title, "message": alert.message, "priority": alert.priority, "read": alert.read_at is not None, "created_at": alert.created_at} for alert in alerts]})


@require_http_methods(["GET", "POST"])
def consent(request):
    profile, error = _require_profile(request)
    if error:
        return error
    if request.method == "GET":
        return JsonResponse({"consents": list(profile.consents.values("consent_type", "version", "granted", "recorded_at"))})
    try:
        data = _body(request)
        record = ConsentRecord.objects.create(profile=profile, consent_type=str(data["consent_type"]), version=str(data["version"]), granted=bool(data["granted"]))
    except (KeyError, ValueError):
        return JsonResponse({"detail": "consent_type, version, and granted are required."}, status=400)
    _audit(profile, "consent_recorded", record, {"consent_type": record.consent_type, "granted": record.granted})
    return JsonResponse({"status": "recorded"}, status=201)
