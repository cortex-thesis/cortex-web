import django.db.models.deletion
import uuid
from django.db import migrations, models
from django.utils import timezone


class Migration(migrations.Migration):
    dependencies = [("web", "0013_profile_account_governance")]

    operations = [
        migrations.CreateModel(
            name="SessionSlideExposure",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("entered_at", models.DateTimeField(default=timezone.now)),
                ("exited_at", models.DateTimeField(blank=True, null=True)),
                ("session", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="slide_exposures", to="web.learningsession")),
                ("slide", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="session_exposures", to="web.slide")),
            ],
            options={"ordering": ("entered_at",)},
        ),
        migrations.AddIndex(model_name="sessionslideexposure", index=models.Index(fields=["session", "entered_at"], name="web_session_session_b678ef_idx")),
        migrations.AddIndex(model_name="sessionslideexposure", index=models.Index(fields=["slide", "entered_at"], name="web_session_slide_i_85d8df_idx")),
        migrations.AddConstraint(model_name="sessionslideexposure", constraint=models.UniqueConstraint(condition=models.Q(("exited_at__isnull", True)), fields=("session",), name="one_active_slide_per_session")),
        migrations.AddConstraint(model_name="sessionslideexposure", constraint=models.CheckConstraint(condition=models.Q(("exited_at__isnull", True), ("exited_at__gte", models.F("entered_at")), _connector="OR"), name="slide_exit_not_before_entry")),
    ]
