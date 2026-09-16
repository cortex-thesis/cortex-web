from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("web", "0021_lesson_step_completion")]
    operations = [migrations.AddField(model_name="lessonpracticeprogress", name="activity_evidence", field=models.JSONField(default=dict))]
