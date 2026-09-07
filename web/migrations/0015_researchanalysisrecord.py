import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("web", "0014_sessionslideexposure")]

    operations = [
        migrations.CreateModel(
            name="ResearchAnalysisRecord",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("phase", models.CharField(choices=[("phase_2", "Phase 2 - Data Collection and Modeling"), ("phase_3", "Phase 3 - Development and Refinement")], max_length=20)),
                ("analysis_key", models.CharField(max_length=80)),
                ("analysis_name", models.CharField(max_length=200)),
                ("scope_label", models.CharField(max_length=200)),
                ("source_reference", models.CharField(blank=True, max_length=300)),
                ("values", models.JSONField(default=dict)),
                ("result", models.CharField(choices=[("pending", "Pending review"), ("passed", "Passed"), ("failed", "Failed"), ("informational", "Informational")], default="pending", max_length=20)),
                ("notes", models.TextField(blank=True)),
                ("recorded_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="research_analysis_records", to="web.profile")),
            ],
            options={"ordering": ("-created_at",)},
        ),
        migrations.AddIndex(model_name="researchanalysisrecord", index=models.Index(fields=["phase", "analysis_key", "-created_at"], name="web_researc_phase_6c7bd3_idx")),
        migrations.AddIndex(model_name="researchanalysisrecord", index=models.Index(fields=["recorded_by", "-created_at"], name="web_researc_recorde_8e9ec7_idx")),
    ]
