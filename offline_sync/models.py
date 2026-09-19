from django.db import models


class IdAllocation(models.Model):
    table_name = models.CharField(max_length=100, primary_key=True)
    next_id = models.BigIntegerField()
    end_id = models.BigIntegerField()


class ReplicaState(models.Model):
    """Local-only checkpoint. The diff against baseline is the durable outbox."""

    id = models.PositiveSmallIntegerField(primary_key=True, default=1)
    initialized = models.BooleanField(default=False)
    cloud_identity = models.CharField(max_length=64, blank=True)
    baseline = models.JSONField(default=dict)
    id_ranges = models.JSONField(default=dict)
    conflicts = models.JSONField(default=list)
    status = models.CharField(max_length=30, default="setup_required")
    last_success = models.DateTimeField(null=True)
    heartbeat = models.DateTimeField(null=True)
    pending = models.PositiveIntegerField(default=0)
    message = models.CharField(max_length=250, blank=True)
