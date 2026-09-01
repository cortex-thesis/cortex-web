from django.db import migrations


LEGACY_SCHEMA = "legacy_duplicates"
LEGACY_TABLES = (
    "schools",
    "users",
    "student_profiles",
    "classrooms",
    "class_enrollments",
    "learning_packages",
    "learning_modules",
    "content_assets",
    "class_sessions",
    "student_sessions",
    "eeg_devices",
    "eeg_connections",
    "eeg_recordings",
    "eeg_epochs",
    "eeg_features",
    "model_versions",
    "state_predictions",
    "adaptation_rules",
    "adaptation_events",
    "manual_overrides",
    "session_analytics",
    "alerts",
    "audit_logs",
)


def _table_exists(cursor, schema, table):
    cursor.execute(
        """
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = %s AND table_name = %s AND table_type = 'BASE TABLE'
        """,
        [schema, table],
    )
    return cursor.fetchone() is not None


def archive_duplicates(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    quote = schema_editor.connection.ops.quote_name
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(f"CREATE SCHEMA IF NOT EXISTS {quote(LEGACY_SCHEMA)}")
        for table in LEGACY_TABLES:
            if not _table_exists(cursor, "public", table):
                continue
            if _table_exists(cursor, LEGACY_SCHEMA, table):
                raise RuntimeError(
                    f"Cannot archive public.{table}: {LEGACY_SCHEMA}.{table} already exists. "
                    "Review both tables before retrying the migration."
                )
            cursor.execute(
                f"ALTER TABLE {quote('public')}.{quote(table)} SET SCHEMA {quote(LEGACY_SCHEMA)}"
            )


def restore_duplicates(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    quote = schema_editor.connection.ops.quote_name
    with schema_editor.connection.cursor() as cursor:
        for table in reversed(LEGACY_TABLES):
            if not _table_exists(cursor, LEGACY_SCHEMA, table):
                continue
            if _table_exists(cursor, "public", table):
                raise RuntimeError(
                    f"Cannot restore {LEGACY_SCHEMA}.{table}: public.{table} already exists."
                )
            cursor.execute(
                f"ALTER TABLE {quote(LEGACY_SCHEMA)}.{quote(table)} SET SCHEMA {quote('public')}"
            )


class Migration(migrations.Migration):
    dependencies = [("web", "0011_hybrid_eeg_storage")]

    operations = [
        migrations.DeleteModel(name="PublicUser"),
        migrations.RunPython(archive_duplicates, restore_duplicates),
    ]
