from django.db import models, transaction

from .models import IdAllocation


def allocate(table):
    # A separate counter is necessary: SQLite AUTOINCREMENT always considers the
    # highest imported ID, even if sqlite_sequence is reset to a lower range.
    with transaction.atomic(using="default"):
        try:
            allocation = IdAllocation.objects.get(pk=table)
        except IdAllocation.DoesNotExist:
            raise RuntimeError("Initialize offline sync before creating records.") from None
        if allocation.next_id > allocation.end_id:
            raise RuntimeError("Offline ID range exhausted. Reconnect and sync before creating records.")
        value = allocation.next_id
        allocation.next_id += 1
        allocation.save(update_fields=["next_id"])
        return value


def install_allocators():
    from .engine import replicated_models
    for model in replicated_models():
        field = model._meta.pk
        if isinstance(field, models.AutoField):
            # Django uses this hook for save() and bulk_create(). Do not change
            # field.default: doing so would introduce spurious schema migrations.
            field.get_pk_value_on_save = lambda instance, table=model._meta.db_table: allocate(table)
