from django.conf import settings
import uuid
import django.db.models.deletion
from django.db import migrations, models


def deprecate_public_password_hash(apps, schema_editor):
    if schema_editor.connection.vendor == "postgresql":
        with schema_editor.connection.cursor() as cursor:
            cursor.execute("ALTER TABLE IF EXISTS public.users ALTER COLUMN password_hash DROP NOT NULL")


class Migration(migrations.Migration):
    dependencies = [("web", "0010_public_users")]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[migrations.RunPython(deprecate_public_password_hash, migrations.RunPython.noop)],
            state_operations=[migrations.CreateModel(
                name="PublicUser",
                fields=[
                    ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                    ("school_id", models.UUIDField(blank=True, null=True)),
                    ("email", models.EmailField(blank=True, max_length=254, null=True)),
                    ("username", models.CharField(max_length=100, unique=True)),
                    ("password_hash", models.TextField(blank=True, null=True)),
                    ("role", models.CharField(max_length=20)),
                    ("first_name", models.CharField(blank=True, max_length=100, null=True)),
                    ("middle_name", models.CharField(blank=True, max_length=100, null=True)),
                    ("last_name", models.CharField(blank=True, max_length=100, null=True)),
                    ("profile_image_path", models.TextField(blank=True, null=True)),
                    ("is_active", models.BooleanField(default=True)),
                    ("last_login_at", models.DateTimeField(blank=True, null=True)),
                    ("created_by", models.UUIDField(blank=True, null=True)),
                    ("created_at", models.DateTimeField(auto_now_add=True)),
                    ("updated_at", models.DateTimeField(auto_now=True)),
                    ("auth_user_id", models.IntegerField(blank=True, null=True, unique=True)),
                ],
                options={"db_table": "public.users", "managed": False},
            )],
        ),
        migrations.AlterField(
            model_name="profile", name="user",
            field=models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="profile", to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(model_name="eegrecording", name="channel_count", field=models.PositiveSmallIntegerField(default=1)),
        migrations.AddField(model_name="eegrecording", name="channel_names", field=models.JSONField(blank=True, default=list)),
        migrations.AddField(model_name="eegrecording", name="storage_location", field=models.CharField(default="local", max_length=20)),
        migrations.AddField(model_name="eegrecording", name="raw_file_size_bytes", field=models.PositiveBigIntegerField(default=0)),
        migrations.AddField(model_name="eegrecording", name="processed_file_size_bytes", field=models.PositiveBigIntegerField(default=0)),
        migrations.AddField(model_name="eegrecording", name="raw_checksum_sha256", field=models.CharField(blank=True, max_length=64)),
        migrations.AddField(model_name="eegrecording", name="processed_checksum_sha256", field=models.CharField(blank=True, max_length=64)),
        migrations.AddField(model_name="eegrecording", name="updated_at", field=models.DateTimeField(auto_now=True)),
        migrations.AlterField(
            model_name="eegrecording", name="processing_status",
            field=models.CharField(choices=[("pending", "Pending"), ("recording", "Recording"), ("processing", "Processing"), ("completed", "Completed"), ("failed", "Failed")], default="pending", max_length=20),
        ),
        migrations.AddIndex(
            model_name="eegrecording",
            index=models.Index(fields=["session", "-created_at"], name="web_eegreco_session_36affa_idx"),
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["actor", "-created_at"], name="web_auditlo_actor_i_32c71a_idx"),
        ),
        migrations.AddConstraint(
            model_name="eegrecording",
            constraint=models.CheckConstraint(condition=models.Q(("ended_at__isnull", True), ("ended_at__gte", models.F("started_at")), _connector="OR"), name="recording_end_not_before_start"),
        ),
        migrations.AddConstraint(model_name="sessionanalytics", constraint=models.CheckConstraint(condition=models.Q(("focused_percentage__gte", 0), ("focused_percentage__lte", 100)), name="valid_focused_percentage")),
        migrations.AddConstraint(model_name="sessionanalytics", constraint=models.CheckConstraint(condition=models.Q(("relaxed_percentage__gte", 0), ("relaxed_percentage__lte", 100)), name="valid_relaxed_percentage")),
        migrations.AddConstraint(model_name="sessionanalytics", constraint=models.CheckConstraint(condition=models.Q(("distracted_percentage__gte", 0), ("distracted_percentage__lte", 100)), name="valid_distracted_percentage")),
        migrations.AddConstraint(model_name="sessionanalytics", constraint=models.CheckConstraint(condition=models.Q(("overstimulated_percentage__gte", 0), ("overstimulated_percentage__lte", 100)), name="valid_overstimulated_percentage")),
    ]
