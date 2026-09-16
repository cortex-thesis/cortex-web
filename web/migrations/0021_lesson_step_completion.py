from django.db import migrations, models


def preserve_historical_progress(apps, schema_editor):
    Exposure = apps.get_model('web', 'SessionSlideExposure')
    Exposure.objects.filter(session__ended_at__isnull=False, exited_at__isnull=False).update(completed_at=models.F('exited_at'))


class Migration(migrations.Migration):
    dependencies = [('web', '0020_teacher_led_sessions')]
    operations = [
        migrations.AddField(model_name='sessionslideexposure', name='completed_at', field=models.DateTimeField(null=True, blank=True)),
        migrations.RunPython(preserve_historical_progress, migrations.RunPython.noop),
    ]
