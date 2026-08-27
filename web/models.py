import uuid

from django.contrib.auth.models import User
from django.db import models
from django.core.validators import FileExtensionValidator


class Profile(models.Model):
    class Role(models.TextChoices):
        STUDENT = "student", "Student"
        TEACHER = "teacher", "Teacher"
        ADMIN = "admin", "Administrator"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    role = models.CharField(max_length=20, choices=Role.choices)
    display_name = models.CharField(max_length=160)
    pseudonym = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.display_name


class SchoolClass(models.Model):
    name = models.CharField(max_length=160)
    code = models.CharField(max_length=12, unique=True)
    teacher = models.ForeignKey(
        Profile,
        on_delete=models.PROTECT,
        related_name="taught_classes",
        limit_choices_to={"role": Profile.Role.TEACHER},
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.code})"


class CurriculumPackage(models.Model):
    slug = models.SlugField(max_length=40, unique=True)
    name = models.CharField(max_length=120)

    def __str__(self):
        return self.name


class Lesson(models.Model):
    package = models.ForeignKey(CurriculumPackage, on_delete=models.PROTECT, related_name="lessons")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(Profile, on_delete=models.PROTECT, related_name="created_lessons")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]


class Asset(models.Model):
    class Status(models.TextChoices):
        VALIDATED = "validated", "Validated"
        REJECTED = "rejected", "Rejected"

    file = models.FileField(upload_to="content/%Y/%m/", validators=[FileExtensionValidator(allowed_extensions=["jpg", "jpeg", "png", "gif", "webp", "mp3", "wav", "mp4", "webm", "pdf"])])
    original_name = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=100)
    size_bytes = models.PositiveBigIntegerField()
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
        constraints = [models.CheckConstraint(condition=models.Q(school_class__isnull=False) | models.Q(student__isnull=False), name="assignment_has_target")]


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
    recorded_at = models.DateTimeField(auto_now_add=True)


class LearningSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    school_class = models.ForeignKey(SchoolClass, on_delete=models.PROTECT, related_name="sessions")
    student = models.ForeignKey(Profile, on_delete=models.PROTECT, related_name="learning_sessions")
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)


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
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=("object_type", "object_id"))]
