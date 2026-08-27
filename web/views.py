import json

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.http import HttpResponseServerError, JsonResponse
from django.shortcuts import get_object_or_404, render
from django.utils import timezone
from django.views.decorators.http import require_http_methods, require_POST

from .models import AuditLog, ConsentRecord, Enrollment, LearningSession, Profile, SchoolClass


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
