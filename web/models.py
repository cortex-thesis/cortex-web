import uuid
from pathlib import PurePosixPath

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.validators import FileExtensionValidator, MaxValueValidator, MinValueValidator
from django.utils import timezone


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class School(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    address = models.TextField(blank=True)
    contact_email = models.EmailField(blank=True)
    contact_number = models.CharField(max_length=30, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Profile(models.Model):
    class Role(models.TextChoices):
        STUDENT = "student", "Student"
        TEACHER = "teacher", "Teacher"
        ADMIN = "admin", "Administrator"

    class AccountStatus(models.TextChoices):
        PENDING = "pending", "Pending approval"
        ACTIVE = "active", "Active"
        SUSPENDED = "suspended", "Suspended"
        DISABLED = "disabled", "Disabled"

    class AdminScope(models.TextChoices):
        NONE = "none", "Not an administrator"
        SCHOOL = "school", "School administrator"
        SUPER = "super", "Super administrator"

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    school = models.ForeignKey(School, null=True, blank=True, on_delete=models.PROTECT, related_name="profiles")
    role = models.CharField(max_length=20, choices=Role.choices)
    account_status = models.CharField(max_length=20, choices=AccountStatus.choices, default=AccountStatus.ACTIVE)
    admin_scope = models.CharField(max_length=20, choices=AdminScope.choices, default=AdminScope.NONE)
    approved_by = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL, related_name="approved_profiles")
    approved_at = models.DateTimeField(null=True, blank=True)
    display_name = models.CharField(max_length=160)
    pseudonym = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    student_number = models.CharField(max_length=50, blank=True)
    birthdate = models.DateField(null=True, blank=True)
    guardian_name = models.CharField(max_length=200, blank=True)
    guardian_contact = models.CharField(max_length=30, blank=True)
    guardian_email = models.EmailField(blank=True)
    nonclinical_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, null=True)

    class Meta:
        indexes = [models.Index(fields=("school", "role", "account_status"), name="web_prof_school_role_status")]
        constraints = [
            models.UniqueConstraint(fields=("school", "student_number"), condition=~models.Q(student_number=""), name="unique_school_student_number"),
        ]

    def __str__(self):
        return self.display_name

    @property
    def is_super_admin(self):
        return self.role == self.Role.ADMIN and self.admin_scope == self.AdminScope.SUPER

    @property
    def is_school_admin(self):
        return self.role == self.Role.ADMIN and self.admin_scope == self.AdminScope.SCHOOL


class SchoolClass(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        ARCHIVED = "archived", "Archived"

    school = models.ForeignKey(School, null=True, blank=True, on_delete=models.PROTECT, related_name="classes")
    name = models.CharField(max_length=160)
    code = models.CharField(max_length=12, unique=True)
    teacher = models.ForeignKey(
        Profile,
        on_delete=models.PROTECT,
        related_name="taught_classes",
        limit_choices_to={"role": Profile.Role.TEACHER},
    )
    description = models.TextField(blank=True)
    school_year = models.CharField(max_length=20, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, null=True)

    def __str__(self):
        return f"{self.name} ({self.code})"


class CurriculumPackage(models.Model):
    slug = models.SlugField(max_length=40, unique=True)
    name = models.CharField(max_length=120)
    domain_focus = models.TextField(blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class ClassPackage(models.Model):
    school_class = models.ForeignKey(SchoolClass, on_delete=models.CASCADE, related_name="class_packages")
    package = models.ForeignKey(CurriculumPackage, on_delete=models.PROTECT, related_name="class_assignments")
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=("school_class", "package"), name="unique_class_curriculum_package"),
        ]
        ordering = ("package__id",)

    def __str__(self):
        return f"{self.school_class.name}: {self.package.name}"


@receiver(post_save, sender=SchoolClass)
def assign_all_packages_to_new_class(sender, instance, created, **kwargs):
    if created:
        ClassPackage.objects.bulk_create([
            ClassPackage(school_class=instance, package=package)
            for package in CurriculumPackage.objects.filter(is_active=True)
        ], ignore_conflicts=True)


@receiver(post_save, sender=CurriculumPackage)
def assign_new_package_to_existing_classes(sender, instance, created, **kwargs):
    if created and instance.is_active:
        ClassPackage.objects.bulk_create([
            ClassPackage(school_class=school_class, package=instance)
            for school_class in SchoolClass.objects.all()
        ], ignore_conflicts=True)


class Lesson(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        REVIEW = "review", "For review"
        APPROVED = "approved", "Approved"
        ARCHIVED = "archived", "Archived"

    package = models.ForeignKey(CurriculumPackage, on_delete=models.PROTECT, related_name="lessons")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    competency_code = models.CharField(max_length=100, blank=True)
    competency_description = models.TextField(blank=True)
    estimated_duration_seconds = models.PositiveIntegerField(null=True, blank=True)
    difficulty_level = models.PositiveSmallIntegerField(default=1, validators=[MinValueValidator(1), MaxValueValidator(5)])
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    archived_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(Profile, on_delete=models.PROTECT, related_name="created_lessons")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, null=True)

    class Meta:
        ordering = ["created_at", "id"]


def asset_upload_path(instance, filename):
    extension = PurePosixPath(filename).suffix.lower()
    return f"content/{timezone.now():%Y/%m}/{uuid.uuid4().hex}{extension}"


class Asset(models.Model):
    class Status(models.TextChoices):
        VALIDATED = "validated", "Validated"
        REJECTED = "rejected", "Rejected"

    file = models.FileField(upload_to=asset_upload_path, validators=[FileExtensionValidator(allowed_extensions=["jpg", "jpeg", "png", "gif", "webp", "mp3", "wav", "mp4", "webm", "pdf"])])
    original_name = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=100)
    size_bytes = models.PositiveBigIntegerField()
    duration_seconds = models.PositiveIntegerField(null=True, blank=True)
    storage_bucket = models.CharField(max_length=100, default="private-content")
    storage_path = models.TextField(blank=True)
    checksum_sha256 = models.CharField(max_length=64, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.VALIDATED)
    archived_at = models.DateTimeField(null=True, blank=True)
    uploaded_by = models.ForeignKey(Profile, on_delete=models.PROTECT, related_name="uploaded_assets")
    uploaded_at = models.DateTimeField(auto_now_add=True)


class Activity(models.Model):
    class ActivityType(models.TextChoices):
        IMAGE = "image", "Image"
        AUDIO = "audio", "Audio"
        VIDEO = "video", "Video"
        INTERACTIVE = "interactive", "Interactive"

    type = models.CharField(max_length=20, choices=ActivityType.choices)
    title = models.CharField(max_length=200)
    configuration = models.JSONField(default=dict, blank=True)
    asset = models.ForeignKey(Asset, null=True, blank=True, on_delete=models.PROTECT, related_name="activities")
    cognitive_state = models.CharField(max_length=30, blank=True)
    presentation_mode = models.CharField(max_length=20, blank=True)
    visual_intensity = models.PositiveSmallIntegerField(default=3, validators=[MinValueValidator(1), MaxValueValidator(5)])
    audio_intensity = models.PositiveSmallIntegerField(default=3, validators=[MinValueValidator(1), MaxValueValidator(5)])
    pacing_level = models.PositiveSmallIntegerField(default=3, validators=[MinValueValidator(1), MaxValueValidator(5)])


class Slide(models.Model):
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="slides")
    position = models.PositiveIntegerField(default=0)
    title = models.CharField(max_length=200)
    activity = models.OneToOneField(Activity, on_delete=models.CASCADE, related_name="slide")

    class Meta:
        ordering = ["position", "id"]
        constraints = [models.UniqueConstraint(fields=("lesson", "position"), name="unique_lesson_slide_position")]


class ContentAssignment(models.Model):
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="assignments")
    school_class = models.ForeignKey(SchoolClass, null=True, blank=True, on_delete=models.CASCADE, related_name="content_assignments")
    student = models.ForeignKey(Profile, null=True, blank=True, on_delete=models.CASCADE, related_name="content_assignments")
    assigned_by = models.ForeignKey(Profile, on_delete=models.PROTECT, related_name="created_content_assignments")
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.CheckConstraint(condition=models.Q(school_class__isnull=False) | models.Q(student__isnull=False), name="assignment_has_target"),
            models.UniqueConstraint(fields=("lesson", "school_class"), condition=models.Q(student__isnull=True), name="unique_class_lesson_assignment"),
            models.UniqueConstraint(fields=("lesson", "school_class", "student"), condition=models.Q(student__isnull=False), name="unique_student_lesson_assignment"),
        ]


class Enrollment(models.Model):
    school_class = models.ForeignKey(SchoolClass, on_delete=models.CASCADE, related_name="enrollments")
    student = models.ForeignKey(
        Profile,
        on_delete=models.PROTECT,
        related_name="enrollments",
        limit_choices_to={"role": Profile.Role.STUDENT},
    )
    enrolled_by = models.ForeignKey(Profile, on_delete=models.PROTECT, related_name="created_enrollments")
    enrolled_at = models.DateTimeField(auto_now_add=True)
    removed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("school_class", "student"), name="unique_class_student"
            )
        ]


class ConsentRecord(models.Model):
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="consents")
    consent_type = models.CharField(max_length=80)
    version = models.CharField(max_length=30)
    granted = models.BooleanField()
    subject = models.CharField(max_length=20, default="student")
    granted_by_name = models.CharField(max_length=200, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    withdrawn_at = models.DateTimeField(null=True, blank=True)
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=("profile", "consent_type", "-recorded_at"))]


class UserPreference(models.Model):
    profile = models.OneToOneField(Profile, primary_key=True, on_delete=models.CASCADE, related_name="preferences")
    notifications_enabled = models.BooleanField(default=True)
    sound_enabled = models.BooleanField(default=True)
    haptics_enabled = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)


class Notification(models.Model):
    class Kind(models.TextChoices):
        ACHIEVEMENT = "achievement", "Achievement"
        JOURNAL = "journal", "Journal"
        CLASS = "class", "Class"
        SYSTEM = "system", "System"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="notifications")
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.SYSTEM)
    title = models.CharField(max_length=200)
    body = models.TextField()
    link = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [models.Index(fields=("recipient", "read_at", "-created_at"))]


class ClassSession(TimeStampedModel):
    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "Scheduled"
        ACTIVE = "active", "Active"
        PAUSED = "paused", "Paused"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    school_class = models.ForeignKey(SchoolClass, on_delete=models.PROTECT, related_name="class_sessions")
    lesson = models.ForeignKey(Lesson, null=True, blank=True, on_delete=models.PROTECT, related_name="class_sessions")
    started_by = models.ForeignKey(Profile, on_delete=models.PROTECT, related_name="started_class_sessions")
    title = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SCHEDULED)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=("school_class",), condition=models.Q(status="active"), name="one_active_class_session")]
        indexes = [models.Index(fields=("school_class", "-scheduled_at"))]


class LearningSession(models.Model):
    class ControlMode(models.TextChoices):
        AUTOMATIC = "automatic", "Automatic"
        TEACHER = "teacher", "Teacher directed"
        FREE = "free", "Free"

    class Status(models.TextChoices):
        JOINED = "joined", "Joined"
        ACTIVE = "active", "Active"
        PAUSED = "paused", "Paused"
        COMPLETED = "completed", "Completed"
        LEFT = "left", "Left"
        INTERRUPTED = "interrupted", "Interrupted"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    class_session = models.ForeignKey(ClassSession, null=True, blank=True, on_delete=models.CASCADE, related_name="student_sessions")
    school_class = models.ForeignKey(SchoolClass, on_delete=models.PROTECT, related_name="sessions")
    student = models.ForeignKey(Profile, on_delete=models.PROTECT, related_name="learning_sessions")
    lesson = models.ForeignKey(Lesson, null=True, blank=True, on_delete=models.PROTECT, related_name="learning_sessions")
    control_mode = models.CharField(max_length=20, choices=ControlMode.choices, default=ControlMode.AUTOMATIC)
    active_presentation_mode = models.CharField(max_length=20, default="focus")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    joined_at = models.DateTimeField(default=timezone.now)
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    completion_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    class Meta:
        indexes = [
            models.Index(fields=("student", "ended_at", "-started_at")),
            models.Index(fields=("school_class", "-started_at")),
        ]
        constraints = [
            models.UniqueConstraint(fields=("student",), condition=models.Q(ended_at__isnull=True), name="one_active_session_per_student"),
            models.CheckConstraint(condition=models.Q(completion_percentage__gte=0, completion_percentage__lte=100), name="valid_session_completion_percentage"),
        ]


class SessionSlideExposure(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(LearningSession, on_delete=models.CASCADE, related_name="slide_exposures")
    slide = models.ForeignKey(Slide, on_delete=models.PROTECT, related_name="session_exposures")
    entered_at = models.DateTimeField(default=timezone.now)
    exited_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("entered_at",)
        indexes = [
            models.Index(fields=("session", "entered_at")),
            models.Index(fields=("slide", "entered_at")),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=("session",), condition=models.Q(exited_at__isnull=True),
                name="one_active_slide_per_session",
            ),
            models.CheckConstraint(
                condition=models.Q(exited_at__isnull=True) | models.Q(exited_at__gte=models.F("entered_at")),
                name="slide_exit_not_before_entry",
            ),
        ]


class SessionEEGSample(models.Model):
    """A processed Muse window linked to the lesson slide being viewed."""
    session = models.ForeignKey(LearningSession, on_delete=models.CASCADE, related_name="eeg_samples")
    slide = models.ForeignKey(Slide, null=True, blank=True, on_delete=models.PROTECT, related_name="eeg_samples")
    recorded_at = models.DateTimeField(default=timezone.now)
    bands = models.JSONField(default=dict)
    absolute_bands = models.JSONField(default=dict)
    relative_bands = models.JSONField(default=dict)
    signal_quality = models.JSONField(default=list)
    accepted_channels = models.PositiveSmallIntegerField(default=0)
    battery_level = models.PositiveSmallIntegerField(null=True, blank=True)
    state = models.CharField(max_length=30, choices=(
        ("focused", "Focused"), ("relaxed", "Relaxed"),
        ("distracted", "Distracted"), ("overstimulated", "Overstimulated"),
    ))

    class Meta:
        ordering = ("recorded_at",)
        indexes = [models.Index(fields=("session", "-recorded_at")), models.Index(fields=("slide", "recorded_at"))]


class ResearchAnalysisRecord(TimeStampedModel):
    class Phase(models.TextChoices):
        PHASE_2 = "phase_2", "Phase 2 - Data Collection and Modeling"
        PHASE_3 = "phase_3", "Phase 3 - Development and Refinement"

    class Result(models.TextChoices):
        PENDING = "pending", "Pending review"
        PASSED = "passed", "Passed"
        FAILED = "failed", "Failed"
        INFORMATIONAL = "informational", "Informational"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phase = models.CharField(max_length=20, choices=Phase.choices)
    analysis_key = models.CharField(max_length=80)
    analysis_name = models.CharField(max_length=200)
    scope_label = models.CharField(max_length=200)
    source_reference = models.CharField(max_length=300, blank=True)
    values = models.JSONField(default=dict)
    result = models.CharField(max_length=20, choices=Result.choices, default=Result.PENDING)
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(Profile, on_delete=models.PROTECT, related_name="research_analysis_records")

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("phase", "analysis_key", "-created_at")),
            models.Index(fields=("recorded_by", "-created_at")),
        ]


class Intervention(models.Model):
    class Action(models.TextChoices):
        SET_MODE = "set_mode", "Set mode"
        SET_CONTENT = "set_content", "Set content"
        PAUSE = "pause", "Pause"
        RESUME = "resume", "Resume"
        RETURN_AUTO = "return_auto", "Return to automatic"

    class Priority(models.TextChoices):
        URGENT = "urgent", "Urgent"
        HIGH = "high", "High"
        NORMAL = "normal", "Normal"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        DELIVERED = "delivered", "Delivered"
        APPLIED = "applied", "Applied"
        REJECTED = "rejected", "Rejected"
        EXPIRED = "expired", "Expired"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(LearningSession, on_delete=models.CASCADE, related_name="interventions")
    student = models.ForeignKey(Profile, on_delete=models.PROTECT, related_name="interventions_received")
    actor = models.ForeignKey(Profile, on_delete=models.PROTECT, related_name="interventions_issued")
    action = models.CharField(max_length=30, choices=Action.choices)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.NORMAL)
    state = models.CharField(max_length=30, blank=True)
    mode = models.CharField(max_length=20, blank=True)
    content = models.ForeignKey("Lesson", null=True, blank=True, on_delete=models.PROTECT, related_name="interventions")
    duration_seconds = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    correlation_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    requested_at = models.DateTimeField(auto_now_add=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    applied_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    payload = models.JSONField(default=dict, blank=True)


class InterventionAlert(models.Model):
    intervention = models.OneToOneField(Intervention, on_delete=models.CASCADE, related_name="alert")
    title = models.CharField(max_length=200)
    message = models.TextField()
    priority = models.CharField(max_length=20, choices=Intervention.Priority.choices)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class AuditLog(models.Model):
    actor = models.ForeignKey(Profile, null=True, blank=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=80)
    object_type = models.CharField(max_length=80)
    object_id = models.CharField(max_length=80)
    metadata = models.JSONField(default=dict)
    old_values = models.JSONField(default=dict, blank=True)
    new_values = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=("object_type", "object_id")),
            models.Index(fields=("actor", "-created_at")),
        ]


class EEGDevice(TimeStampedModel):
    class Status(models.TextChoices):
        AVAILABLE = "available", "Available"
        CONNECTED = "connected", "Connected"
        MAINTENANCE = "maintenance", "Maintenance"
        INACTIVE = "inactive", "Inactive"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    school = models.ForeignKey(School, on_delete=models.PROTECT, related_name="eeg_devices")
    device_name = models.CharField(max_length=100)
    manufacturer = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    serial_number = models.CharField(max_length=100, unique=True)
    connection_type = models.CharField(max_length=30, default="bluetooth")
    sampling_rate_hz = models.PositiveIntegerField()
    channel_count = models.PositiveSmallIntegerField()
    channel_names = models.JSONField(default=list)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.AVAILABLE)


class CalibrationProfile(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(Profile, on_delete=models.PROTECT, related_name="calibrations")
    device = models.ForeignKey(EEGDevice, on_delete=models.PROTECT, related_name="calibrations")
    model_version = models.ForeignKey("ModelVersion", null=True, blank=True, on_delete=models.PROTECT, related_name="calibrations")
    feature_baseline = models.JSONField(default=dict)
    quality_score = models.DecimalField(max_digits=7, decimal_places=4, null=True, blank=True)
    calibrated_at = models.DateTimeField()
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        indexes = [models.Index(fields=("student", "is_active", "-calibrated_at"))]


class EEGConnection(models.Model):
    class Status(models.TextChoices):
        CONNECTED = "connected", "Connected"
        DROPPED = "dropped", "Dropped"
        DISCONNECTED = "disconnected", "Disconnected"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(LearningSession, on_delete=models.CASCADE, related_name="eeg_connections")
    device = models.ForeignKey(EEGDevice, on_delete=models.PROTECT, related_name="connections")
    connected_at = models.DateTimeField()
    disconnected_at = models.DateTimeField(null=True, blank=True)
    connection_status = models.CharField(max_length=20, choices=Status.choices, default=Status.CONNECTED)
    average_signal_quality = models.DecimalField(max_digits=6, decimal_places=3, null=True, blank=True)
    dropout_count = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True)

    class Meta:
        indexes = [models.Index(fields=("session", "-connected_at"))]
        constraints = [models.UniqueConstraint(fields=("device",), condition=models.Q(disconnected_at__isnull=True), name="one_active_connection_per_device")]


class EEGRecording(models.Model):
    class ProcessingStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        RECORDING = "recording", "Recording"
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(LearningSession, on_delete=models.CASCADE, related_name="eeg_recordings")
    connection = models.ForeignKey(EEGConnection, on_delete=models.PROTECT, related_name="recordings")
    started_at = models.DateTimeField()
    ended_at = models.DateTimeField(null=True, blank=True)
    sampling_rate_hz = models.PositiveIntegerField()
    channel_count = models.PositiveSmallIntegerField(default=1)
    channel_names = models.JSONField(default=list, blank=True)
    storage_location = models.CharField(max_length=20, default="local")
    raw_storage_path = models.TextField(blank=True)
    processed_storage_path = models.TextField(blank=True)
    format = models.CharField(max_length=20, default="parquet")
    total_samples = models.PositiveBigIntegerField(default=0)
    raw_file_size_bytes = models.PositiveBigIntegerField(default=0)
    processed_file_size_bytes = models.PositiveBigIntegerField(default=0)
    raw_checksum_sha256 = models.CharField(max_length=64, blank=True)
    processed_checksum_sha256 = models.CharField(max_length=64, blank=True)
    processing_status = models.CharField(max_length=20, choices=ProcessingStatus.choices, default=ProcessingStatus.PENDING)
    processing_error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=("session", "-created_at"))]
        constraints = [
            models.CheckConstraint(condition=models.Q(ended_at__isnull=True) | models.Q(ended_at__gte=models.F("started_at")), name="recording_end_not_before_start"),
        ]

    @property
    def raw_object_key(self):
        return self.raw_storage_path

    @property
    def processed_object_key(self):
        return self.processed_storage_path

    def clean(self):
        super().clean()
        errors = {}
        if self.sampling_rate_hz <= 0:
            errors["sampling_rate_hz"] = "Sampling rate must be positive."
        if self.channel_count <= 0:
            errors["channel_count"] = "Channel count must be positive."
        if self.ended_at and self.ended_at < self.started_at:
            errors["ended_at"] = "End time cannot precede start time."
        for field in ("raw_checksum_sha256", "processed_checksum_sha256"):
            value = getattr(self, field)
            if value and (len(value) != 64 or any(c not in "0123456789abcdefABCDEF" for c in value)):
                errors[field] = "Checksum must be a 64-character SHA-256 hex string."
        for field in ("raw_storage_path", "processed_storage_path"):
            value = getattr(self, field)
            normalized = value.replace("\\", "/")
            path = PurePosixPath(normalized)
            if value and (path.is_absolute() or ".." in path.parts or (len(normalized) > 1 and normalized[1] == ":")):
                errors[field] = "Storage paths must be safe relative object keys."
        if errors:
            raise ValidationError(errors)


class EEGEpoch(models.Model):
    recording = models.ForeignKey(EEGRecording, on_delete=models.CASCADE, related_name="epochs")
    epoch_number = models.PositiveIntegerField()
    start_offset_ms = models.PositiveIntegerField()
    end_offset_ms = models.PositiveIntegerField()
    started_at = models.DateTimeField()
    signal_quality_index = models.DecimalField(max_digits=7, decimal_places=4, null=True, blank=True)
    signal_to_noise_ratio_db = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True)
    is_usable = models.BooleanField(default=True)
    rejection_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("recording", "epoch_number")
        constraints = [
            models.UniqueConstraint(fields=("recording", "epoch_number"), name="unique_recording_epoch"),
            models.CheckConstraint(condition=models.Q(end_offset_ms__gt=models.F("start_offset_ms")), name="valid_epoch_offsets"),
        ]


class EEGFeature(models.Model):
    epoch = models.OneToOneField(EEGEpoch, primary_key=True, on_delete=models.CASCADE, related_name="features")
    theta_power = models.FloatField()
    alpha_power = models.FloatField()
    beta_power = models.FloatField()
    gamma_power = models.FloatField()
    theta_beta_ratio = models.FloatField()
    theta_zscore = models.FloatField(null=True, blank=True)
    alpha_zscore = models.FloatField(null=True, blank=True)
    beta_zscore = models.FloatField(null=True, blank=True)
    gamma_zscore = models.FloatField(null=True, blank=True)
    tbr_zscore = models.FloatField(null=True, blank=True)
    extracted_at = models.DateTimeField(auto_now_add=True)


class ModelVersion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150)
    algorithm = models.CharField(max_length=50)
    version = models.CharField(max_length=30)
    storage_path = models.TextField()
    hyperparameters = models.JSONField(default=dict)
    feature_means = models.JSONField(default=dict)
    feature_standard_deviations = models.JSONField(default=dict)
    metrics = models.JSONField(default=dict)
    dataset_fingerprint = models.CharField(max_length=128, blank=True)
    is_active = models.BooleanField(default=False)
    trained_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=("name", "version"), name="unique_model_name_version"),
            models.UniqueConstraint(fields=("name",), condition=models.Q(is_active=True), name="one_active_version_per_model"),
        ]
        indexes = [models.Index(fields=("is_active", "-trained_at"))]


class StatePrediction(models.Model):
    class State(models.TextChoices):
        FOCUSED = "focused", "Focused"
        RELAXED = "relaxed", "Relaxed"
        DISTRACTED = "distracted", "Distracted"
        OVERSTIMULATED = "overstimulated", "Overstimulated"

    session = models.ForeignKey(LearningSession, on_delete=models.CASCADE, related_name="state_predictions")
    epoch = models.ForeignKey(EEGEpoch, on_delete=models.CASCADE, related_name="predictions")
    model_version = models.ForeignKey(ModelVersion, on_delete=models.PROTECT, related_name="predictions")
    state = models.CharField(max_length=30, choices=State.choices)
    cluster_number = models.SmallIntegerField(null=True, blank=True)
    confidence_score = models.DecimalField(max_digits=7, decimal_places=6, validators=[MinValueValidator(0), MaxValueValidator(1)])
    classified_at = models.DateTimeField()
    processing_time_ms = models.PositiveIntegerField()
    is_critical = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=("session", "-classified_at")),
            models.Index(fields=("session", "state", "-classified_at")),
        ]


class AdaptationRule(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    state = models.CharField(max_length=30, choices=StatePrediction.State.choices)
    target_mode = models.CharField(max_length=20)
    minimum_confidence = models.DecimalField(max_digits=7, decimal_places=6, default=0, validators=[MinValueValidator(0), MaxValueValidator(1)])
    minimum_duration_ms = models.PositiveIntegerField(default=0)
    visual_intensity_delta = models.SmallIntegerField(default=0)
    audio_intensity_delta = models.SmallIntegerField(default=0)
    pacing_delta = models.SmallIntegerField(default=0)
    action_type = models.CharField(max_length=40)
    activity = models.ForeignKey(Activity, null=True, blank=True, on_delete=models.PROTECT, related_name="adaptation_rules")
    priority = models.PositiveSmallIntegerField(default=100)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(Profile, on_delete=models.PROTECT, related_name="adaptation_rules")

    class Meta:
        indexes = [models.Index(fields=("state", "is_active", "priority"))]


class AdaptationEvent(models.Model):
    class Source(models.TextChoices):
        AUTOMATIC = "automatic", "Automatic"
        TEACHER = "teacher", "Teacher"
        STUDENT = "student", "Student"

    session = models.ForeignKey(LearningSession, on_delete=models.CASCADE, related_name="adaptation_events")
    prediction = models.ForeignKey(StatePrediction, null=True, blank=True, on_delete=models.SET_NULL, related_name="adaptation_events")
    rule = models.ForeignKey(AdaptationRule, null=True, blank=True, on_delete=models.SET_NULL, related_name="events")
    activity = models.ForeignKey(Activity, null=True, blank=True, on_delete=models.PROTECT, related_name="adaptation_events")
    source = models.CharField(max_length=20, choices=Source.choices)
    previous_mode = models.CharField(max_length=20, blank=True)
    new_mode = models.CharField(max_length=20, blank=True)
    action_type = models.CharField(max_length=40)
    classified_at = models.DateTimeField(null=True, blank=True)
    triggered_at = models.DateTimeField()
    rendered_at = models.DateTimeField(null=True, blank=True)
    closed_loop_latency_ms = models.PositiveIntegerField(null=True, blank=True)
    was_successful = models.BooleanField(default=False)
    failure_reason = models.TextField(blank=True)

    class Meta:
        indexes = [models.Index(fields=("session", "-triggered_at"))]


class ManualOverride(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(LearningSession, on_delete=models.CASCADE, related_name="manual_overrides")
    teacher = models.ForeignKey(Profile, on_delete=models.PROTECT, related_name="manual_overrides")
    previous_control_mode = models.CharField(max_length=20)
    previous_presentation_mode = models.CharField(max_length=20)
    new_presentation_mode = models.CharField(max_length=20)
    reason = models.TextField(blank=True)
    started_at = models.DateTimeField()
    ended_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=("session",), condition=models.Q(is_active=True), name="one_active_override_per_session")]


class SessionAnalytics(models.Model):
    session = models.OneToOneField(LearningSession, primary_key=True, on_delete=models.CASCADE, related_name="analytics")
    total_duration_seconds = models.PositiveIntegerField(default=0)
    focused_seconds = models.PositiveIntegerField(default=0)
    relaxed_seconds = models.PositiveIntegerField(default=0)
    distracted_seconds = models.PositiveIntegerField(default=0)
    overstimulated_seconds = models.PositiveIntegerField(default=0)
    focused_percentage = models.DecimalField(max_digits=6, decimal_places=3, default=0)
    relaxed_percentage = models.DecimalField(max_digits=6, decimal_places=3, default=0)
    distracted_percentage = models.DecimalField(max_digits=6, decimal_places=3, default=0)
    overstimulated_percentage = models.DecimalField(max_digits=6, decimal_places=3, default=0)
    state_transition_count = models.PositiveIntegerField(default=0)
    adaptation_count = models.PositiveIntegerField(default=0)
    manual_override_count = models.PositiveIntegerField(default=0)
    mean_recovery_time_seconds = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    mean_closed_loop_latency_ms = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    loop_continuity_rate = models.DecimalField(max_digits=7, decimal_places=3, null=True, blank=True)
    engagement_consistency_score = models.DecimalField(max_digits=7, decimal_places=3, null=True, blank=True)
    generated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(condition=models.Q(focused_percentage__gte=0, focused_percentage__lte=100), name="valid_focused_percentage"),
            models.CheckConstraint(condition=models.Q(relaxed_percentage__gte=0, relaxed_percentage__lte=100), name="valid_relaxed_percentage"),
            models.CheckConstraint(condition=models.Q(distracted_percentage__gte=0, distracted_percentage__lte=100), name="valid_distracted_percentage"),
            models.CheckConstraint(condition=models.Q(overstimulated_percentage__gte=0, overstimulated_percentage__lte=100), name="valid_overstimulated_percentage"),
        ]


class Alert(models.Model):
    class Severity(models.TextChoices):
        INFO = "info", "Info"
        WARNING = "warning", "Warning"
        CRITICAL = "critical", "Critical"

    session = models.ForeignKey(LearningSession, on_delete=models.CASCADE, related_name="alerts")
    prediction = models.ForeignKey(StatePrediction, null=True, blank=True, on_delete=models.SET_NULL, related_name="alerts")
    alert_type = models.CharField(max_length=40)
    severity = models.CharField(max_length=20, choices=Severity.choices)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    acknowledged_by = models.ForeignKey(Profile, null=True, blank=True, on_delete=models.PROTECT, related_name="acknowledged_alerts")
    acknowledged_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=("session", "acknowledged_at", "-created_at"))]


class ActivityResponse(models.Model):
    session = models.ForeignKey(LearningSession, on_delete=models.CASCADE, related_name="activity_responses")
    activity = models.ForeignKey(Activity, on_delete=models.PROTECT, related_name="responses")
    response = models.JSONField(default=dict)
    is_correct = models.BooleanField(null=True, blank=True)
    score = models.DecimalField(max_digits=7, decimal_places=3, null=True, blank=True)
    attempt_number = models.PositiveSmallIntegerField(default=1)
    started_at = models.DateTimeField(null=True, blank=True)
    answered_at = models.DateTimeField(auto_now_add=True)
    response_time_ms = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=("session", "answered_at"))]


class JournalEntry(models.Model):
    class ResponseType(models.TextChoices):
        TEXT = "text", "Text"
        DRAWING = "drawing", "Drawing"
        AUDIO = "audio", "Audio"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(LearningSession, on_delete=models.CASCADE, related_name="journal_entries")
    student = models.ForeignKey(Profile, on_delete=models.PROTECT, related_name="journal_entries")
    prompt = models.TextField()
    response_type = models.CharField(max_length=20, choices=ResponseType.choices)
    text_response = models.TextField(blank=True)
    asset = models.ForeignKey(Asset, null=True, blank=True, on_delete=models.PROTECT, related_name="journal_entries")
    mood = models.CharField(max_length=30, blank=True)
    shared_with_teacher = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)


class LessonPracticeProgress(TimeStampedModel):
    student = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='lesson_practice_progress')
    school_class = models.ForeignKey(SchoolClass, on_delete=models.CASCADE)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE)
    completed_slide_ids = models.JSONField(default=list)

    class Meta:
        constraints = [models.UniqueConstraint(fields=('student', 'school_class', 'lesson'), name='unique_student_class_practice')]


class DataLifecycleRequest(TimeStampedModel):
    class RequestType(models.TextChoices):
        EXPORT = "export", "Export"
        DELETE = "delete", "Delete"
        CORRECT = "correct", "Correct"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        REJECTED = "rejected", "Rejected"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    profile = models.ForeignKey(Profile, on_delete=models.PROTECT, related_name="data_requests")
    requested_by = models.ForeignKey(Profile, on_delete=models.PROTECT, related_name="submitted_data_requests")
    request_type = models.CharField(max_length=20, choices=RequestType.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    reason = models.TextField(blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    resolution_notes = models.TextField(blank=True)
