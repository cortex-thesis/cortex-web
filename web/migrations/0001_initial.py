# Generated manually because the deployment environment may not include Django tooling.
import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True
    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [
        migrations.CreateModel(
            name="Profile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("role", models.CharField(choices=[("student", "Student"), ("teacher", "Teacher"), ("admin", "Administrator")], max_length=20)),
                ("display_name", models.CharField(max_length=160)),
                ("pseudonym", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="profile", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name="SchoolClass",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=160)),
                ("code", models.CharField(max_length=12, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("teacher", models.ForeignKey(limit_choices_to={"role": "teacher"}, on_delete=django.db.models.deletion.PROTECT, related_name="taught_classes", to="web.profile")),
            ],
        ),
        migrations.CreateModel(
            name="ConsentRecord",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("consent_type", models.CharField(max_length=80)),
                ("version", models.CharField(max_length=30)),
                ("granted", models.BooleanField()),
                ("recorded_at", models.DateTimeField(auto_now_add=True)),
                ("profile", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="consents", to="web.profile")),
            ],
        ),
        migrations.CreateModel(
            name="Enrollment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("enrolled_at", models.DateTimeField(auto_now_add=True)),
                ("removed_at", models.DateTimeField(blank=True, null=True)),
                ("enrolled_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="created_enrollments", to="web.profile")),
                ("school_class", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="enrollments", to="web.schoolclass")),
                ("student", models.ForeignKey(limit_choices_to={"role": "student"}, on_delete=django.db.models.deletion.PROTECT, related_name="enrollments", to="web.profile")),
            ],
            options={"constraints": [models.UniqueConstraint(fields=("school_class", "student"), name="unique_class_student")]},
        ),
        migrations.CreateModel(
            name="LearningSession",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("started_at", models.DateTimeField(auto_now_add=True)),
                ("ended_at", models.DateTimeField(blank=True, null=True)),
                ("school_class", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="sessions", to="web.schoolclass")),
                ("student", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="learning_sessions", to="web.profile")),
            ],
        ),
        migrations.CreateModel(
            name="AuditLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("action", models.CharField(max_length=80)),
                ("object_type", models.CharField(max_length=80)),
                ("object_id", models.CharField(max_length=80)),
                ("metadata", models.JSONField(default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("actor", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to="web.profile")),
            ],
            options={"indexes": [models.Index(fields=("object_type", "object_id"), name="web_auditlo_object__6c6e3e_idx")]},
        ),
    ]
