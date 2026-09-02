from django.db import migrations, models
import django.db.models.deletion
import django.core.validators
import web.models


def classify_existing_administrators(apps, schema_editor):
    Profile = apps.get_model("web", "Profile")
    Profile.objects.filter(role="admin").update(admin_scope="super")


def reverse_classification(apps, schema_editor):
    Profile = apps.get_model("web", "Profile")
    Profile.objects.filter(role="admin").update(admin_scope="none")


class Migration(migrations.Migration):
    dependencies = [("web", "0012_archive_duplicate_public_tables")]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="account_status",
            field=models.CharField(
                choices=[("pending", "Pending approval"), ("active", "Active"), ("suspended", "Suspended"), ("disabled", "Disabled")],
                default="active",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="profile",
            name="admin_scope",
            field=models.CharField(
                choices=[("none", "Not an administrator"), ("school", "School administrator"), ("super", "Super administrator")],
                default="none",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="profile",
            name="approved_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="profile",
            name="approved_by",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="approved_profiles", to="web.profile"),
        ),
        migrations.RunPython(classify_existing_administrators, reverse_classification),
        migrations.AddIndex(
            model_name="profile",
            index=models.Index(fields=["school", "role", "account_status"], name="web_prof_school_role_status"),
        ),
        migrations.AlterField(
            model_name="asset",
            name="file",
            field=models.FileField(
                upload_to=web.models.asset_upload_path,
                validators=[django.core.validators.FileExtensionValidator(allowed_extensions=["jpg", "jpeg", "png", "gif", "webp", "mp3", "wav", "mp4", "webm", "pdf"])],
            ),
        ),
    ]
