import django.db.models.deletion
import django.utils.timezone
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("web", "0018_studentbadge")]
    operations = [
        migrations.CreateModel(
            name="BaselineRecording",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)), ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("participant_code", models.CharField(max_length=80)), ("age_years", models.PositiveSmallIntegerField(blank=True, null=True)),
                ("sex_at_birth", models.CharField(blank=True, max_length=30)), ("condition", models.CharField(default="neutral_baseline", max_length=40)),
                ("label_source", models.CharField(default="protocol", max_length=40)), ("selected_variables", models.JSONField(default=list)),
                ("device_name", models.CharField(default="Muse 2", max_length=100)), ("sampling_rate_hz", models.PositiveIntegerField(default=256)),
                ("channel_names", models.JSONField(default=list)), ("planned_duration_seconds", models.PositiveIntegerField(default=30)),
                ("epoch_length_seconds", models.PositiveIntegerField(default=2)), ("started_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("ended_at", models.DateTimeField(blank=True, null=True)), ("status", models.CharField(choices=[("recording", "Recording"), ("completed", "Completed"), ("cancelled", "Cancelled")], default="recording", max_length=20)),
                ("consent_confirmed", models.BooleanField(default=False)), ("notes", models.TextField(blank=True)),
                ("participant", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="baseline_recordings", to="web.profile")),
                ("recorded_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="recorded_baselines", to="web.profile")),
            ], options={"ordering": ("-started_at",)},
        ),
        migrations.AddIndex(model_name="baselinerecording", index=models.Index(fields=["participant_code", "-started_at"], name="web_baselin_partici_7201db_idx")),
        migrations.CreateModel(
            name="BaselineEpoch",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("epoch_number", models.PositiveIntegerField()), ("start_offset_ms", models.PositiveIntegerField()), ("end_offset_ms", models.PositiveIntegerField()),
                ("captured_at", models.DateTimeField(default=django.utils.timezone.now)), ("sample_count", models.PositiveIntegerField(default=0)),
                ("raw_channels", models.JSONField(default=dict)), ("channel_statistics", models.JSONField(default=dict)),
                ("absolute_band_powers", models.JSONField(default=dict)), ("relative_band_powers", models.JSONField(default=dict)),
                ("theta_beta_ratio", models.FloatField(blank=True, null=True)), ("signal_quality", models.JSONField(default=list)),
                ("accepted_channels", models.PositiveSmallIntegerField(default=0)), ("battery_level", models.PositiveSmallIntegerField(blank=True, null=True)),
                ("is_usable", models.BooleanField(default=True)),
                ("recording", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="epochs", to="web.baselinerecording")),
            ], options={"ordering": ("recording", "epoch_number")},
        ),
        migrations.AddConstraint(model_name="baselineepoch", constraint=models.UniqueConstraint(fields=("recording", "epoch_number"), name="unique_baseline_epoch")),
        migrations.AddConstraint(model_name="baselineepoch", constraint=models.CheckConstraint(condition=models.Q(("end_offset_ms__gt", models.F("start_offset_ms"))), name="valid_baseline_epoch_offsets")),
    ]
