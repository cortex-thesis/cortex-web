from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [migrations.CreateModel(name="IdAllocation", fields=[
        ("table_name", models.CharField(max_length=100, primary_key=True, serialize=False)),
        ("next_id", models.BigIntegerField()),
        ("end_id", models.BigIntegerField()),
    ]), migrations.CreateModel(name="ReplicaState", fields=[
        ("id", models.PositiveSmallIntegerField(default=1, primary_key=True, serialize=False)),
        ("initialized", models.BooleanField(default=False)),
        ("cloud_identity", models.CharField(blank=True, max_length=64)),
        ("baseline", models.JSONField(default=dict)),
        ("id_ranges", models.JSONField(default=dict)),
        ("conflicts", models.JSONField(default=list)),
        ("status", models.CharField(default="setup_required", max_length=30)),
        ("last_success", models.DateTimeField(null=True)),
        ("heartbeat", models.DateTimeField(null=True)),
        ("pending", models.PositiveIntegerField(default=0)),
        ("message", models.CharField(blank=True, max_length=250)),
    ])]
