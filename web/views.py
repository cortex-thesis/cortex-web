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
from django.core.validators import validate_email
from django.core.cache import cache
from django.contrib.auth import HASH_SESSION_KEY, SESSION_KEY
from django.utils.crypto import constant_time_compare
from django.db import IntegrityError, transaction
from django.db.models import Avg, Count, F, Q
from django.http import FileResponse, HttpResponseServerError, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_http_methods, require_POST
from django.views.decorators.csrf import ensure_csrf_cookie

from .models import (
    Asset, AuditLog, ContentAssignment, CurriculumPackage, Activity, ConsentRecord,
    DataLifecycleRequest, EEGDevice, Enrollment, Intervention, InterventionAlert, JournalEntry,
    LearningSession, Lesson, Notification, Profile, ResearchAnalysisRecord, School,
    SchoolClass, SessionAnalytics, SessionSlideExposure, Slide, StatePrediction,
    UserPreference,
)
from .activity_templates import ACTIVITY_TEMPLATES, LAYOUT_OPTIONS, TASK_TEMPLATES, validate_activity_configuration

PACKAGE_NAMES = {
    "care": "Care", "life": "Life Skills", "pre_vocational": "Pre-Vocational",
    "livelihood": "Livelihood", "functional_academics": "Functional Academics",
    "career": "Career", "enrichment": "Enrichment",
}
User = get_user_model()
ALLOWED_UPLOADS = {"image/jpeg", "image/png", "image/gif", "image/webp", "audio/mpeg", "audio/wav", "audio/webm", "audio/mp4", "video/mp4", "video/webm", "application/pdf"}
UPLOAD_EXTENSIONS = {
    "image/jpeg": {".jpg", ".jpeg"}, "image/png": {".png"}, "image/gif": {".gif"},
    "image/webp": {".webp"}, "audio/mpeg": {".mp3"}, "audio/wav": {".wav"},
    "audio/webm": {".webm"}, "audio/mp4": {".mp4"},
    "video/mp4": {".mp4"}, "video/webm": {".webm"}, "application/pdf": {".pdf"},
}
MAX_ASSET_BYTES = 10 * 1024 * 1024
CONSENT_VERSIONS = {
    "eeg_processing": "1",
    "journal_media": "1",
    "staff_sharing": "1",
}

ANALYSIS_CATALOG = {
    "phase_2": {
        "signal_quality": ("Signal Quality Assessment", ["snr_db", "flatline_events", "contact_quality_percent"]),
        "data_completeness": ("Data Completeness and Sampling", ["actual_samples", "expected_samples", "completeness_percent", "sampling_error_percent"]),
        "filter_effectiveness": ("Filter Effectiveness Check", ["noise_attenuation_percent", "delta_retained_percent", "theta_retained_percent", "alpha_retained_percent", "beta_retained_percent"]),
        "ica_artifact_removal": ("ICA Artifact Removal", ["total_components", "artifact_component_percent", "retained_component_percent", "variance_preserved_percent"]),
        "epoch_quality": ("Epoch Retention and Post-processing SNR", ["total_epochs", "passed_epochs", "retention_percent", "postprocess_snr_db"]),
        "feature_preparation": ("EEG Feature Preparation", ["delta_power", "theta_power", "alpha_power", "beta_power", "gamma_power", "theta_beta_ratio", "mean", "variance", "standard_deviation"]),
        "clustering": ("Clustering Evaluation", ["silhouette_score", "davies_bouldin_index", "calinski_harabasz_index", "inertia", "adjusted_rand_index", "normalized_mutual_information"]),
        "classification": ("Classification Evaluation", ["accuracy", "precision_macro", "recall_macro", "f1_macro", "confidence", "response_time_ms"]),
        "baseline_comparison": ("Baseline Comparison", ["silhouette_gain", "temporal_stability_index", "observational_convergence_rate"]),
    },
    "phase_3": {
        "content_validation": ("Multimedia Content Validation", ["curricular_alignment", "adhd_appropriateness", "clarity", "multimedia_usability", "sensory_regulation_suitability", "content_validation_rate"]),
        "closed_loop_response": ("Closed-Loop Response Time", ["mean_ms", "median_ms", "minimum_ms", "maximum_ms", "p95_ms", "within_threshold_percent"]),
        "loop_continuity": ("Loop Continuity Rate", ["session_duration_seconds", "interrupted_duration_seconds", "continuity_percent"]),
        "adaptation_appropriateness": ("Adaptation Appropriateness", ["mean_rating", "focused_rating", "relaxed_rating", "distracted_rating", "overstimulated_rating"]),
        "inter_rater_reliability": ("Inter-rater Reliability", ["kappa", "reviewer_count", "rated_instances"]),
        "mismatch": ("Mismatch and Iteration Improvement", ["reviewed_instances", "mismatched_instances", "mismatch_rate", "baseline_mismatch_rate", "relative_reduction_percent"]),
        "internal_evaluation": ("Internal System Evaluation", ["requirements_checked", "requirements_passed", "completion_percent", "defects_found"]),
    },
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
        "audio/webm": header.startswith(b"\x1aE\xdf\xa3"),
        "audio/mp4": len(header) >= 12 and header[4:8] == b"ftyp",
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
        {"username": "super-admin-demo", "email": "super-admin@cortex.test", "password": "super-admin-demo-2026!", "role": Profile.Role.ADMIN, "display_name": "Super Administrator", "admin_scope": Profile.AdminScope.SUPER},
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
        "username": profile.user.username,
        "pseudonym": str(profile.pseudonym), "avatar": None,
        "student_number": profile.student_number,
        "school": profile.school.name if profile.school_id else None,
        "school_id": str(profile.school_id) if profile.school_id else None,
        "account_status": profile.account_status,
        "admin_scope": profile.admin_scope,
        "requested_at": profile.created_at.isoformat(),
    }


@require_http_methods(["GET"])
def admin_dashboard(request):
    admin, error = _require_profile(request, {Profile.Role.ADMIN})
    if error:
        return error
    if admin.is_super_admin:
        profiles = Profile.objects.all()
        sessions = LearningSession.objects.all()
        devices = EEGDevice.objects.all()
        return JsonResponse({
            "scope": "super",
            "total_users": profiles.count(),
            "active_users": profiles.filter(account_status=Profile.AccountStatus.ACTIVE).count(),
            "pending_invitations": profiles.filter(account_status=Profile.AccountStatus.PENDING).count(),
            "school_count": School.objects.filter(is_active=True).count(),
            "class_count": SchoolClass.objects.filter(status=SchoolClass.Status.ACTIVE).count(),
            "active_sessions": sessions.filter(ended_at__isnull=True).count(),
            "total_sessions": sessions.count(),
            "device_count": devices.count(),
            "connected_devices": devices.filter(status=EEGDevice.Status.CONNECTED).count(),
            "teachers": profiles.filter(role=Profile.Role.TEACHER).count(),
            "students": profiles.filter(role=Profile.Role.STUDENT).count(),
            "school_admins": profiles.filter(role=Profile.Role.ADMIN, admin_scope=Profile.AdminScope.SCHOOL).count(),
        })
    if not admin.is_school_admin or not admin.school_id:
        return JsonResponse({"detail": "School-administrator scope is required."}, status=403)
    classes = SchoolClass.objects.filter(school=admin.school).select_related("teacher", "teacher__school").annotate(
        active_student_count=Count("enrollments", filter=Q(enrollments__removed_at__isnull=True), distinct=True),
        session_count=Count("sessions", distinct=True),
        average_completion=Avg("sessions__completion_percentage"),
        average_focus=Avg("sessions__analytics__focused_percentage"),
    )
    students = Profile.objects.filter(school=admin.school, role=Profile.Role.STUDENT)
    teachers = Profile.objects.filter(school=admin.school, role=Profile.Role.TEACHER)
    sessions = LearningSession.objects.filter(school_class__school=admin.school)
    packages = list(CurriculumPackage.objects.filter(is_active=True).order_by("id"))
    return JsonResponse({
        "administrator": _profile_data(admin),
        "classes": [_class_data(item, packages=packages) | {
            "session_count": item.session_count,
            "average_completion": round(float(item.average_completion or 0), 1),
            "average_focus": round(float(item.average_focus or 0), 1),
        } for item in classes],
        "class_count": classes.filter(status=SchoolClass.Status.ACTIVE).count(),
        "teacher_count": teachers.filter(account_status=Profile.AccountStatus.ACTIVE).count(),
        "student_count": students.filter(account_status=Profile.AccountStatus.ACTIVE).count(),
        "active_sessions": sessions.filter(ended_at__isnull=True).count(),
        "total_sessions": sessions.count(),
        "pending_teachers": teachers.filter(account_status=Profile.AccountStatus.PENDING).count(),
        "average_completion": round(float(sessions.aggregate(value=Avg("completion_percentage"))["value"] or 0), 1),
        "average_focus": round(float(sessions.aggregate(value=Avg("analytics__focused_percentage"))["value"] or 0), 1),
    })


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
        school_id = request.GET.get("school_id")
        if school_id and admin.is_super_admin:
            queryset = queryset.filter(school_id=school_id)
        return JsonResponse({"accounts": [_profile_data(item) | {
            "email": item.user.email, "username": item.user.username,
            "school_id": str(item.school_id) if item.school_id else None,
            "school_name": item.school.name if item.school_id else None,
        } for item in queryset]})

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
            # An administrator provisioning an account is an explicit approval.
            is_immediately_active = True
            profile = Profile.objects.create(
                user=user, display_name=name, role=role, school=school,
                account_status=Profile.AccountStatus.ACTIVE if is_immediately_active else Profile.AccountStatus.PENDING,
                admin_scope=Profile.AdminScope.SCHOOL if role == Profile.Role.ADMIN else Profile.AdminScope.NONE,
                approved_by=admin if is_immediately_active else None,
                approved_at=timezone.now() if is_immediately_active else None,
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


@require_http_methods(["PATCH", "DELETE"])
def admin_account_status(request, profile_id):
    admin, error = _require_profile(request, {Profile.Role.ADMIN})
    if error:
        return error
    target = get_object_or_404(Profile.objects.select_related("school", "user"), pk=profile_id)
    if not _admin_can_manage(admin, target) or target.is_super_admin:
        return JsonResponse({"detail": "You cannot manage this account."}, status=403)
    if request.method == "DELETE":
        if target.pk == admin.pk:
            return JsonResponse({"detail": "You cannot remove your own account."}, status=409)
        # Preserve linked learning/research history while revoking all access.
        target.account_status = Profile.AccountStatus.DISABLED
        target.user.is_active = False
        with transaction.atomic():
            target.save(update_fields=["account_status", "updated_at"])
            target.user.save(update_fields=["is_active"])
            _audit(admin, "account_access_removed", target, {"name": target.display_name})
        return JsonResponse({"status": "deleted"})
    try:
        data = _body(request)
        status = str(data["status"])
        if status not in Profile.AccountStatus.values:
            raise ValueError
        if target.role == Profile.Role.TEACHER and status == Profile.AccountStatus.ACTIVE and admin.is_school_admin:
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
        return JsonResponse({"schools": [{
            "id": str(item.pk), "name": item.name, "address": item.address,
            "contact_email": item.contact_email, "contact_number": item.contact_number,
            "is_active": item.is_active, "created_at": item.created_at, "updated_at": item.updated_at,
        } for item in School.objects.order_by("name")]})
    try:
        data = _body(request)
        name = str(data["name"]).strip()
        address = str(data.get("address", "")).strip()
        contact_email = str(data.get("contact_email", "")).strip()
        contact_number = str(data.get("contact_number", "")).strip()
        if not name or len(name) > 200 or len(contact_number) > 30:
            raise ValueError
        if contact_email:
            validate_email(contact_email)
        if School.objects.filter(name__iexact=name).exists():
            return JsonResponse({"detail": "A school with this name already exists."}, status=409)
        school = School.objects.create(
            name=name, address=address, contact_email=contact_email,
            contact_number=contact_number,
        )
    except (KeyError, ValueError, ValidationError):
        return JsonResponse({"detail": "Provide a valid school name, email, and contact number."}, status=400)
    _audit(admin, "school_created", school)
    return JsonResponse({
        "id": str(school.pk), "name": school.name, "address": school.address,
        "contact_email": school.contact_email, "contact_number": school.contact_number,
        "is_active": school.is_active, "created_at": school.created_at, "updated_at": school.updated_at,
    }, status=201)


def _analysis_record_data(item):
    return {
        "id": str(item.pk), "phase": item.phase, "analysis_key": item.analysis_key,
        "analysis_name": item.analysis_name, "scope_label": item.scope_label,
        "source_reference": item.source_reference, "values": item.values,
        "result": item.result, "notes": item.notes,
        "recorded_by": _profile_data(item.recorded_by),
        "created_at": item.created_at, "updated_at": item.updated_at,
    }


@require_http_methods(["GET", "POST"])
def admin_research_analyses(request):
    admin, error = _require_profile(request, {Profile.Role.ADMIN})
    if error:
        return error
    if not admin.is_super_admin:
        return JsonResponse({"detail": "Super-administrator scope is required."}, status=403)
    if request.method == "GET":
        queryset = ResearchAnalysisRecord.objects.select_related("recorded_by", "recorded_by__school")
        phase = request.GET.get("phase")
        if phase:
            queryset = queryset.filter(phase=phase)
        return JsonResponse({
            "catalog": {phase_key: [{"key": key, "name": definition[0], "metrics": definition[1]} for key, definition in items.items()] for phase_key, items in ANALYSIS_CATALOG.items()},
            "records": [_analysis_record_data(item) for item in queryset[:1000]],
        })
    try:
        data = _body(request)
        phase, analysis_key = str(data["phase"]), str(data["analysis_key"])
        definition = ANALYSIS_CATALOG[phase][analysis_key]
        scope_label, values = str(data["scope_label"]).strip(), data.get("values", {})
        result = str(data.get("result", ResearchAnalysisRecord.Result.PENDING))
        allowed_metrics = set(definition[1])
        if not scope_label or not isinstance(values, dict) or not values or set(values) - allowed_metrics or result not in ResearchAnalysisRecord.Result.values:
            raise ValueError
        if any(not isinstance(value, (int, float)) or isinstance(value, bool) for value in values.values()):
            raise ValueError
        record = ResearchAnalysisRecord.objects.create(
            phase=phase, analysis_key=analysis_key, analysis_name=definition[0], scope_label=scope_label,
            source_reference=str(data.get("source_reference", "")).strip(), values=values, result=result,
            notes=str(data.get("notes", "")).strip(), recorded_by=admin,
        )
    except (KeyError, ValueError, TypeError):
        return JsonResponse({"detail": "Select a valid analysis and provide a scope with numeric metric values."}, status=400)
    _audit(admin, "research_analysis_created", record, {"phase": record.phase, "analysis_key": record.analysis_key})
    return JsonResponse(_analysis_record_data(record), status=201)


@require_http_methods(["PATCH", "DELETE"])
def admin_research_analysis_detail(request, record_id):
    admin, error = _require_profile(request, {Profile.Role.ADMIN})
    if error:
        return error
    if not admin.is_super_admin:
        return JsonResponse({"detail": "Super-administrator scope is required."}, status=403)
    record = get_object_or_404(ResearchAnalysisRecord, pk=record_id)
    if request.method == "DELETE":
        _audit(admin, "research_analysis_deleted", record, {"phase": record.phase, "analysis_key": record.analysis_key})
        record.delete()
        return JsonResponse({"status": "deleted"})
    try:
        data = _body(request)
        definition = ANALYSIS_CATALOG[record.phase][record.analysis_key]
        values = data.get("values", record.values)
        if not isinstance(values, dict) or set(values) - set(definition[1]) or any(not isinstance(value, (int, float)) or isinstance(value, bool) for value in values.values()):
            raise ValueError
        record.scope_label = str(data.get("scope_label", record.scope_label)).strip()
        record.source_reference = str(data.get("source_reference", record.source_reference)).strip()
        record.values, record.result = values, str(data.get("result", record.result))
        record.notes = str(data.get("notes", record.notes)).strip()
        if not record.scope_label or record.result not in ResearchAnalysisRecord.Result.values:
            raise ValueError
        record.save()
    except (KeyError, ValueError, TypeError):
        return JsonResponse({"detail": "The analysis values are invalid."}, status=400)
    _audit(admin, "research_analysis_updated", record)
    return JsonResponse(_analysis_record_data(record))


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
    package_ids = [item.pk for item in packages]
    lesson_counts = dict(
        Lesson.objects.filter(
            package_id__in=package_ids, status=Lesson.Status.APPROVED,
            archived_at__isnull=True,
        ).values("package_id").annotate(total=Count("id")).values_list("package_id", "total")
    )
    data = {
        "id": school_class.pk, "name": school_class.name, "code": school_class.code,
        "description": school_class.description, "school_year": school_class.school_year,
        "status": school_class.status,
        "packages": [{
            "id": item.pk, "slug": item.slug, "name": item.name,
            "lesson_count": lesson_counts.get(item.pk, 0),
        } for item in packages],
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


def content_activity_templates(request):
    profile, error = _require_profile(request)
    if error:
        return error
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed."}, status=405)
    return JsonResponse({
        "presentation_templates": [{"id": template_id, **definition} for template_id, definition in ACTIVITY_TEMPLATES.items()],
        "task_templates": [{"id": template_id, **definition} for template_id, definition in TASK_TEMPLATES.items()],
        "layout_options": LAYOUT_OPTIONS,
    })


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
        activity_type = str(data["type"])
        configuration = data.get("configuration", {})
        configuration_error = validate_activity_configuration(activity_type, configuration)
        if configuration_error:
            return JsonResponse({"detail": configuration_error}, status=400)
        activity = Activity.objects.create(type=activity_type, title=str(data.get("title", "Activity")), configuration=configuration, asset_id=data.get("asset_id"))
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


def _state_metrics(counts, confidence_sums):
    total = sum(counts.values())
    return {state: {
        "samples": counts[state],
        "percentage": round(counts[state] * 100 / total, 1) if total else 0,
        "average_confidence": round(confidence_sums[state] / counts[state], 3) if counts[state] else 0,
    } for state in StatePrediction.State.values}


def teacher_advanced_reports(request):
    profile, error = _require_profile(request, {Profile.Role.TEACHER})
    if error:
        return error
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed."}, status=405)
    classes = list(SchoolClass.objects.filter(teacher=profile, status=SchoolClass.Status.ACTIVE).order_by("name"))
    class_id = request.GET.get("class_id")
    school_class = next((item for item in classes if str(item.pk) == class_id), None) if class_id else (classes[0] if classes else None)
    if class_id and school_class is None:
        return JsonResponse({"detail": "Class not found."}, status=404)
    range_key = request.GET.get("range", "month")
    if range_key not in {"week", "month", "term"}:
        return JsonResponse({"detail": "range must be week, month, or term."}, status=400)
    today = timezone.localdate()
    start_date = today - timedelta(days=today.weekday()) if range_key == "week" else (today.replace(day=1) if range_key == "month" else None)
    sessions_qs = LearningSession.objects.none()
    if school_class:
        sessions_qs = LearningSession.objects.filter(school_class=school_class, ended_at__isnull=False).select_related("student", "lesson")
        if start_date:
            sessions_qs = sessions_qs.filter(started_at__date__gte=start_date)
    sessions = list(sessions_qs.order_by("started_at"))
    session_map = {item.pk: item for item in sessions}
    exposures = list(SessionSlideExposure.objects.filter(session_id__in=session_map).select_related("slide", "slide__lesson", "slide__activity").order_by("entered_at"))
    predictions_by_session = {}
    for prediction in StatePrediction.objects.filter(session_id__in=session_map).order_by("classified_at"):
        predictions_by_session.setdefault(prediction.session_id, []).append(prediction)

    def empty_totals():
        return ({state: 0 for state in StatePrediction.State.values}, {state: 0.0 for state in StatePrediction.State.values})

    overall_counts, overall_confidence = empty_totals()
    lesson_nodes, student_nodes = {}, {}
    session_nodes = {item.pk: {
        "id": str(item.pk), "student": _profile_data(item.student), "lesson_id": item.lesson_id,
        "lesson_title": item.lesson.title if item.lesson_id else "Unassigned lesson",
        "started_at": item.started_at, "ended_at": item.ended_at, "slides": [],
        "_counts": empty_totals()[0], "_confidence": empty_totals()[1],
    } for item in sessions}
    for exposure in exposures:
        end = exposure.exited_at or session_map[exposure.session_id].ended_at
        matched = [item for item in predictions_by_session.get(exposure.session_id, []) if exposure.entered_at <= item.classified_at <= end]
        counts, confidence = empty_totals()
        for prediction in matched:
            counts[prediction.state] += 1
            confidence[prediction.state] += float(prediction.confidence_score)
            overall_counts[prediction.state] += 1
            overall_confidence[prediction.state] += float(prediction.confidence_score)
        slide_data = {
            "exposure_id": str(exposure.pk), "slide_id": exposure.slide_id, "position": exposure.slide.position,
            "title": exposure.slide.title, "content_title": exposure.slide.activity.title,
            "entered_at": exposure.entered_at, "exited_at": end,
            "duration_seconds": max(0, int((end - exposure.entered_at).total_seconds())),
            "states": _state_metrics(counts, confidence),
        }
        session_node = session_nodes[exposure.session_id]
        session_node["slides"].append(slide_data)
        lesson = lesson_nodes.setdefault(exposure.slide.lesson_id, {
            "id": exposure.slide.lesson_id, "title": exposure.slide.lesson.title,
            "sessions": set(), "students": set(), "slides": {},
            "_counts": empty_totals()[0], "_confidence": empty_totals()[1],
        })
        lesson["sessions"].add(exposure.session_id)
        lesson["students"].add(session_node["student"]["id"])
        aggregate_slide = lesson["slides"].setdefault(exposure.slide_id, {
            "id": exposure.slide_id, "position": exposure.slide.position, "title": exposure.slide.title,
            "content_title": exposure.slide.activity.title, "exposures": 0,
            "_counts": empty_totals()[0], "_confidence": empty_totals()[1],
        })
        aggregate_slide["exposures"] += 1
        for state in StatePrediction.State.values:
            session_node["_counts"][state] += counts[state]
            session_node["_confidence"][state] += confidence[state]
            lesson["_counts"][state] += counts[state]
            lesson["_confidence"][state] += confidence[state]
            aggregate_slide["_counts"][state] += counts[state]
            aggregate_slide["_confidence"][state] += confidence[state]

    for session in sessions:
        node = session_nodes[session.pk]
        counts, confidence = node.pop("_counts"), node.pop("_confidence")
        node["states"] = _state_metrics(counts, confidence)
        student = student_nodes.setdefault(session.student_id, {
            "student": _profile_data(session.student), "sessions": [],
            "_counts": empty_totals()[0], "_confidence": empty_totals()[1],
        })
        student["sessions"].append(node)
        for state in StatePrediction.State.values:
            student["_counts"][state] += counts[state]
            student["_confidence"][state] += confidence[state]
    student_results = []
    for node in student_nodes.values():
        node["states"] = _state_metrics(node.pop("_counts"), node.pop("_confidence"))
        student_results.append(node)
    lesson_results = []
    for node in lesson_nodes.values():
        slides = []
        for slide_node in node.pop("slides").values():
            slide_node["states"] = _state_metrics(slide_node.pop("_counts"), slide_node.pop("_confidence"))
            slides.append(slide_node)
        node["session_count"], node["student_count"] = len(node.pop("sessions")), len(node.pop("students"))
        node["states"] = _state_metrics(node.pop("_counts"), node.pop("_confidence"))
        node["slides"] = sorted(slides, key=lambda item: item["position"])
        lesson_results.append(node)
    return JsonResponse({
        "classes": [{"id": item.pk, "name": item.name} for item in classes],
        "selected_class_id": school_class.pk if school_class else None,
        "class_name": school_class.name if school_class else None,
        "range": range_key, "start_date": start_date, "end_date": today,
        "overall": {"session_count": len(sessions), "states": _state_metrics(overall_counts, overall_confidence)},
        "lessons": sorted(lesson_results, key=lambda item: item["title"]),
        "students": sorted(student_results, key=lambda item: item["student"]["name"]),
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
        data = _body(request)
        school_class = SchoolClass.objects.get(pk=data["class_id"])
    except (KeyError, ValueError, SchoolClass.DoesNotExist):
        return JsonResponse({"detail": "A valid class_id is required."}, status=400)
    if not Enrollment.objects.filter(school_class=school_class, student=profile, removed_at__isnull=True).exists():
        return JsonResponse({"detail": "You are not enrolled in this class."}, status=403)
    latest_consent = profile.consents.filter(consent_type="eeg_processing").order_by("-recorded_at").first()
    if not latest_consent or not latest_consent.granted or latest_consent.withdrawn_at or (latest_consent.expires_at and latest_consent.expires_at <= timezone.now()):
        return JsonResponse({"detail": "Active EEG-processing consent is required before starting a session."}, status=403)
    lesson = None
    if data.get("lesson_id") is not None:
        lesson = Lesson.objects.filter(
            pk=data["lesson_id"], archived_at__isnull=True, status=Lesson.Status.APPROVED,
            package__class_assignments__school_class=school_class,
        ).first()
        if lesson is None:
            return JsonResponse({"detail": "The selected lesson is not available in this class."}, status=400)
    control_mode = str(data.get("control_mode", LearningSession.ControlMode.AUTOMATIC))
    if control_mode not in LearningSession.ControlMode.values:
        return JsonResponse({"detail": "A valid control_mode is required."}, status=400)
    try:
        session = LearningSession.objects.create(
            school_class=school_class, student=profile, lesson=lesson, control_mode=control_mode,
        )
    except IntegrityError:
        return JsonResponse({"detail": "This student already has an active session."}, status=409)
    _audit(profile, "session_started", session, {"student_pseudonym": str(profile.pseudonym)})
    return JsonResponse({"id": str(session.id), "class_id": school_class.pk, "lesson_id": session.lesson_id, "control_mode": session.control_mode, "student_pseudonym": str(profile.pseudonym), "started_at": session.started_at}, status=201)


def _student_session_data(session, now):
    ended_at = session.ended_at or now
    duration_seconds = max(0, int((ended_at - session.started_at).total_seconds()))
    state_counts = {
        "focused": session.focused_count,
        "relaxed": session.relaxed_count,
        "distracted": session.distracted_count,
        "overstimulated": session.overstimulated_count,
    }
    prediction_total = sum(state_counts.values())
    if prediction_total:
        state_distribution = {
            state: round(count * 100 / prediction_total)
            for state, count in state_counts.items()
        }
    else:
        state_distribution = {state: 0 for state in state_counts}
        fallback_state = {"focus": "focused", "relax": "relaxed"}.get(session.active_presentation_mode, "focused")
        state_distribution[fallback_state] = 100
    focus_score = state_distribution["focused"]
    dominant_state = max(state_distribution, key=state_distribution.get)
    return {
        "id": str(session.pk),
        "class_id": session.school_class_id,
        "lesson_id": session.lesson_id,
        "control_mode": session.control_mode,
        "title": session.lesson.title if session.lesson_id else session.school_class.name,
        "class_name": session.school_class.name,
        "started_at": session.started_at,
        "ended_at": session.ended_at,
        "duration_seconds": duration_seconds,
        "focus_score": focus_score,
        "state": dominant_state,
        "status": "in_progress" if session.ended_at is None else "completed",
        "tasks_completed": session.tasks_completed,
        "tasks_total": session.tasks_total,
        "state_distribution": state_distribution,
    }


def student_sessions(request):
    profile, error = _require_profile(request, {Profile.Role.STUDENT})
    if error:
        return error
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed."}, status=405)
    sessions = list(
        LearningSession.objects.filter(student=profile)
        .select_related("school_class", "lesson")
        .annotate(
            tasks_completed=Count("activity_responses__activity", distinct=True),
            tasks_total=Count("lesson__slides", distinct=True),
            focused_count=Count("state_predictions", filter=Q(state_predictions__state=StatePrediction.State.FOCUSED), distinct=True),
            relaxed_count=Count("state_predictions", filter=Q(state_predictions__state=StatePrediction.State.RELAXED), distinct=True),
            distracted_count=Count("state_predictions", filter=Q(state_predictions__state=StatePrediction.State.DISTRACTED), distinct=True),
            overstimulated_count=Count("state_predictions", filter=Q(state_predictions__state=StatePrediction.State.OVERSTIMULATED), distinct=True),
        )
        .order_by("-started_at")
    )
    now = timezone.now()
    items = [_student_session_data(session, now) for session in sessions]
    completed = [item for item in items if item["status"] == "completed"]
    total_duration = sum(item["duration_seconds"] for item in completed)
    average_focus = round(sum(item["focus_score"] for item in completed) / len(completed)) if completed else 0
    return JsonResponse({
        "summary": {
            "completed_sessions": len(completed),
            "average_focus_score": average_focus,
            "total_duration_seconds": total_duration,
        },
        "sessions": items,
    })


def teacher_reports(request):
    profile, error = _require_profile(request, {Profile.Role.TEACHER})
    if error:
        return error
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed."}, status=405)
    class_items = list(SchoolClass.objects.filter(
        teacher=profile, status=SchoolClass.Status.ACTIVE,
    ).order_by("name"))
    class_id = request.GET.get("class_id")
    selected_class = next((item for item in class_items if str(item.pk) == class_id), None) if class_id else (class_items[0] if class_items else None)
    if class_id and selected_class is None:
        return JsonResponse({"detail": "Class not found."}, status=404)

    range_key = request.GET.get("range", "month")
    if range_key not in {"week", "month", "term"}:
        return JsonResponse({"detail": "range must be week, month, or term."}, status=400)
    today = timezone.localdate()
    start_date = today - timedelta(days=today.weekday()) if range_key == "week" else (today.replace(day=1) if range_key == "month" else None)
    sessions = LearningSession.objects.none()
    if selected_class:
        sessions = LearningSession.objects.filter(
            school_class=selected_class, ended_at__isnull=False,
        ).select_related("student", "analytics").prefetch_related("state_predictions")
        if start_date:
            sessions = sessions.filter(started_at__date__gte=start_date)
    sessions = list(sessions.order_by("started_at"))

    state_percentage_totals = {state: 0.0 for state in StatePrediction.State.values}
    sessions_with_state_data = 0
    focus_percentages = []
    focused_seconds = 0
    total_duration_seconds = 0
    session_rows = []
    for session in sessions:
        duration = max(0, int(((session.ended_at or session.started_at) - session.started_at).total_seconds()))
        total_duration_seconds += duration
        predictions = list(session.state_predictions.all())
        counts = {state: 0 for state in state_percentage_totals}
        for prediction in predictions:
            counts[prediction.state] += 1
        analytics = getattr(session, "analytics", None)
        if analytics is not None:
            focus = round(float(analytics.focused_percentage))
            session_focused_seconds = analytics.focused_seconds
            state_percentage_totals[StatePrediction.State.FOCUSED] += float(analytics.focused_percentage)
            state_percentage_totals[StatePrediction.State.RELAXED] += float(analytics.relaxed_percentage)
            state_percentage_totals[StatePrediction.State.DISTRACTED] += float(analytics.distracted_percentage)
            state_percentage_totals[StatePrediction.State.OVERSTIMULATED] += float(analytics.overstimulated_percentage)
            sessions_with_state_data += 1
        else:
            focus = round(counts[StatePrediction.State.FOCUSED] * 100 / len(predictions)) if predictions else 0
            session_focused_seconds = round(duration * focus / 100)
            if predictions:
                for state, count in counts.items():
                    state_percentage_totals[state] += count * 100 / len(predictions)
                sessions_with_state_data += 1
        focus_percentages.append(focus)
        focused_seconds += session_focused_seconds
        session_rows.append({
            "id": str(session.pk), "date": timezone.localtime(session.started_at).date(),
            "student": _profile_data(session.student), "duration_seconds": duration,
            "focus_percentage": focus, "tasks_completed": session.activity_responses.count(),
            "mode_changes": session.adaptation_events.count() + session.manual_overrides.count(),
        })
    distribution = {
        state: round(total / sessions_with_state_data) if sessions_with_state_data else 0
        for state, total in state_percentage_totals.items()
    }
    return JsonResponse({
        "classes": [{"id": item.pk, "name": item.name} for item in class_items],
        "selected_class_id": selected_class.pk if selected_class else None,
        "class_name": selected_class.name if selected_class else None,
        "school_year": selected_class.school_year if selected_class else "",
        "range": range_key, "start_date": start_date, "end_date": today,
        "prepared_by": profile.display_name,
        "summary": {
            "sessions": len(sessions),
            "participating_students": len({item.student_id for item in sessions}),
            "average_focus_percentage": round(sum(focus_percentages) / len(focus_percentages)) if focus_percentages else 0,
            "focused_duration_seconds": focused_seconds,
            "total_duration_seconds": total_duration_seconds,
            "mode_changes": sum(item["mode_changes"] for item in session_rows),
            "tasks_completed": sum(item["tasks_completed"] for item in session_rows),
        },
        "state_distribution": distribution,
        "sessions": session_rows,
    })


@require_http_methods(["GET", "POST"])
def student_journals(request):
    profile, error = _require_profile(request, {Profile.Role.STUDENT})
    if error:
        return error
    is_multipart = request.method == "POST" and (request.content_type or "").startswith("multipart/form-data")
    try:
        data = request.POST if is_multipart else (_body(request) if request.method == "POST" else request.GET)
    except ValueError:
        return JsonResponse({"detail": "Invalid request body."}, status=400)
    session_id = data.get("session_id")
    sessions = LearningSession.objects.select_related("school_class", "lesson").filter(
        student=profile, ended_at__isnull=False,
    )
    if session_id:
        session = get_object_or_404(sessions, pk=session_id)
    elif request.method == "GET":
        session = sessions.order_by("-ended_at").first()
        if session is None:
            return JsonResponse({"detail": "Complete a learning session before writing a journal."}, status=404)
    else:
        return JsonResponse({"detail": "A session_id is required."}, status=400)
    if session.ended_at is None:
        return JsonResponse({"detail": "Finish the session before writing its journal."}, status=409)

    completed_task_titles = (
        session.activity_responses.filter(is_correct=True)
        .order_by("answered_at")
        .values_list("activity__title", flat=True)
    )
    completed_tasks = list(dict.fromkeys(completed_task_titles))
    duration_seconds = max(0, int((session.ended_at - session.started_at).total_seconds()))
    entry = session.journal_entries.filter(student=profile).order_by("-created_at").first()

    if request.method == "GET":
        return JsonResponse({
            "session": {
                "id": str(session.pk),
                "title": session.lesson.title if session.lesson_id else session.school_class.name,
                "class_name": session.school_class.name,
                "duration_seconds": duration_seconds,
                "completed_tasks": completed_tasks,
            },
            "entry": {
                "id": str(entry.pk), "prompt": entry.prompt, "response_type": entry.response_type,
                "text_response": entry.text_response, "mood": entry.mood,
                "shared_with_teacher": entry.shared_with_teacher, "created_at": entry.created_at,
            } if entry else None,
        })

    prompt = str(data.get("prompt", "")).strip()
    response_type = str(data.get("response_type", JournalEntry.ResponseType.TEXT))
    text_response = str(data.get("text_response", "")).strip()
    mood = str(data.get("mood", "")).strip()
    allowed_moods = {"", "happy", "okay", "tired", "confused", "proud"}
    if not prompt or len(prompt) > 500:
        return JsonResponse({"detail": "A journal prompt of at most 500 characters is required."}, status=400)
    if response_type not in JournalEntry.ResponseType.values:
        return JsonResponse({"detail": "The journal response type is invalid."}, status=400)
    if response_type == JournalEntry.ResponseType.TEXT and (not text_response or len(text_response) > 5000):
        return JsonResponse({"detail": "Write a response of at most 5,000 characters."}, status=400)
    if mood not in allowed_moods:
        return JsonResponse({"detail": "The selected mood is invalid."}, status=400)

    shared_with_teacher = data.get("shared_with_teacher", True)
    if is_multipart:
        shared_with_teacher = str(shared_with_teacher).lower() == "true"
    if not isinstance(shared_with_teacher, bool):
        return JsonResponse({"detail": "shared_with_teacher must be true or false."}, status=400)
    uploaded = request.FILES.get("file") if is_multipart else None
    asset = None
    if response_type in {JournalEntry.ResponseType.DRAWING, JournalEntry.ResponseType.AUDIO}:
        if uploaded is None:
            return JsonResponse({"detail": "A drawing or recording file is required."}, status=400)
        expected_prefix = "image/" if response_type == JournalEntry.ResponseType.DRAWING else "audio/"
        if not uploaded.content_type.startswith(expected_prefix):
            return JsonResponse({"detail": f"The uploaded file is not a valid {response_type}."}, status=400)
        checksum = _validated_upload(uploaded)
        if checksum is None:
            return JsonResponse({"detail": "Unsupported or invalid journal file, or file exceeds the 10 MB limit."}, status=400)

    created = entry is None
    with transaction.atomic():
        if uploaded is not None:
            asset = Asset.objects.create(
                file=uploaded, original_name=Path(uploaded.name).name,
                mime_type=uploaded.content_type, size_bytes=uploaded.size,
                checksum_sha256=checksum, uploaded_by=profile,
            )
        if entry is None:
            entry = JournalEntry(session=session, student=profile)
        entry.prompt = prompt
        entry.response_type = response_type
        entry.text_response = text_response if response_type == JournalEntry.ResponseType.TEXT else ""
        entry.mood = mood
        entry.shared_with_teacher = shared_with_teacher
        if asset is not None:
            entry.asset = asset
        entry.save()
    _audit(profile, "journal_created" if created else "journal_updated", entry, {"session_id": str(session.pk)})
    return JsonResponse({"id": str(entry.pk), "status": "saved"}, status=201 if created else 200)


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
    session.slide_exposures.filter(exited_at__isnull=True).update(exited_at=session.ended_at)
    session.status = LearningSession.Status.COMPLETED
    session.save(update_fields=["ended_at", "status"])
    _audit(profile, "session_ended", session)
    return JsonResponse({"id": str(session.id), "ended_at": session.ended_at})


@require_POST
def session_slide_exposure(request, session_id, slide_id):
    profile, error = _require_profile(request, {Profile.Role.STUDENT})
    if error:
        return error
    session = get_object_or_404(LearningSession, pk=session_id, student=profile)
    slide = get_object_or_404(Slide.objects.select_related("lesson"), pk=slide_id)
    if session.lesson_id != slide.lesson_id:
        return JsonResponse({"detail": "This slide does not belong to the session lesson."}, status=400)
    try:
        action = str(_body(request).get("action", "enter"))
    except ValueError:
        return JsonResponse({"detail": "Invalid request body."}, status=400)
    now = timezone.now()
    active = session.slide_exposures.filter(exited_at__isnull=True).first()
    if action == "exit":
        if active and active.slide_id == slide.pk:
            active.exited_at = now
            active.save(update_fields=["exited_at"])
        return JsonResponse({"status": "closed", "exited_at": now})
    if action != "enter":
        return JsonResponse({"detail": "action must be enter or exit."}, status=400)
    if session.ended_at is not None:
        return JsonResponse({"detail": "The session has already ended."}, status=409)
    if active and active.slide_id == slide.pk:
        return JsonResponse({"id": str(active.pk), "entered_at": active.entered_at, "status": "active"})
    with transaction.atomic():
        session.slide_exposures.filter(exited_at__isnull=True).update(exited_at=now)
        exposure = SessionSlideExposure.objects.create(session=session, slide=slide, entered_at=now)
    return JsonResponse({"id": str(exposure.pk), "entered_at": exposure.entered_at, "status": "active"}, status=201)


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
