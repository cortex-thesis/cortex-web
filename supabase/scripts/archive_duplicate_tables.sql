-- Reversible cleanup of the public schema. This script never drops rows.
-- Prerequisites: successful backup and review of duplicate_tables_preflight.sql.

begin;
select pg_advisory_xact_lock(hashtext('cortex.archive_duplicate_tables'));

do $archive$
declare
  table_name text;
  duplicate_tables constant text[] := array[
    'schools', 'users', 'student_profiles', 'classrooms',
    'class_enrollments', 'learning_packages', 'learning_modules',
    'content_assets', 'class_sessions', 'student_sessions',
    'eeg_devices', 'eeg_connections', 'eeg_recordings',
    'eeg_epochs', 'eeg_features', 'model_versions',
    'state_predictions', 'adaptation_rules', 'adaptation_events',
    'manual_overrides', 'session_analytics', 'alerts', 'audit_logs'
  ];
  required_table text;
begin
  foreach required_table in array array[
    'auth_user', 'django_migrations', 'web_profile', 'web_school',
    'web_schoolclass', 'web_learningsession', 'web_eegrecording'
  ] loop
    if to_regclass(format('django.%I', required_table)) is null
       and to_regclass(format('public.%I', required_table)) is null then
      raise exception
        'Required Django table % is missing from both django and public schemas; cleanup aborted.',
        required_table;
    end if;
  end loop;

  execute 'create schema if not exists legacy_duplicates';

  foreach table_name in array duplicate_tables loop
    if to_regclass(format('legacy_duplicates.%I', table_name)) is not null
       and to_regclass(format('public.%I', table_name)) is not null then
      raise exception
        'Both public.% and legacy_duplicates.% exist; cleanup aborted for manual review.',
        table_name, table_name;
    end if;

    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I set schema legacy_duplicates', table_name);
    end if;
  end loop;
end
$archive$;

-- Keep archived data inaccessible to Supabase client roles.
revoke all on schema legacy_duplicates from public, anon, authenticated;
revoke all on all tables in schema legacy_duplicates from public, anon, authenticated;

commit;

-- Verification: this should return no rows.
select tablename
from pg_tables
where schemaname = 'public'
  and tablename = any (array[
    'schools', 'users', 'student_profiles', 'classrooms',
    'class_enrollments', 'learning_packages', 'learning_modules',
    'content_assets', 'class_sessions', 'student_sessions',
    'eeg_devices', 'eeg_connections', 'eeg_recordings',
    'eeg_epochs', 'eeg_features', 'model_versions',
    'state_predictions', 'adaptation_rules', 'adaptation_events',
    'manual_overrides', 'session_analytics', 'alerts', 'audit_logs'
  ])
order by tablename;
