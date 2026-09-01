-- Emergency rollback for archive_duplicate_tables.sql.
-- It aborts rather than overwrite any table currently in public.

begin;
select pg_advisory_xact_lock(hashtext('cortex.archive_duplicate_tables'));

do $restore$
declare
  table_name text;
begin
  foreach table_name in array array[
    'audit_logs', 'alerts', 'session_analytics', 'manual_overrides',
    'adaptation_events', 'adaptation_rules', 'state_predictions',
    'model_versions', 'eeg_features', 'eeg_epochs', 'eeg_recordings',
    'eeg_connections', 'eeg_devices', 'student_sessions', 'class_sessions',
    'content_assets', 'learning_modules', 'learning_packages',
    'class_enrollments', 'classrooms', 'student_profiles', 'users', 'schools'
  ] loop
    if to_regclass(format('legacy_duplicates.%I', table_name)) is not null then
      if to_regclass(format('public.%I', table_name)) is not null then
        raise exception 'public.% already exists; restore aborted.', table_name;
      end if;
      execute format('alter table legacy_duplicates.%I set schema public', table_name);
    end if;
  end loop;
end
$restore$;

commit;
