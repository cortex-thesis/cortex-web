import django.db.models.deletion
from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):
    dependencies = [("web", "0016_lesson_practice_progress")]

    operations = [
        migrations.CreateModel(
            name="SessionEEGSample",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("recorded_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("bands", models.JSONField(default=dict)),
                ("absolute_bands", models.JSONField(default=dict)),
                ("relative_bands", models.JSONField(default=dict)),
                ("signal_quality", models.JSONField(default=list)),
                ("accepted_channels", models.PositiveSmallIntegerField(default=0)),
                ("battery_level", models.PositiveSmallIntegerField(blank=True, null=True)),
                ("state", models.CharField(choices=[("focused", "Focused"), ("relaxed", "Relaxed"), ("distracted", "Distracted"), ("overstimulated", "Overstimulated")], max_length=30)),
                ("session", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="eeg_samples", to="web.learningsession")),
                ("slide", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="eeg_samples", to="web.slide")),
            ],
            options={"ordering": ("recorded_at",)},
        ),
        migrations.AddIndex(model_name="sessioneegsample", index=models.Index(fields=["session", "-recorded_at"], name="web_session_session_e75d96_idx")),
        migrations.AddIndex(model_name="sessioneegsample", index=models.Index(fields=["slide", "recorded_at"], name="web_session_slide_i_0298c2_idx")),
    ]
