from django.db import migrations, models
from django.utils import timezone


class Migration(migrations.Migration):
    dependencies = [('web', '0025_merge_0024_branches')]

    operations = [
        migrations.AddField(
            model_name='classsession', name='teacher_last_seen_at',
            field=models.DateTimeField(null=True, blank=True),
        ),
        migrations.AlterField(
            model_name='classsession', name='teacher_last_seen_at',
            field=models.DateTimeField(default=timezone.now, null=True, blank=True),
        ),
    ]
