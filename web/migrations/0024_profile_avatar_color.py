from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("web", "0023_backfill_student_numbers")]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="avatar_color",
            field=models.CharField(
                choices=[("pink", "Pink"), ("blue", "Blue"), ("yellow", "Yellow"), ("green", "Green"), ("purple", "Purple")],
                default="pink",
                max_length=10,
            ),
        ),
    ]
