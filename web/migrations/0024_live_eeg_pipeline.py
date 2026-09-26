from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):
    dependencies = [('web', '0023_backfill_student_numbers')]
    operations = [
        migrations.AlterField(model_name='eegdevice', name='school', field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='eeg_devices', to='web.school')),
        migrations.AddField(model_name='sessioneegsample', name='confidence_score', field=models.DecimalField(blank=True, decimal_places=6, max_digits=7, null=True)),
        migrations.AddField(model_name='sessioneegsample', name='cluster_number', field=models.SmallIntegerField(blank=True, null=True)),
        migrations.AddField(model_name='sessioneegsample', name='model_version', field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='session_samples', to='web.modelversion')),
        migrations.AddField(model_name='eegfeature', name='channel_features', field=models.JSONField(blank=True, default=dict)),
        migrations.AddField(model_name='eegfeature', name='units', field=models.JSONField(blank=True, default=dict)),
        migrations.AddField(model_name='eegfeature', name='processing_settings', field=models.JSONField(blank=True, default=dict)),
        migrations.CreateModel(name='EEGRawChunk', fields=[
            ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ('sequence_number', models.PositiveIntegerField()), ('captured_at', models.DateTimeField(default=django.utils.timezone.now)),
            ('start_offset_ms', models.PositiveIntegerField()), ('end_offset_ms', models.PositiveIntegerField()),
            ('sampling_rate_hz', models.PositiveIntegerField(default=256)), ('channel_names', models.JSONField(default=list)),
            ('samples', models.JSONField(default=dict)), ('sample_count', models.PositiveIntegerField()),
            ('recording', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='raw_chunks', to='web.eegrecording')),
        ], options={'ordering': ('recording', 'sequence_number')}),
        migrations.AddConstraint(model_name='eegrawchunk', constraint=models.UniqueConstraint(fields=('recording', 'sequence_number'), name='unique_recording_raw_chunk')),
        migrations.AddIndex(model_name='eegrawchunk', index=models.Index(fields=['recording', 'captured_at'], name='web_eegrawc_recordi_3d9f80_idx')),
    ]
