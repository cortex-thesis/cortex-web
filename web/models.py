import uuid

from django.contrib.auth.models import User
from django.db import models


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


class AuditLog(models.Model):
    actor = models.ForeignKey(Profile, null=True, blank=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=80)
    object_type = models.CharField(max_length=80)
    object_id = models.CharField(max_length=80)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=("object_type", "object_id"))]
