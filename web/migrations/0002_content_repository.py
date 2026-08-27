from django.db import migrations, models
import django.core.validators
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("web", "0001_initial")]

    operations = [
        migrations.CreateModel(
            name="CurriculumPackage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("slug", models.SlugField(max_length=40, unique=True)),
                ("name", models.CharField(max_length=120)),
            ],
        ),
        migrations.CreateModel(
            name="Asset",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("file", models.FileField(upload_to="content/%Y/%m/", validators=[django.core.validators.FileExtensionValidator(allowed_extensions=["jpg", "jpeg", "png", "gif", "webp", "mp3", "wav", "mp4", "webm", "pdf"])])),
                ("original_name", models.CharField(max_length=255)),
                ("mime_type", models.CharField(max_length=100)),
                ("size_bytes", models.PositiveBigIntegerField()),
                ("status", models.CharField(choices=[("validated", "Validated"), ("rejected", "Rejected")], default="validated", max_length=20)),
                ("archived_at", models.DateTimeField(blank=True, null=True)),
                ("uploaded_at", models.DateTimeField(auto_now_add=True)),
                ("uploaded_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="uploaded_assets", to="web.profile")),
            ],
        ),
        migrations.CreateModel(
            name="Activity",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("type", models.CharField(choices=[("image", "Image"), ("audio", "Audio"), ("video", "Video"), ("interactive", "Interactive")], max_length=20)),
                ("title", models.CharField(max_length=200)),
                ("configuration", models.JSONField(blank=True, default=dict)),
                ("asset", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="activities", to="web.asset")),
            ],
        ),
        migrations.CreateModel(
            name="Lesson",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=200)),
                ("description", models.TextField(blank=True)),
                ("archived_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("created_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="created_lessons", to="web.profile")),
                ("package", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="lessons", to="web.curriculumpackage")),
            ],
            options={"ordering": ["created_at", "id"]},
        ),
        migrations.CreateModel(
            name="Slide",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("position", models.PositiveIntegerField(default=0)),
                ("title", models.CharField(max_length=200)),
                ("activity", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="slide", to="web.activity")),
                ("lesson", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="slides", to="web.lesson")),
            ],
            options={"ordering": ["position", "id"], "constraints": [models.UniqueConstraint(fields=("lesson", "position"), name="unique_lesson_slide_position")]},
        ),
        migrations.CreateModel(
            name="ContentAssignment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("assigned_at", models.DateTimeField(auto_now_add=True)),
                ("assigned_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="created_content_assignments", to="web.profile")),
                ("lesson", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="assignments", to="web.lesson")),
                ("school_class", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="content_assignments", to="web.schoolclass")),
                ("student", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="content_assignments", to="web.profile")),
            ],
            options={"constraints": [models.CheckConstraint(condition=models.Q(school_class__isnull=False) | models.Q(student__isnull=False), name="assignment_has_target")]},
        ),
    ]
