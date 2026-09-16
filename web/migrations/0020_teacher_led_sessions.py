from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('web', '0019_baseline_recording')]
    operations = [
        migrations.AddField(model_name='classsession', name='presentation_mode', field=models.CharField(default='focus', max_length=20)),
        migrations.AddField(model_name='classsession', name='lesson_revision', field=models.PositiveIntegerField(default=0)),
        migrations.AddField(model_name='classsession', name='lesson_history', field=models.JSONField(blank=True, default=list)),
        migrations.AddField(model_name='classsession', name='control_history', field=models.JSONField(blank=True, default=list)),
        migrations.AddField(model_name='classsession', name='overview_report', field=models.JSONField(blank=True, default=dict)),
        migrations.AddField(model_name='learningsession', name='last_seen_at', field=models.DateTimeField(blank=True, null=True)),
    ]
