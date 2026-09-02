import json
import hashlib
import os
import secrets
import string
import sys
from datetime import timedelta
from pathlib import Path

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.cache import cache
from django.contrib.auth import HASH_SESSION_KEY, SESSION_KEY
from django.utils.crypto import constant_time_compare
from django.db import IntegrityError, transaction
from django.db.models import Count, F, Q
from django.http import FileResponse, HttpResponseServerError, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_http_methods, require_POST
from django.views.decorators.csrf import ensure_csrf_cookie

from .models import (
    Asset, AuditLog, ContentAssignment, CurriculumPackage, Activity, ConsentRecord,
    DataLifecycleRequest, Enrollment, Intervention, InterventionAlert, JournalEntry,
    LearningSession, Lesson, Notification, Profile, School, SchoolClass, Slide, UserPreference,
)

PACKAGE_NAMES = {
    "care": "Care", "life": "Life Skills", "pre_vocational": "Pre-Vocational",
    "livelihood": "Livelihood", "functional_academics": "Functional Academics",
    "career": "Career", "enrichment": "Enrichment",
}
User = get_user_model()
ALLOWED_UPLOADS = {"image/jpeg", "image/png", "image/gif", "image/webp", "audio/mpeg", "audio/wav", "video/mp4", "video/webm", "application/pdf"}
UPLOAD_EXTENSIONS = {
    "image/jpeg": {".jpg", ".jpeg"}, "image/png": {".png"}, "image/gif": {".gif"},
    "image/webp": {".webp"}, "audio/mpeg": {".mp3"}, "audio/wav": {".wav"},
    "video/mp4": {".mp4"}, "video/webm": {".webm"}, "application/pdf": {".pdf"},
}
MAX_ASSET_BYTES = 10 * 1024 * 1024
CONSENT_VERSIONS = {
    "eeg_processing": "1",
    "journal_media": "1",
    "staff_sharing": "1",
}


def health(request):
    return JsonResponse({"status": "ok", "service": "cortex"})


@ensure_csrf_cookie
def csrf_cookie(request):
    return JsonResponse({"status": "ok"})


@ensure_csrf_cookie
def frontend(request):
    """Render the React shell; React Router handles the existing client routes."""
    profile = _profile(request)
    path = request.path_info or "/"

    if path.startswith("/admin/"):
        if profile is None or profile.role != Profile.Role.ADMIN:
            return redirect("/")
    elif path.startswith("/teacher/"):
        if profile is None or profile.role != Profile.Role.TEACHER:
            return redirect("/")
    elif path.startswith("/student/"):
        if profile is None or profile.role != Profile.Role.STUDENT:
            return redirect("/")

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
    if hasattr(request, "_cortex_profile"):
        return request._cortex_profile
    user_id = request.session.get(SESSION_KEY)
    if not user_id:
        request._cortex_profile = None
        return None
    profile = Profile.objects.select_related("user", "school").filter(user_id=user_id).first()
    session_hash = request.session.get(HASH_SESSION_KEY, "")
    session_role = request.session.get("role")
    if profile is None or profile.account_status != Profile.AccountStatus.ACTIVE or not profile.user.is_active or not session_hash or not constant_time_compare(session_hash, profile.user.get_session_auth_hash()):
        request.session.flush()
        request._cortex_profile = None
        return None
    if session_role and profile.role != session_role:
        request.session.flush()
        request._cortex_profile = None
        return None
    request.session["role"] = profile.role
    request.user = profile.user
    request._cortex_profile = profile
    return profile


def _require_profile(request, roles=None):
    profile = _profile(request)
    if profile is None:
        return None, JsonResponse({"detail": "Authentication required."}, status=401)
    if roles and profile.role not in roles:
        return None, JsonResponse({"detail": "You do not have permission for this action."}, status=403)
    return profile, None


def _audit(actor, action, obj, metadata=None):
    AuditLog.objects.create(actor=actor, action=action, object_type=obj.__class__.__name__, object_id=str(obj.pk), metadata=metadata or {})


def _same_school(*items):
    """Permit legacy unscoped records, but never cross a defined school boundary."""
    school_ids = {getattr(item, "school_id", None) for item in items if item is not None}
    return len(school_ids) <= 1


def _admin_can_manage(admin, target):
    if admin.is_super_admin:
        return True
    return admin.is_school_admin and admin.school_id is not None and admin.school_id == target.school_id


def _validated_upload(uploaded):
    extension = Path(uploaded.name).suffix.lower()
    mime_type = uploaded.content_type
    if uploaded.size > MAX_ASSET_BYTES or mime_type not in ALLOWED_UPLOADS or extension not in UPLOAD_EXTENSIONS[mime_type]:
        return None
    header = uploaded.read(16)
    uploaded.seek(0)
    signatures = {
        "image/jpeg": header.startswith(b"\xff\xd8\xff"),
        "image/png": header.startswith(b"\x89PNG\r\n\x1a\n"),
        "image/gif": header.startswith((b"GIF87a", b"GIF89a")),
        "image/webp": header.startswith(b"RIFF") and header[8:12] == b"WEBP",
        "audio/mpeg": header.startswith(b"ID3") or header.startswith(b"\xff\xfb") or header.startswith(b"\xff\xf3") or header.startswith(b"\xff\xf2"),
        "audio/wav": header.startswith(b"RIFF") and header[8:12] == b"WAVE",
        "video/mp4": len(header) >= 12 and header[4:8] == b"ftyp",
        "video/webm": header.startswith(b"\x1aE\xdf\xa3"),
        "application/pdf": header.startswith(b"%PDF-"),
    }
    if not signatures[mime_type]:
        return None
    digest = hashlib.sha256()
    for chunk in uploaded.chunks():
        if b"EICAR-STANDARD-ANTIVIRUS-TEST-FILE" in chunk:
            uploaded.seek(0)
            return None
        digest.update(chunk)
    uploaded.seek(0)
    return digest.hexdigest()


def _ensure_demo_accounts():
    enabled = "test" in sys.argv or os.environ.get("CORTEX_ENABLE_DEMO_ACCOUNTS", "true" if settings.DEBUG else "false").lower() == "true"
    if not enabled:
        return
    demo_school, _ = School.objects.get_or_create(
        id="11111111-1111-4111-8111-111111111111",
        defaults={"name": "Cortex Demonstration School", "contact_email": "office@example-school.test"},
    )
    demo_accounts = [
        {"username": "school-admin-demo", "email": "school-admin@example-school.test", "password": "admin-demo-2026!", "role": Profile.Role.ADMIN, "display_name": "School Administrator", "admin_scope": Profile.AdminScope.SCHOOL},
        {"username": "teacher-example", "email": "teacher@example-school.test", "password": "teacher-demo-2026!", "role": Profile.Role.TEACHER, "display_name": "Example Teacher"},
        {"username": "student-example", "email": "student@example-school.test", "password": "student-demo-2026!", "role": Profile.Role.STUDENT, "display_name": "Example Student"},
    ]
    for account in demo_accounts:
        user = User.objects.filter(email__iexact=account["email"]).first()
        if user is None:
            username = account["username"]
            suffix = 2
            while User.objects.filter(username__iexact=username).exists():
                username = f"{account['username']}-{suffix}"
                suffix += 1
            user = User.objects.create_user(
                username=username,
                email=account["email"],
                password=account["password"],
            )

        profile, _ = Profile.objects.get_or_create(
            user=user,
            defaults={"role": account["role"], "display_name": account["display_name"], "school": demo_school, "admin_scope": account.get("admin_scope", Profile.AdminScope.NONE)},
        )
        if user.email.lower() == account["email"].lower() and profile.role != account["role"]:
            profile.role = account["role"]
        if user.email.lower() == account["email"].lower() and not profile.display_name:
            profile.display_name = account["display_name"]
        expected_scope = account.get("admin_scope", Profile.AdminScope.NONE)
        if user.email.lower() == account["email"].lower() and profile.admin_scope != expected_scope:
            profile.admin_scope = expected_scope
        if user.email.lower() == account["email"].lower():
            profile.school = demo_school
            profile.account_status = Profile.AccountStatus.ACTIVE
            profile.save(update_fields=["role", "display_name", "school", "account_status", "admin_scope"])


def _profile_data(profile):
    return {
        "id": profile.pk, "name": profile.display_name, "role": profile.role,
        "pseudonym": str(profile.pseudonym), "avatar": None,
        "student_number": profile.student_number,
        "school": profile.school.name if profile.school_id else None,
        "account_status": profile.account_status,
        "admin_scope": profile.admin_scope,
    }


@require_http_methods(["GET", "POST"])
def admin_accounts(request):
    admin, error = _require_profile(request, {Profile.Role.ADMIN})
    if error:
        return error
    if request.method == "GET":
        queryset = Profile.objects.select_related("user", "school").order_by("display_name")
        if not admin.is_super_admin:
            if not admin.is_school_admin or not admin.school_id:
                return JsonResponse({"detail": "School-administrator scope is required."}, status=403)
            queryset = queryset.filter(school=admin.school).exclude(role=Profile.Role.ADMIN, admin_scope=Profile.AdminScope.SUPER)
        return JsonResponse({"accounts": [_profile_data(item) | {"email": item.user.email} for item in queryset]})

    try:
        data = _body(request)
        role = str(data["role"])
        if role not in Profile.Role.values:
            raise ValueError
        if role == Profile.Role.ADMIN and not admin.is_super_admin:
            return JsonResponse({"detail": "Only a super administrator can create school administrators."}, status=403)
        if role not in {Profile.Role.ADMIN, Profile.Role.TEACHER, Profile.Role.STUDENT}:
            raise ValueError
        school_id = data.get("school_id") or (str(admin.school_id) if admin.school_id else None)
        school = School.objects.get(pk=school_id, is_active=True) if school_id else None
        if role != Profile.Role.ADMIN and not admin.is_super_admin and school != admin.school:
            return JsonResponse({"detail": "Accounts can only be created in your school."}, status=403)
        if role == Profile.Role.ADMIN and school is None:
            return JsonResponse({"detail": "A school administrator must be assigned to a school."}, status=400)
        username = str(data["username"]).strip()
        name = str(data["name"]).strip()
        email = str(data.get("email", "")).strip()
        password = str(data.get("temporary_password") or secrets.token_urlsafe(18))
        validate_password(password)
        with transaction.atomic():
            user = User.objects.create_user(username=username, email=email, password=password)
            profile = Profile.objects.create(
                user=user, display_name=name, role=role, school=school,
                account_status=Profile.AccountStatus.ACTIVE if role in {Profile.Role.ADMIN, Profile.Role.STUDENT} else Profile.AccountStatus.PENDING,
                admin_scope=Profile.AdminScope.SCHOOL if role == Profile.Role.ADMIN else Profile.AdminScope.NONE,
                approved_by=admin if role != Profile.Role.TEACHER else None,
                approved_at=timezone.now() if role != Profile.Role.TEACHER else None,
            )
    except (KeyError, ValueError, School.DoesNotExist, ValidationError):
        return JsonResponse({"detail": "Valid account, school, and strong temporary-password values are required."}, status=400)
    except IntegrityError:
        return JsonResponse({"detail": "That username is already in use."}, status=409)
    _audit(admin, "account_created_by_admin", profile, {"role": role, "school_id": str(school.pk) if school else None})
    response = _profile_data(profile)
    if not data.get("temporary_password"):
        response["temporary_password"] = password
    return JsonResponse(response, status=201)


@require_http_methods(["PATCH"])
def admin_account_status(request, profile_id):
    admin, error = _require_profile(request, {Profile.Role.ADMIN})
    if error:
        return error
    target = get_object_or_404(Profile.objects.select_related("school", "user"), pk=profile_id)
    if not _admin_can_manage(admin, target) or target.is_super_admin:
        return JsonResponse({"detail": "You cannot manage this account."}, status=403)
    try:
        data = _body(request)
        status = str(data["status"])
        if status not in Profile.AccountStatus.values:
            raise ValueError
        if target.role == Profile.Role.TEACHER and status == Profile.AccountStatus.ACTIVE:
            if not admin.is_school_admin or not admin.school_id:
                return JsonResponse({"detail": "A school administrator must approve teachers."}, status=403)
            target.school = admin.school
        target.account_status = status
        target.approved_by = admin if status == Profile.AccountStatus.ACTIVE else target.approved_by
        target.approved_at = timezone.now() if status == Profile.AccountStatus.ACTIVE else target.approved_at
        target.user.is_active = status not in {Profile.AccountStatus.DISABLED, Profile.AccountStatus.SUSPENDED}
        with transaction.atomic():
            target.save(update_fields=["school", "account_status", "approved_by", "approved_at", "updated_at"])
            target.user.save(update_fields=["is_active"])
    except (KeyError, ValueError):
        return JsonResponse({"detail": "A valid status is required."}, status=400)
    _audit(admin, "account_status_changed", target, {"status": status})
    return JsonResponse(_profile_data(target))


@require_http_methods(["GET", "POST"])
def admin_schools(request):
    admin, error = _require_profile(request, {Profile.Role.ADMIN})
    if error:
        return error
    if not admin.is_super_admin:
        return JsonResponse({"detail": "Super-administrator scope is required."}, status=403)
    if request.method == "GET":
        return JsonResponse({"schools": [{"id": str(item.pk), "name": item.name, "is_active": item.is_active} for item in School.objects.order_by("name")]})
    try:
        data = _body(request)
        name = str(data["name"]).strip()
        if not name:
            raise ValueError
        school = School.objects.create(
            name=name, address=str(data.get("address", "")).strip(),
            contact_email=str(data.get("contact_email", "")).strip(),
            contact_number=str(data.get("contact_number", "")).strip(),
        )
    except (KeyError, ValueError):
        return JsonResponse({"detail": "A non-empty school name is required."}, status=400)
    _audit(admin, "school_created", school)
    return JsonResponse({"id": str(school.pk), "name": school.name, "is_active": school.is_active}, status=201)


def _class_data(school_class, include_students=False, packages=None):
    if packages is None:
        prefetched = getattr(school_class, "_prefetched_objects_cache", {}).get("class_packages")
        if prefetched is not None:
            packages = [assignment.package for assignment in prefetched if assignment.package.is_active]
        else:
            packages = list(CurriculumPackage.objects.filter(
                class_assignments__school_class=school_class, is_active=True,
            ).order_by("id"))
    student_count = getattr(school_class, "active_student_count", None)
    if student_count is None:
        student_count = school_class.enrollments.filter(removed_at__isnull=True).count()
    data = {
        "id": school_class.pk, "name": school_class.name, "code": school_class.code,
        "description": school_class.description, "school_year": school_class.school_year,
        "status": school_class.status,
        "packages": [{"id": item.pk, "slug": item.slug, "name": item.name} for item in packages],
        "package_count": len(packages),
        "student_count": student_count,
        "teacher": _profile_data(school_class.teacher),
    }
    if include_students:
        data["students"] = [_profile_data(item.student) for item in school_class.enrollments.filter(removed_at__isnull=True).select_related("student")]
    return data


def _lesson_data(lesson, include_slides=True):
    data = {"id": lesson.pk, "package": lesson.package.slug, "title": lesson.title, "description": lesson.description, "archived": lesson.archived_at is not None}
    if include_slides:
        data["slides"] = [{"id": slide.pk, "position": slide.position, "title": slide.title, "activity": {"id": slide.activity.pk, "type": slide.activity.type, "title": slide.activity.title, "configuration": slide.activity.configuration, "asset_id": slide.activity.asset_id}} for slide in lesson.slides.select_related("activity")]
    return data


def _content_admin(request):
    return _require_profile(request, {Profile.Role.ADMIN})


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
        if profile.role != Profile.Role.ADMIN:
            lessons = lessons.filter(status=Lesson.Status.APPROVED)
        return JsonResponse({"lessons": [_lesson_data(lesson) for lesson in lessons]})
    if profile.role != Profile.Role.ADMIN:
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
    profile, error = _content_admin(request)
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
    profile, error = _content_admin(request)
    if error:
        return error
    uploaded = request.FILES.get("file")
    if not uploaded:
        return JsonResponse({"detail": "A file is required."}, status=400)
    checksum = _validated_upload(uploaded)
    if checksum is None:
        return JsonResponse({"detail": "Unsupported, unsafe, or mismatched file, or file exceeds the 10 MB limit."}, status=400)
    asset = Asset.objects.create(file=uploaded, original_name=Path(uploaded.name).name, mime_type=uploaded.content_type, size_bytes=uploaded.size, checksum_sha256=checksum, uploaded_by=profile)
    _audit(profile, "asset_uploaded", asset, {"mime_type": asset.mime_type, "size_bytes": asset.size_bytes})
    return JsonResponse({"id": asset.pk, "name": asset.original_name, "mime_type": asset.mime_type, "size_bytes": asset.size_bytes, "status": asset.status}, status=201)


@require_http_methods(["PUT", "POST", "DELETE"])
def content_asset_detail(request, asset_id):
    profile, error = _content_admin(request)
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
    if profile.role != Profile.Role.ADMIN:
        content_access = Lesson.objects.filter(
            slides__activity__asset=asset, status=Lesson.Status.APPROVED, archived_at__isnull=True
        ).exists()
        journal_access = JournalEntry.objects.filter(asset=asset, student=profile).exists()
        if profile.role == Profile.Role.TEACHER:
            journal_access = JournalEntry.objects.filter(
                asset=asset, shared_with_teacher=True,
                session__school_class__teacher=profile,
            ).exists()
        if not content_access and not journal_access:
            return JsonResponse({"detail": "You do not have access to this asset."}, status=403)
    return FileResponse(asset.file.open("rb"), content_type=asset.mime_type)


@require_POST
def content_slide(request, lesson_id):
    profile, error = _content_admin(request)
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
    profile, error = _content_admin(request)
    if error:
        return error
    lesson = get_object_or_404(Lesson, pk=lesson_id, archived_at__isnull=True)
    try:
        data = _body(request)
        school_class = SchoolClass.objects.get(pk=data["class_id"])
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
        username = str(data["username"]).strip()
        email = str(data.get("email") or "").strip()
        password = str(data["password"])
        confirm_password = str(data.get("confirm_password") or "")
        name = str(data["name"]).strip()
        role = str(data.get("role", Profile.Role.STUDENT))
        if role not in (Profile.Role.STUDENT, Profile.Role.TEACHER):
            return JsonResponse({"detail": "Only student and teacher accounts can self-register."}, status=400)
        if password != confirm_password:
            return JsonResponse({"detail": "Passwords do not match."}, status=400)
        if len(password) < 12:
            return JsonResponse({"detail": "Password must be at least 12 characters."}, status=400)
        with transaction.atomic():
            user = User.objects.create_user(username=username, email=email or None, password=password)
            status = Profile.AccountStatus.PENDING if role == Profile.Role.TEACHER else Profile.AccountStatus.ACTIVE
            profile = Profile.objects.create(user=user, role=role, display_name=name, account_status=status)
        _audit(profile, "account_created", profile, {"role": role})
        return JsonResponse(_profile_data(profile), status=201)
    except (KeyError, ValueError):
        return JsonResponse({"detail": "username, password, and name are required."}, status=400)
    except IntegrityError:
        return JsonResponse({"detail": "That username is already in use."}, status=409)


@require_POST
def login_view(request):
    _ensure_demo_accounts()
    remote_address = request.META.get("REMOTE_ADDR", "unknown")
    throttle_key = f"cortex-login:{remote_address}"
    failures = cache.get(throttle_key, 0)
    if failures >= 10:
        return JsonResponse({"detail": "Too many login attempts. Try again later."}, status=429)
    try:
        data = _body(request)
        identifier = str(data.get("username") or data.get("email") or "").strip()
        password = str(data.get("password", ""))
        username = identifier
        if "@" in identifier:
            matched = User.objects.filter(email__iexact=identifier).only("username").first()
            if matched:
                username = matched.username
        user = authenticate(request, username=username, password=password)
        if user is None:
            cache.set(throttle_key, failures + 1, 300)
            AuditLog.objects.create(
                actor=None, action="login_failed", object_type="Authentication",
                object_id=hashlib.sha256(identifier.lower().encode("utf-8")).hexdigest()[:16],
                metadata={"reason": "invalid_credentials"}, ip_address=remote_address if remote_address != "unknown" else None,
            )
            return JsonResponse({"detail": "Invalid credentials."}, status=401)
    except ValueError:
        return JsonResponse({"detail": "Request body must be valid JSON."}, status=400)
    if user is None or not hasattr(user, "profile"):
        return JsonResponse({"detail": "Invalid credentials."}, status=401)
    if not user.is_active or user.profile.account_status != Profile.AccountStatus.ACTIVE:
        _audit(user.profile, "login_blocked", user.profile, {"account_status": user.profile.account_status})
        return JsonResponse({"detail": "This account is pending approval or is disabled."}, status=403)
    login(request, user)
    cache.delete(throttle_key)
    request.session["role"] = user.profile.role
    _audit(user.profile, "login", user.profile)
    data = _profile_data(user.profile)
    if user.profile.role == Profile.Role.TEACHER:
        data["dashboard"] = _teacher_dashboard_data(user.profile)
    elif user.profile.role == Profile.Role.STUDENT:
        data["student_bootstrap"] = _student_bootstrap_data(user.profile)
    return JsonResponse(data)


@require_POST
def logout_view(request):
    profile = _profile(request)
    if profile:
        active_session = LearningSession.objects.filter(student=profile, ended_at__isnull=True).order_by("-started_at").first()
        if active_session is not None:
            active_session.ended_at = timezone.now()
            active_session.status = LearningSession.Status.COMPLETED
            active_session.save(update_fields=["ended_at", "status"])
            _audit(profile, "session_ended", active_session)
        _audit(profile, "logout", profile)
    request.session.pop("role", None)
    logout(request)
    return JsonResponse({"status": "ok"})


def me(request):
    profile, error = _require_profile(request)
    if error:
        return error
    data = _profile_data(profile)
    if profile.role == Profile.Role.STUDENT:
        data["student_bootstrap"] = _student_bootstrap_data(profile)
    elif profile.role == Profile.Role.TEACHER:
        data["dashboard"] = _teacher_dashboard_data(profile)
    return JsonResponse(data)


@require_http_methods(["GET", "PATCH"])
def student_profile(request):
    profile, error = _require_profile(request, {Profile.Role.STUDENT})
    if error:
        return error
    if request.method == "PATCH":
        try:
            data = _body(request)
            name = str(data.get("name", profile.display_name)).strip()
            if not name:
                raise ValueError
            user = profile.user
            if "username" in data:
                username = str(data["username"]).strip()
                if not username:
                    raise ValueError
                if User.objects.exclude(pk=user.pk).filter(username__iexact=username).exists():
                    return JsonResponse({"detail": "That username is already in use."}, status=409)
                user.username = username
            if "email" in data:
                email = str(data["email"]).strip()
                if email:
                    if User.objects.exclude(pk=user.pk).filter(email__iexact=email).exists():
                        return JsonResponse({"detail": "That email is already in use."}, status=409)
                    user.email = email
            first_name = str(data.get("first_name") or "").strip()
            middle_name = str(data.get("middle_name") or "").strip()
            last_name = str(data.get("last_name") or "").strip()
            if not (first_name or last_name):
                name_parts = name.split()
                first_name = name_parts[0] if name_parts else ""
                last_name = name_parts[-1] if len(name_parts) > 1 else ""
            user.first_name = first_name
            user.last_name = last_name
            if "password" in data and str(data["password"]).strip():
                password = str(data["password"])
                if len(password) < 12:
                    return JsonResponse({"detail": "Password must be at least 12 characters."}, status=400)
                user.set_password(password)
            if "first_name" in data or "last_name" in data or "middle_name" in data:
                first_name = str(data.get("first_name") or "").strip()
                middle_name = str(data.get("middle_name") or "").strip()
                last_name = str(data.get("last_name") or "").strip()
                if first_name or last_name:
                    name = " ".join(filter(None, [first_name, middle_name, last_name])).strip()
                    profile.display_name = name
                else:
                    profile.display_name = name
            else:
                profile.display_name = name
            profile.guardian_name = str(data.get("guardian_name", profile.guardian_name)).strip()
            profile.guardian_contact = str(data.get("guardian_contact", profile.guardian_contact)).strip()
            profile.guardian_email = str(data.get("guardian_email", profile.guardian_email)).strip()
            user_fields = ["username", "email", "first_name", "last_name"]
            if "password" in data and str(data["password"]).strip():
                user_fields.append("password")
            with transaction.atomic():
                user.save(update_fields=user_fields)
                profile.save(update_fields=["display_name", "guardian_name", "guardian_contact", "guardian_email", "updated_at"])
            _audit(profile, "profile_updated", profile)
        except ValueError:
            return JsonResponse({"detail": "Profile values are invalid."}, status=400)
    data = _profile_data(profile)
    data.update({
        "guardian_name": profile.guardian_name,
        "guardian_contact": profile.guardian_contact,
        "guardian_email": profile.guardian_email,
        "email": profile.user.email,
        "username": profile.user.username,
    })
    return JsonResponse(data)


@require_POST
def verify_student_profile_password(request):
    profile, error = _require_profile(request, {Profile.Role.STUDENT})
    if error:
        return error
    try:
        password = str(_body(request)["password"])
    except (KeyError, ValueError):
        return JsonResponse({"detail": "Password is required."}, status=400)
    if not authenticate(request, username=profile.user.username, password=password):
        return JsonResponse({"detail": "The password is incorrect."}, status=403)
    return JsonResponse({"verified": True})


@require_POST
def verify_teacher_profile_password(request):
    profile, error = _require_profile(request, {Profile.Role.TEACHER})
    if error:
        return error
    try:
        password = str(_body(request)["password"])
    except (KeyError, ValueError):
        return JsonResponse({"detail": "Password is required."}, status=400)
    if not authenticate(request, username=profile.user.username, password=password):
        return JsonResponse({"detail": "The password is incorrect."}, status=403)
    return JsonResponse({"verified": True})


@require_http_methods(["GET", "PATCH"])
def student_preferences(request):
    profile, error = _require_profile(request, {Profile.Role.STUDENT})
    if error:
        return error
    preferences, _ = UserPreference.objects.get_or_create(profile=profile)
    if request.method == "PATCH":
        try:
            data = _body(request)
        except ValueError:
            return JsonResponse({"detail": "Request body must be valid JSON."}, status=400)
        for field in ("notifications_enabled", "sound_enabled", "haptics_enabled"):
            if field in data:
                if not isinstance(data[field], bool):
                    return JsonResponse({"detail": f"{field} must be a boolean."}, status=400)
                setattr(preferences, field, data[field])
        preferences.save()
    return JsonResponse({
        "notifications_enabled": preferences.notifications_enabled,
        "sound_enabled": preferences.sound_enabled,
        "haptics_enabled": preferences.haptics_enabled,
    })


def student_dashboard(request):
    profile, error = _require_profile(request, {Profile.Role.STUDENT})
    if error:
        return error
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed."}, status=405)
    return JsonResponse(_student_dashboard_data(profile))


def _student_dashboard_data(profile):
    classes_qs = SchoolClass.objects.filter(
        enrollments__student=profile, enrollments__removed_at__isnull=True,
        status=SchoolClass.Status.ACTIVE,
    ).select_related("teacher", "teacher__school").annotate(
        active_student_count=Count("enrollments", filter=Q(enrollments__removed_at__isnull=True), distinct=True),
    ).distinct()
    packages = list(CurriculumPackage.objects.filter(is_active=True).order_by("id"))
    return {
        "student": _profile_data(profile),
        "classes": [_class_data(item, packages=packages) for item in classes_qs],
        "unread_notifications": profile.notifications.filter(read_at__isnull=True).count(),
        "active_session": None,
    }


def _student_bootstrap_data(profile):
    dashboard = _student_dashboard_data(profile)
    lessons = Lesson.objects.filter(
        archived_at__isnull=True, status=Lesson.Status.APPROVED,
        package__is_active=True,
    ).select_related("package").order_by("id")
    lessons_by_package = {}
    for lesson in lessons:
        lessons_by_package.setdefault(lesson.package.slug, []).append(_lesson_data(lesson, include_slides=False))
    preferences, _ = UserPreference.objects.get_or_create(profile=profile)
    profile_data = _profile_data(profile)
    profile_data.update({
        "guardian_name": profile.guardian_name,
        "guardian_contact": profile.guardian_contact,
        "guardian_email": profile.guardian_email,
    })
    notifications = [{
        "id": str(item.id), "kind": item.kind, "title": item.title,
        "body": item.body, "link": item.link, "createdAt": item.created_at,
        "read": item.read_at is not None,
    } for item in profile.notifications.all()[:100]]
    return {
        "dashboard": dashboard,
        "lessons_by_package": lessons_by_package,
        "notifications": {"notifications": notifications},
        "preferences": {
            "notifications_enabled": preferences.notifications_enabled,
            "sound_enabled": preferences.sound_enabled,
            "haptics_enabled": preferences.haptics_enabled,
        },
        "profile": profile_data,
    }


@require_POST
def join_class(request):
    profile, error = _require_profile(request, {Profile.Role.STUDENT})
    if error:
        return error
    try:
        code = str(_body(request)["code"]).strip().upper()
    except (KeyError, ValueError):
        return JsonResponse({"detail": "A class code is required."}, status=400)
    try:
        school_class = SchoolClass.objects.select_related("teacher").get(code__iexact=code, status=SchoolClass.Status.ACTIVE)
    except SchoolClass.DoesNotExist:
        return JsonResponse({"detail": "Class code not found. Please check with your teacher."}, status=404)
    if profile.school_id and profile.school_id != school_class.school_id:
        return JsonResponse({"detail": "This class belongs to another school."}, status=403)
    if school_class.teacher.account_status != Profile.AccountStatus.ACTIVE:
        return JsonResponse({"detail": "This class is not currently accepting enrollments."}, status=403)
    if profile.school_id is None and school_class.school_id is not None:
        profile.school = school_class.school
        profile.save(update_fields=["school", "updated_at"])
    enrollment, created = Enrollment.objects.get_or_create(
        school_class=school_class, student=profile,
        defaults={"enrolled_by": profile},
    )
    if not created and enrollment.removed_at is None:
        return JsonResponse({"detail": "You already joined this class.", "class": _class_data(school_class)}, status=409)
    enrollment.removed_at = None
    enrollment.enrolled_by = profile
    enrollment.save(update_fields=["removed_at", "enrolled_by"])
    Notification.objects.create(
        recipient=profile, kind=Notification.Kind.CLASS,
        title=f"Joined {school_class.name}",
        body=f"{school_class.teacher.display_name} is your teacher for this class.",
        link=f"/student/class/{school_class.pk}",
    )
    _audit(profile, "class_joined", enrollment, {"class_id": school_class.pk})
    return JsonResponse({"class": _class_data(school_class)}, status=201)


@require_http_methods(["GET", "POST"])
def student_notifications(request):
    profile, error = _require_profile(request, {Profile.Role.STUDENT})
    if error:
        return error
    if request.method == "POST":
        try:
            data = _body(request)
        except ValueError:
            return JsonResponse({"detail": "Request body must be valid JSON."}, status=400)
        queryset = profile.notifications.filter(read_at__isnull=True)
        notification_id = data.get("notification_id")
        if notification_id:
            queryset = queryset.filter(pk=notification_id)
        queryset.update(read_at=timezone.now())
    items = profile.notifications.all()[:100]
    return JsonResponse({"notifications": [{
        "id": str(item.id), "kind": item.kind, "title": item.title,
        "body": item.body, "link": item.link, "createdAt": item.created_at,
        "read": item.read_at is not None,
    } for item in items]})


@require_http_methods(["GET", "PATCH"])
def teacher_profile(request):
    profile, error = _require_profile(request, {Profile.Role.TEACHER})
    if error:
        return error
    if request.method == "PATCH":
        try:
            data = _body(request)
            name = str(data.get("name", profile.display_name)).strip()
            if not name:
                raise ValueError
            user = profile.user
            if "username" in data:
                username = str(data["username"]).strip()
                if not username:
                    raise ValueError
                if User.objects.exclude(pk=user.pk).filter(username__iexact=username).exists():
                    return JsonResponse({"detail": "That username is already in use."}, status=409)
                user.username = username
            if "email" in data:
                email = str(data["email"]).strip()
                if email:
                    if User.objects.exclude(pk=user.pk).filter(email__iexact=email).exists():
                        return JsonResponse({"detail": "That email is already in use."}, status=409)
                    user.email = email
            if "password" in data and str(data["password"]).strip():
                password = str(data["password"])
                if len(password) < 12:
                    return JsonResponse({"detail": "Password must be at least 12 characters."}, status=400)
                user.set_password(password)
            if "first_name" in data or "last_name" in data or "middle_name" in data:
                first_name = str(data.get("first_name") or "").strip()
                middle_name = str(data.get("middle_name") or "").strip()
                last_name = str(data.get("last_name") or "").strip()
                if first_name or last_name:
                    name = " ".join(filter(None, [first_name, middle_name, last_name])).strip()
                    profile.display_name = name
                else:
                    profile.display_name = name
            else:
                profile.display_name = name
            profile.nonclinical_notes = str(data.get("bio", profile.nonclinical_notes)).strip()
            user.save(update_fields=["username", "email", "password"] if "password" in data and str(data["password"]).strip() else ["username", "email"])
            profile.save(update_fields=["display_name", "nonclinical_notes", "updated_at"])
            _audit(profile, "profile_updated", profile)
        except ValueError:
            return JsonResponse({"detail": "Profile values are invalid."}, status=400)
    data = _profile_data(profile)
    data["bio"] = profile.nonclinical_notes
    data["class_count"] = profile.taught_classes.filter(status=SchoolClass.Status.ACTIVE).count()
    data["email"] = profile.user.email
    data["username"] = profile.user.username
    data["first_name"] = profile.user.first_name if profile.user.first_name else ""
    data["last_name"] = profile.user.last_name if profile.user.last_name else ""
    return JsonResponse(data)


@require_http_methods(["GET", "PATCH"])
def teacher_preferences(request):
    profile, error = _require_profile(request, {Profile.Role.TEACHER})
    if error:
        return error
    preferences, _ = UserPreference.objects.get_or_create(profile=profile)
    if request.method == "PATCH":
        try:
            data = _body(request)
        except ValueError:
            return JsonResponse({"detail": "Request body must be valid JSON."}, status=400)
        for field in ("notifications_enabled", "sound_enabled", "haptics_enabled"):
            if field in data:
                if not isinstance(data[field], bool):
                    return JsonResponse({"detail": f"{field} must be a boolean."}, status=400)
                setattr(preferences, field, data[field])
        preferences.save()
    return JsonResponse({
        "notifications_enabled": preferences.notifications_enabled,
        "sound_enabled": preferences.sound_enabled,
        "haptics_enabled": preferences.haptics_enabled,
    })


@require_http_methods(["GET", "POST"])
def teacher_notifications(request):
    profile, error = _require_profile(request, {Profile.Role.TEACHER})
    if error:
        return error
    if request.method == "POST":
        try:
            notification_id = _body(request).get("notification_id")
        except ValueError:
            return JsonResponse({"detail": "Request body must be valid JSON."}, status=400)
        queryset = profile.notifications.filter(read_at__isnull=True)
        if notification_id:
            queryset = queryset.filter(pk=notification_id)
        queryset.update(read_at=timezone.now())
    return JsonResponse({"notifications": [{
        "id": str(item.id), "kind": item.kind, "title": item.title,
        "body": item.body, "link": item.link, "createdAt": item.created_at,
        "read": item.read_at is not None,
    } for item in profile.notifications.all()[:100]]})


def teacher_dashboard(request):
    profile, error = _require_profile(request, {Profile.Role.TEACHER})
    if error:
        return error
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed."}, status=405)
    return JsonResponse(_teacher_dashboard_data(profile))


def _teacher_dashboard_data(profile):
    class_items = list(SchoolClass.objects.filter(
        teacher=profile, status=SchoolClass.Status.ACTIVE,
    ).select_related("teacher", "teacher__school").annotate(
        active_student_count=Count("enrollments", filter=Q(enrollments__removed_at__isnull=True), distinct=True),
    ))
    packages = list(CurriculumPackage.objects.filter(is_active=True).order_by("id"))
    student_ids = Enrollment.objects.filter(
        school_class__teacher=profile, school_class__status=SchoolClass.Status.ACTIVE,
        removed_at__isnull=True,
    ).values_list("student_id", flat=True).distinct()
    return {
        "teacher": _profile_data(profile),
        "classes": [_class_data(item, packages=packages) for item in class_items],
        "class_count": len(class_items),
        "student_count": student_ids.count(),
        "unread_notifications": profile.notifications.filter(read_at__isnull=True).count(),
        "active_sessions": 0,
        "total_sessions": 0,
    }


def teacher_students(request):
    profile, error = _require_profile(request, {Profile.Role.TEACHER})
    if error:
        return error
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed."}, status=405)
    students = Profile.objects.filter(role=Profile.Role.STUDENT)
    if profile.school_id:
        students = students.filter(Q(school=profile.school) | Q(school__isnull=True))
    return JsonResponse({"students": [_profile_data(item) for item in students.select_related("school").order_by("display_name")]})


def teacher_student_detail(request, student_id):
    profile, error = _require_profile(request, {Profile.Role.TEACHER})
    if error:
        return error
    student = get_object_or_404(Profile, pk=student_id, role=Profile.Role.STUDENT)
    enrollments = Enrollment.objects.filter(
        student=student, school_class__teacher=profile, removed_at__isnull=True,
    ).select_related("school_class", "school_class__teacher")
    if not enrollments.exists():
        return JsonResponse({"detail": "This student is not enrolled in one of your classes."}, status=403)
    data = _profile_data(student)
    data.update({
        "classes": [_class_data(item.school_class) for item in enrollments],
        "session_count": 0, "journal_count": 0, "average_focus": None,
    })
    return JsonResponse(data)


def teacher_class_analytics(request, class_id):
    profile, error = _require_profile(request, {Profile.Role.TEACHER})
    if error:
        return error
    school_class = get_object_or_404(SchoolClass, pk=class_id, teacher=profile)
    return JsonResponse({
        "class": _class_data(school_class),
        "student_count": school_class.enrollments.filter(removed_at__isnull=True).count(),
        "session_count": 0, "average_focus": None, "completion_rate": None,
        "students": [], "timeline": [],
        "message": "Analytics will appear after learning sessions are recorded.",
    })


def teacher_journals(request):
    profile, error = _require_profile(request, {Profile.Role.TEACHER})
    if error:
        return error
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed."}, status=405)
    class_items = list(SchoolClass.objects.filter(
        teacher=profile, status=SchoolClass.Status.ACTIVE,
    ).select_related("teacher", "teacher__school").annotate(
        active_student_count=Count("enrollments", filter=Q(enrollments__removed_at__isnull=True), distinct=True),
    ).order_by("name"))
    selected_class = None
    class_id = request.GET.get("class_id")
    if class_id:
        selected_class = next((item for item in class_items if str(item.pk) == class_id), None)
        if selected_class is None:
            return JsonResponse({"detail": "Class not found."}, status=404)
    else:
        selected_class = class_items[0] if class_items else None
    entries = JournalEntry.objects.none()
    if selected_class:
        entries = JournalEntry.objects.filter(
            session__school_class=selected_class,
            student__enrollments__school_class=selected_class,
            student__enrollments__removed_at__isnull=True,
            shared_with_teacher=True,
        ).select_related("student", "student__school", "session", "asset").annotate(
            tasks_completed_count=Count("session__activity_responses", distinct=True),
        ).distinct().order_by("-created_at")
    packages = list(CurriculumPackage.objects.filter(is_active=True).order_by("id"))
    return JsonResponse({
        "classes": [_class_data(item, packages=packages) for item in class_items],
        "selected_class_id": selected_class.pk if selected_class else None,
        "entries": [{
            "id": str(item.pk),
            "student": _profile_data(item.student),
            "session_id": str(item.session_id),
            "prompt": item.prompt,
            "response_type": item.response_type,
            "text_response": item.text_response,
            "mood": item.mood,
            "asset_url": f"/api/content/assets/{item.asset_id}/preview/" if item.asset_id else None,
            "created_at": item.created_at,
            "duration_seconds": max(0, int((item.session.ended_at - item.session.started_at).total_seconds())) if item.session.ended_at else None,
            "tasks_completed": item.tasks_completed_count,
        } for item in entries],
    })


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
            name = str(data["name"]).strip()
            if not name:
                raise ValueError
            code = str(data.get("code", "")).strip().upper() or _new_class_code()
            school_class = SchoolClass.objects.create(
                name=name, code=code, teacher=profile, school=profile.school,
                description=str(data.get("description", "")).strip(),
                school_year=str(data.get("school_year", "")).strip(),
            )
        except (KeyError, ValueError):
            return JsonResponse({"detail": "A class name is required."}, status=400)
        except IntegrityError:
            return JsonResponse({"detail": "That class code is already in use."}, status=409)
        _audit(profile, "class_created", school_class)
        return JsonResponse(_class_data(school_class), status=201)
    if profile.role == Profile.Role.TEACHER:
        queryset = SchoolClass.objects.filter(teacher=profile)
    elif profile.role == Profile.Role.STUDENT:
        queryset = SchoolClass.objects.filter(enrollments__student=profile, enrollments__removed_at__isnull=True).distinct()
    else:
        queryset = SchoolClass.objects.all() if profile.is_super_admin else SchoolClass.objects.filter(school=profile.school)
    packages = list(CurriculumPackage.objects.filter(is_active=True).order_by("id"))
    queryset = queryset.select_related("teacher", "teacher__school").annotate(
        active_student_count=Count("enrollments", filter=Q(enrollments__removed_at__isnull=True), distinct=True),
    )
    return JsonResponse({"classes": [_class_data(item, packages=packages) for item in queryset]})


@require_http_methods(["GET", "PATCH", "DELETE"])
def class_detail(request, class_id):
    profile, error = _require_profile(request, {Profile.Role.STUDENT, Profile.Role.TEACHER, Profile.Role.ADMIN})
    if error:
        return error
    school_class = get_object_or_404(SchoolClass.objects.select_related("teacher"), pk=class_id)
    if profile.role == Profile.Role.ADMIN and not _admin_can_manage(profile, school_class):
        return JsonResponse({"detail": "You cannot manage this school's class."}, status=403)
    if profile.role == Profile.Role.STUDENT and not Enrollment.objects.filter(school_class=school_class, student=profile, removed_at__isnull=True).exists():
        return JsonResponse({"detail": "You are not enrolled in this class."}, status=403)
    if profile.role == Profile.Role.TEACHER and school_class.teacher_id != profile.id:
        return JsonResponse({"detail": "You do not teach this class."}, status=403)
    if request.method != "GET":
        if profile.role == Profile.Role.STUDENT:
            return JsonResponse({"detail": "You do not have permission for this action."}, status=403)
        if request.method == "DELETE":
            school_class.status = SchoolClass.Status.ARCHIVED
            school_class.save(update_fields=["status", "updated_at"])
            _audit(profile, "class_archived", school_class)
            return JsonResponse({"status": "archived"})
        try:
            payload = _body(request)
            name = str(payload.get("name", school_class.name)).strip()
            if not name:
                raise ValueError
            school_class.name = name
            school_class.description = str(payload.get("description", school_class.description)).strip()
            school_class.school_year = str(payload.get("school_year", school_class.school_year)).strip()
            school_class.save(update_fields=["name", "description", "school_year", "updated_at"])
        except ValueError:
            return JsonResponse({"detail": "Class values are invalid."}, status=400)
        _audit(profile, "class_updated", school_class)
    data = _class_data(school_class, include_students=profile.role != Profile.Role.STUDENT)
    if profile.role == Profile.Role.STUDENT:
        lessons = Lesson.objects.filter(
            archived_at__isnull=True, status=Lesson.Status.APPROVED,
            package__is_active=True,
        ).select_related("package").prefetch_related("slides__activity")
        data["lessons"] = [_lesson_data(lesson) for lesson in lessons]
        data["activities"] = [{
            "id": str(slide.activity_id), "title": slide.title,
            "lesson_id": slide.lesson_id, "done": False,
        } for lesson in lessons for slide in lesson.slides.all()]
    return JsonResponse(data)


def student_class_package(request, class_id, package_slug):
    profile, error = _require_profile(request, {Profile.Role.STUDENT})
    if error:
        return error
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed."}, status=405)
    school_class = get_object_or_404(
        SchoolClass.objects.select_related("teacher", "teacher__school"),
        pk=class_id, status=SchoolClass.Status.ACTIVE,
    )
    if not Enrollment.objects.filter(
        school_class=school_class, student=profile, removed_at__isnull=True,
    ).exists():
        return JsonResponse({"detail": "You are not enrolled in this class."}, status=403)
    package = get_object_or_404(
        CurriculumPackage,
        class_assignments__school_class=school_class,
        slug=package_slug, is_active=True,
    )
    lessons = Lesson.objects.filter(
        package=package, status=Lesson.Status.APPROVED, archived_at__isnull=True,
    ).order_by("id")
    return JsonResponse({
        "class": _class_data(school_class),
        "package": {"id": package.pk, "slug": package.slug, "name": package.name},
        "lessons": [_lesson_data(lesson, include_slides=False) for lesson in lessons],
    })


def _new_class_code():
    alphabet = string.ascii_uppercase + string.digits
    while True:
        code = "".join(secrets.choice(alphabet) for _ in range(4))
        if not SchoolClass.objects.filter(code=code).exists():
            return code


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
    if teacher.account_status != Profile.AccountStatus.ACTIVE or not _admin_can_manage(profile, school_class) or not _same_school(school_class, teacher):
        return JsonResponse({"detail": "The teacher must be active and belong to the same school."}, status=403)
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
    if student.account_status != Profile.AccountStatus.ACTIVE or not _same_school(school_class, student, school_class.teacher):
        return JsonResponse({"detail": "The student must be active and belong to the same school as the class."}, status=403)
    record, created = Enrollment.objects.get_or_create(school_class=school_class, student=student, defaults={"enrolled_by": profile})
    if request.method == "POST":
        record.removed_at, record.enrolled_by = None, profile
        record.save(update_fields=["removed_at", "enrolled_by"])
        _audit(profile, "student_enrolled", record, {"student_pseudonym": str(student.pseudonym)})
        return JsonResponse({"status": "enrolled"}, status=201 if created else 200)
    record.removed_at = timezone.now()
    record.save(update_fields=["removed_at"])
    LearningSession.objects.filter(
        school_class=school_class, student=student, ended_at__isnull=True,
    ).update(ended_at=timezone.now(), status=LearningSession.Status.INTERRUPTED)
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
    latest_consent = profile.consents.filter(consent_type="eeg_processing").order_by("-recorded_at").first()
    if not latest_consent or not latest_consent.granted or latest_consent.withdrawn_at or (latest_consent.expires_at and latest_consent.expires_at <= timezone.now()):
        return JsonResponse({"detail": "Active EEG-processing consent is required before starting a session."}, status=403)
    try:
        session = LearningSession.objects.create(school_class=school_class, student=profile)
    except IntegrityError:
        return JsonResponse({"detail": "This student already has an active session."}, status=409)
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
    session.status = LearningSession.Status.COMPLETED
    session.save(update_fields=["ended_at", "status"])
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


@require_http_methods(["GET", "POST", "DELETE"])
def consent(request):
    profile, error = _require_profile(request)
    if error:
        return error
    if request.method == "GET":
        return JsonResponse({"consents": list(profile.consents.values("id", "consent_type", "version", "granted", "subject", "expires_at", "withdrawn_at", "recorded_at"))})
    try:
        data = _body(request)
        consent_type = str(data["consent_type"])
        version = str(data["version"])
        if consent_type not in CONSENT_VERSIONS or version != CONSENT_VERSIONS[consent_type]:
            return JsonResponse({"detail": "The consent type or notice version is not current."}, status=400)
        if request.method == "DELETE":
            record = profile.consents.filter(consent_type=consent_type, version=version, withdrawn_at__isnull=True).order_by("-recorded_at").first()
            if record is None:
                return JsonResponse({"detail": "No active consent record was found."}, status=404)
            record.withdrawn_at = timezone.now()
            record.save(update_fields=["withdrawn_at"])
            LearningSession.objects.filter(student=profile, ended_at__isnull=True).update(
                ended_at=timezone.now(), status=LearningSession.Status.INTERRUPTED,
            )
            _audit(profile, "consent_withdrawn", record, {"consent_type": consent_type})
            return JsonResponse({"status": "withdrawn"})
        granted = data["granted"]
        if not isinstance(granted, bool):
            return JsonResponse({"detail": "granted must be a JSON boolean."}, status=400)
        subject = str(data.get("subject", "student"))
        if subject not in {"student", "guardian"}:
            return JsonResponse({"detail": "subject must be student or guardian."}, status=400)
        granted_by_name = str(data.get("granted_by_name", "")).strip()
        if subject == "guardian" and not granted_by_name:
            return JsonResponse({"detail": "Guardian consent requires granted_by_name."}, status=400)
        record = ConsentRecord.objects.create(
            profile=profile, consent_type=consent_type, version=version, granted=granted,
            subject=subject, granted_by_name=granted_by_name,
        )
    except (KeyError, ValueError):
        return JsonResponse({"detail": "consent_type, version, and granted are required."}, status=400)
    _audit(profile, "consent_recorded", record, {"consent_type": record.consent_type, "granted": record.granted})
    return JsonResponse({"status": "recorded"}, status=201)


@require_http_methods(["GET", "POST", "PATCH"])
def data_lifecycle_requests(request, request_id=None):
    actor, error = _require_profile(request)
    if error:
        return error
    if request.method == "POST":
        try:
            data = _body(request)
            request_type = str(data["request_type"])
            if request_type not in DataLifecycleRequest.RequestType.values:
                raise ValueError
            target = actor
            if data.get("profile_id") is not None:
                if actor.role != Profile.Role.ADMIN:
                    return JsonResponse({"detail": "Only an administrator can submit for another profile."}, status=403)
                target = Profile.objects.get(pk=data["profile_id"])
                if not _admin_can_manage(actor, target):
                    return JsonResponse({"detail": "You cannot manage this profile."}, status=403)
            item = DataLifecycleRequest.objects.create(
                profile=target, requested_by=actor, request_type=request_type,
                reason=str(data.get("reason", "")).strip(),
            )
        except (KeyError, ValueError, Profile.DoesNotExist):
            return JsonResponse({"detail": "A valid request_type and profile are required."}, status=400)
        _audit(actor, "data_lifecycle_requested", item, {"request_type": request_type, "subject_pseudonym": str(target.pseudonym)})
        return JsonResponse({"id": str(item.pk), "status": item.status, "request_type": item.request_type}, status=201)

    queryset = DataLifecycleRequest.objects.select_related("profile", "requested_by").order_by("-created_at")
    if actor.role != Profile.Role.ADMIN:
        queryset = queryset.filter(profile=actor)
    elif not actor.is_super_admin:
        queryset = queryset.filter(profile__school=actor.school)
    if request.method == "GET":
        return JsonResponse({"requests": [{
            "id": str(item.pk), "profile_pseudonym": str(item.profile.pseudonym),
            "request_type": item.request_type, "status": item.status,
            "reason": item.reason, "created_at": item.created_at, "completed_at": item.completed_at,
        } for item in queryset]})

    if actor.role != Profile.Role.ADMIN or request_id is None:
        return JsonResponse({"detail": "Administrator access is required."}, status=403)
    item = get_object_or_404(queryset, pk=request_id)
    try:
        data = _body(request)
        status = str(data["status"])
        if status not in DataLifecycleRequest.Status.values:
            raise ValueError
        item.status = status
        item.resolution_notes = str(data.get("resolution_notes", item.resolution_notes)).strip()
        item.completed_at = timezone.now() if status in {DataLifecycleRequest.Status.COMPLETED, DataLifecycleRequest.Status.REJECTED} else None
        item.save(update_fields=["status", "resolution_notes", "completed_at", "updated_at"])
    except (KeyError, ValueError):
        return JsonResponse({"detail": "A valid status is required."}, status=400)
    _audit(actor, "data_lifecycle_status_changed", item, {"status": status})
    return JsonResponse({"id": str(item.pk), "status": item.status})
