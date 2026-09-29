"""Three-way, transactionally checked replication for trusted development laptops.

Application requests use SQLite only. Full snapshots deliberately favor correctness
and coverage (including bulk SQL and deletes) over large-dataset throughput.
"""
import json
import hashlib
import re
import sys
from copy import deepcopy
from contextlib import ExitStack, contextmanager
from datetime import date, datetime, time

from django.apps import apps
from django.core.serializers.json import DjangoJSONEncoder
from django.db import connections, models, transaction
from django.db.migrations.recorder import MigrationRecorder
from django.utils import timezone

from .models import IdAllocation, ReplicaState

APP_LABELS = {"web", "auth", "contenttypes", "admin"}
BLOCK_SIZE = 100_000
_cloud_snapshots = {}


class SyncError(Exception):
    pass


class SnapshotEncoder(DjangoJSONEncoder):
    def default(self, value):
        if isinstance(value, (datetime, date, time)):
            return value.isoformat()
        return super().default(value)


def replicated_models():
    return sorted((model for model in apps.get_models(include_auto_created=True)
                   if model._meta.app_label in APP_LABELS and model._meta.managed),
                  key=lambda model: model._meta.db_table)


def snapshot(alias, model_list=None):
    result = {}
    for model in model_list or replicated_models():
        rows = model._base_manager.using(alias).values()
        # Normalize UUIDs/dates/Decimals consistently across SQLite/PostgreSQL.
        rows = json.loads(json.dumps(list(rows), cls=SnapshotEncoder))
        result[model._meta.db_table] = {str(row[model._meta.pk.attname]): row for row in rows}
    return result


def cloud_snapshot(model_list):
    """Transfer row fingerprints, then only changed rows, under cloud locks.

    Cache is process-local and disposable: restarting performs one full import.
    Fingerprints include every column, so bulk SQL edits and deletes are visible.
    Never expose cached dictionaries to the merge/apply code for mutation.
    """
    connection = connections["cloud"]
    if connection.vendor != "postgresql":
        return snapshot("cloud", model_list)
    result = {}
    identity = cloud_identity()
    with connection.cursor() as cursor:
        for model in model_list:
            table = model._meta.db_table
            quote = connection.ops.quote_name
            cursor.execute(
                f"SELECT t.{quote(model._meta.pk.column)}, md5(row_to_json(t)::text) "
                f"FROM {quote(table)} t"
            )
            fingerprints = {str(key): digest for key, digest in cursor.fetchall()}
            old_hashes, old_rows = _cloud_snapshots.get((identity, table), ({}, {}))
            changed = [key for key, digest in fingerprints.items()
                       if old_hashes.get(key) != digest]
            changed_keys = set(changed)
            rows = {key: old_rows[key] for key in fingerprints if key not in changed_keys}
            for offset in range(0, len(changed), 500):
                keys = changed[offset:offset + 500]
                fetched = model._base_manager.using("cloud").filter(pk__in=keys).values()
                for row in json.loads(json.dumps(list(fetched), cls=SnapshotEncoder)):
                    rows[str(row[model._meta.pk.attname])] = row
            _cloud_snapshots[(identity, table)] = (fingerprints, rows)
            result[table] = deepcopy(rows)
    return result


def merge(baseline, local, remote):
    """Merge independent field edits; never guess on update/delete conflicts."""
    merged, conflicts = {}, []
    for table in sorted(set(baseline) | set(local) | set(remote)):
        merged[table] = {}
        old, ours, theirs = baseline.get(table, {}), local.get(table, {}), remote.get(table, {})
        for key in sorted(set(old) | set(ours) | set(theirs)):
            base, left, right = old.get(key), ours.get(key), theirs.get(key)
            if left == right or right == base:
                value = left
            elif left == base:
                value = right
            elif base is not None and left is not None and right is not None:
                value = dict(base)
                collision = False
                for field in set(base) | set(left) | set(right):
                    b, l, r = base.get(field), left.get(field), right.get(field)
                    if l == r or r == b:
                        value[field] = l
                    elif l == b:
                        value[field] = r
                    elif field in {"updated_at"} or (table == "auth_user" and field == "last_login"):
                        value[field] = max(filter(None, [l, r]), default=None)
                    else:
                        collision = True
                if collision:
                    conflicts.append({"table": table, "key": key, "local": left, "cloud": right})
                    continue
            else:
                conflicts.append({"table": table, "key": key, "local": left, "cloud": right})
                continue
            if value is not None:
                merged[table][key] = value
    return merged, conflicts


def changed_count(base, current):
    return sum(base.get(t, {}).get(k) != current.get(t, {}).get(k)
               for t in set(base) | set(current)
               for k in set(base.get(t, {})) | set(current.get(t, {})))


def check_schema():
    histories = []
    for alias in ("default", "cloud"):
        histories.append({key for key in MigrationRecorder(connections[alias]).applied_migrations()
                          if key[0] in APP_LABELS})
    if histories[0] != histories[1]:
        raise SyncError("Database migrations differ. Stop syncing and apply the same migrations on both databases.")


def _identity_hash(search_path):
    config = connections["cloud"].settings_dict
    identity = {key: config.get(key) for key in ("HOST", "PORT", "NAME", "USER")}
    identity["search_path"] = search_path
    return hashlib.sha256(json.dumps(identity, sort_keys=True).encode()).hexdigest()


def cloud_identity():
    """Identify the cloud using stable settings, not connection tuning values."""
    options = connections["cloud"].settings_dict.get("OPTIONS", {}).get("options", "")
    match = re.search(r"(?:^|\s)-c\s+search_path=([^\s]+)", options)
    return _identity_hash(match.group(1) if match else "public")


def legacy_cloud_identities():
    """Hashes produced before timeout settings were removed from the identity."""
    options = connections["cloud"].settings_dict.get("OPTIONS", {}).get("options", "")
    base = re.sub(r"\s+-c\s+(?:statement_timeout|lock_timeout)=\d+", "", options).strip()
    return {
        _identity_hash(f"{base} -c statement_timeout=5000 -c lock_timeout=2000"),
        _identity_hash(options),
    }


def assert_fresh_replica(local):
    allowed_seeds = {"web_curriculumpackage", "auth_permission", "django_content_type"}
    if any(rows for table, rows in local.items() if table not in allowed_seeds):
        raise SyncError("Initialization requires a fresh local database. Existing data was left untouched.")
    from importlib import import_module
    packages = import_module("web.migrations.0009_classpackage").PACKAGES
    for row in local.get("web_curriculumpackage", {}).values():
        if ({key: value for key, value in row.items() if key != "id"} != {
            "slug": row["slug"], "name": packages.get(row["slug"]),
            "domain_focus": "", "description": "", "is_active": True,
        }):
            raise SyncError("Local curriculum differs from fresh migration seeds. Existing data was left untouched.")


def lock_cloud(model_list):
    connection = connections["cloud"]
    if connection.vendor != "postgresql":
        raise SyncError("The cloud database must be PostgreSQL.")
    with connection.cursor() as cursor:
        tables = ", ".join(connection.ops.quote_name(m._meta.db_table) for m in model_list)
        cursor.execute(f"LOCK TABLE {tables} IN SHARE ROW EXCLUSIVE MODE")
        cursor.execute("SET CONSTRAINTS ALL DEFERRED")


@contextmanager
def sync_transaction(model_list):
    """Read/lock cloud first, but commit cloud before the local checkpoint.

    Explicit exit ordering avoids holding a local write lock during slow cloud
    snapshot reads. ExitStack propagates a failed cloud commit to SQLite rollback.
    """
    remote_transaction = transaction.atomic(using="cloud")
    remote_transaction.__enter__()
    try:
        lock_cloud(model_list)
        remote = cloud_snapshot(model_list)
        local_transaction = transaction.atomic(using="default")
        local_transaction.__enter__()
    except BaseException:
        remote_transaction.__exit__(*sys.exc_info())
        raise
    with ExitStack() as stack:
        stack.push(local_transaction)
        stack.push(remote_transaction)
        yield remote


def write_changes(alias, current, desired, model_list):
    """Use SQL to preserve timestamps and avoid application signals on replication.

    Foreign keys are deferred; uniqueness and FK checks still abort the entire
    batch. No REPLACE (which can accidentally cascade deletes) is used.
    """
    connection = connections[alias]
    quote = connection.ops.quote_name
    with connection.cursor() as cursor:
        # Delete all intended rows first, without ORM cascade side effects.
        for model in model_list:
            table = model._meta.db_table
            for key in current.get(table, {}).keys() - desired.get(table, {}).keys():
                pk = model._meta.pk.get_db_prep_value(model._meta.pk.to_python(key), connection)
                cursor.execute(f"DELETE FROM {quote(table)} WHERE {quote(model._meta.pk.column)} = %s", [pk])
        for model in model_list:
            table = model._meta.db_table
            fields = list(model._meta.concrete_fields)
            names = ", ".join(quote(f.column) for f in fields)
            updates = ", ".join(f"{quote(f.column)} = EXCLUDED.{quote(f.column)}" for f in fields if not f.primary_key)
            action = f"DO UPDATE SET {updates}" if updates else "DO NOTHING"
            for key, row in desired.get(table, {}).items():
                if row == current.get(table, {}).get(key):
                    continue
                values = []
                for field in fields:
                    converter = field.target_field if field.is_relation else field
                    value = row[field.attname]
                    if not isinstance(converter, models.JSONField):
                        value = converter.to_python(value)
                    values.append(field.get_db_prep_save(value, connection))
                placeholders = ", ".join(["%s"] * len(fields))
                cursor.execute(f"INSERT INTO {quote(table)} ({names}) VALUES ({placeholders}) "
                               f"ON CONFLICT ({quote(model._meta.pk.column)}) {action}", values)


def cloud_constraints_immediate():
    with connections["cloud"].cursor() as cursor:
        cursor.execute("SET CONSTRAINTS ALL IMMEDIATE")


def drop_guards(model_list):
    with connections["default"].cursor() as cursor:
        for model in model_list:
            name = connections["default"].ops.quote_name("sync_ids_" + model._meta.db_table)
            cursor.execute(f"DROP TRIGGER IF EXISTS {name}")


def reserve_ids(ranges, model_list):
    """Reserve disjoint positive IDs from real PG sequences, under table locks.

    setval is intentionally nontransactional: failed cycles burn IDs, never reuse
    a range another laptop might already have observed.
    """
    cloud, local = connections["cloud"], connections["default"]
    result = dict(ranges)
    with local.cursor() as lc, cloud.cursor() as cc:
        for model in model_list:
            if not isinstance(model._meta.pk, models.AutoField):
                continue
            table, pk = model._meta.db_table, model._meta.pk.column
            allocation = IdAllocation.objects.filter(pk=table).first()
            sequence = allocation.next_id - 1 if allocation else 0
            bounds = result.get(table)
            if bounds and sequence < bounds[1] - 1000:
                result[table] = [bounds[0], bounds[1], max(sequence, bounds[2])]
                continue
            cc.execute("SELECT pg_get_serial_sequence(%s, %s)", [table, pk])
            sequence_name = cc.fetchone()[0]
            if not sequence_name:
                raise SyncError(f"Missing PostgreSQL ID sequence for {table}.")
            cc.execute("SELECT nextval(%s::regclass)", [sequence_name])
            start = cc.fetchone()[0]
            cc.execute(f"SELECT COALESCE(MAX({cloud.ops.quote_name(pk)}), 0) FROM {cloud.ops.quote_name(table)}")
            start = max(start, cc.fetchone()[0] + 1)
            end = start + BLOCK_SIZE - 1
            # auth.User uses int32; all IDs also remain exactly representable in JS.
            limit = 2_147_483_647 if not isinstance(model._meta.pk, models.BigAutoField) else 9_007_199_254_740_991
            if end > limit:
                raise SyncError(f"ID range exhausted for {table}; migrate IDs before continuing.")
            cc.execute("SELECT setval(%s::regclass, %s, true)", [sequence_name, end])
            result[table] = [start, end, start - 1]
    return result


def install_guards(ranges, model_list):
    connection = connections["default"]
    quote = connection.ops.quote_name
    with connection.cursor() as cursor:
        for model in model_list:
            table = model._meta.db_table
            if table not in ranges:
                continue
            start, end, sequence = ranges[table]
            IdAllocation.objects.update_or_create(pk=table, defaults={"next_id": sequence + 1, "end_id": end})
            name = quote("sync_ids_" + table)
            pk = quote(model._meta.pk.column)
            cursor.execute(f"CREATE TRIGGER {name} AFTER INSERT ON {quote(table)} "
                           f"WHEN NEW.{pk} < {int(start)} OR NEW.{pk} > {int(end)} "
                           "BEGIN SELECT RAISE(ABORT, 'Offline ID range exhausted or invalid. Reconnect and sync.'); END")


def sync_once(initialize=False):
    model_list = replicated_models()
    identity = cloud_identity()
    existing = ReplicaState.objects.only("initialized", "cloud_identity").filter(pk=1).first()
    if (existing and existing.initialized and existing.cloud_identity != identity
            and existing.cloud_identity not in legacy_cloud_identities()):
        raise SyncError("This replica belongs to a different cloud configuration. Restore its settings or initialize a fresh replica.")
    check_schema()
    # File transfers happen without a SQLite write lock, keeping offline reads
    # and writes responsive while slow storage requests time out.
    from .media import prepare_media
    # Only assets are needed before taking the transaction locks. Fetching every
    # application table here used to double the database download each cycle.
    asset_models = [model for model in model_list if model._meta.db_table == "web_asset"]
    before_local = snapshot("default", asset_models)
    before_cloud = snapshot("cloud", asset_models)
    prepare_media(before_local, before_cloud)
    with sync_transaction(model_list) as remote:
        state, _ = ReplicaState.objects.get_or_create(pk=1)
        local = snapshot("default", model_list)
        bootstrapping = not state.initialized
        if bootstrapping:
            if not initialize:
                raise SyncError("Run sync_cortex --initialize while online to set up this laptop.")
            # Never replace existing local work during initialization.
            assert_fresh_replica(local)
            desired, conflicts = remote, []
        else:
            desired, conflicts = merge(state.baseline, local, remote)
        state.pending = changed_count(state.baseline, local) if state.initialized else 0
        state.heartbeat = timezone.now()
        if conflicts:
            state.conflicts = conflicts
            state.status = "conflict"
            state.message = "Conflicting edits need review. Changes remain saved on this laptop."
            state.save()
            return state
        # Retry if an asset appeared after the transfer stage.
        from .media import media_ready
        if not media_ready(desired):
            raise SyncError("Lesson files are still being prepared. The next sync will retry.")
        ranges = reserve_ids(state.id_ranges, model_list)
        drop_guards(model_list)
        write_changes("cloud", remote, desired, model_list)
        if bootstrapping:
            # Clear verified fresh seeds before importing cloud identities.
            write_changes("default", local, {}, model_list)
            local = {}
        write_changes("default", local, desired, model_list)
        connections["default"].check_constraints()
        cloud_constraints_immediate()
        install_guards(ranges, model_list)
        # A crash after cloud commit is retryable using the old local checkpoint.
        state.initialized = True
        state.cloud_identity = identity
        state.baseline = desired
        state.id_ranges = ranges
        state.conflicts = []
        state.status = "online"
        state.message = ""
        state.pending = 0
        state.last_success = timezone.now()
        state.save()
    return state
