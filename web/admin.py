from django.contrib import admin

from .models import (
    ActivityResponse, AdaptationEvent, AdaptationRule, Alert, AuditLog,
    CalibrationProfile, ClassPackage, ClassSession, ConsentRecord, DataLifecycleRequest,
    EEGConnection, EEGDevice, EEGEpoch, EEGFeature, EEGRecording, Enrollment,
    JournalEntry, LearningSession, ManualOverride, ModelVersion, Profile,
    School, SchoolClass, SessionAnalytics, StatePrediction,
)


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("display_name", "role", "pseudonym", "created_at")
    search_fields = ("display_name", "user__username", "pseudonym")
    readonly_fields = ("pseudonym", "created_at")


@admin.register(SchoolClass)
class SchoolClassAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "teacher", "created_at")
    search_fields = ("name", "code")


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ("school_class", "student", "enrolled_at", "removed_at")
    list_filter = ("removed_at",)


@admin.register(LearningSession)
class LearningSessionAdmin(admin.ModelAdmin):
    list_display = ("id", "school_class", "student", "started_at", "ended_at")
    readonly_fields = ("id", "started_at")


@admin.register(ConsentRecord)
class ConsentRecordAdmin(admin.ModelAdmin):
    list_display = ("profile", "consent_type", "version", "granted", "recorded_at")
    readonly_fields = ("recorded_at",)


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "action", "object_type", "object_id", "actor")
    list_filter = ("action", "object_type")
    readonly_fields = ("actor", "action", "object_type", "object_id", "metadata", "created_at")


admin.site.register([
    School, ClassSession, EEGDevice, CalibrationProfile, EEGConnection,
    EEGRecording, EEGEpoch, EEGFeature, ModelVersion, StatePrediction,
    AdaptationRule, AdaptationEvent, ManualOverride, SessionAnalytics, Alert,
    ActivityResponse, JournalEntry, DataLifecycleRequest,
    ClassPackage,
])
