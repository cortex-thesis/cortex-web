-- Read-only inventory. Run this first in the Supabase SQL editor.
-- Expected authoritative tables are Django-owned web_*, auth_*, and django_*.

with duplicate_names(table_name) as (
  values
    ('schools'), ('users'), ('student_profiles'), ('classrooms'),
    ('class_enrollments'), ('learning_packages'), ('learning_modules'),
    ('content_assets'), ('class_sessions'), ('student_sessions'),
    ('eeg_devices'), ('eeg_connections'), ('eeg_recordings'),
    ('eeg_epochs'), ('eeg_features'), ('model_versions'),
    ('state_predictions'), ('adaptation_rules'), ('adaptation_events'),
    ('manual_overrides'), ('session_analytics'), ('alerts'), ('audit_logs')
)
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.reltuples::bigint as estimated_rows,
  pg_size_pretty(pg_total_relation_size(c.oid)) as total_size
from duplicate_names d
join pg_class c on c.relname = d.table_name and c.relkind in ('r', 'p')
join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public', 'legacy_duplicates')
order by c.relname, n.nspname;

-- Any rows here must be reviewed before archival. They identify views or
-- materialized views outside the duplicate set that depend on these tables.
with duplicate_relations as (
  select c.oid
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = any (array[
      'schools', 'users', 'student_profiles', 'classrooms',
      'class_enrollments', 'learning_packages', 'learning_modules',
      'content_assets', 'class_sessions', 'student_sessions',
      'eeg_devices', 'eeg_connections', 'eeg_recordings',
      'eeg_epochs', 'eeg_features', 'model_versions',
      'state_predictions', 'adaptation_rules', 'adaptation_events',
      'manual_overrides', 'session_analytics', 'alerts', 'audit_logs'
    ])
)
select distinct
  dependent_ns.nspname as dependent_schema,
  dependent.relname as dependent_object,
  dependent.relkind as object_kind
from duplicate_relations source
join pg_depend dep on dep.refobjid = source.oid
join pg_rewrite rewrite on rewrite.oid = dep.objid
join pg_class dependent on dependent.oid = rewrite.ev_class
join pg_namespace dependent_ns on dependent_ns.oid = dependent.relnamespace
where dependent.oid <> source.oid
order by dependent_schema, dependent_object;

-- These core relations must exist before the old schema is archived.
select required.table_name,
       to_regclass('public.' || required.table_name) is not null as exists
from (values
  ('auth_user'), ('django_migrations'), ('web_profile'), ('web_school'),
  ('web_schoolclass'), ('web_learningsession'), ('web_eegrecording')
) required(table_name)
order by required.table_name;
