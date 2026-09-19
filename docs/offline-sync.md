# Offline development with Supabase

Each trusted developer runs React and Django on their laptop. With
`CORTEX_OFFLINE_SYNC=true`, all application reads and writes use a separate local
SQLite database (`.runtime/offline.sqlite3`). A background worker exchanges changes
with the existing Supabase PostgreSQL tables every 15 seconds. The original
`db.sqlite3` is not used or overwritten. Django authentication works locally after
the first import, even without internet.

## First-time setup (once per laptop)

If this laptop has already initialized successfully, skip to **Start Cortex each
day** below. Do not repeat migration and initialization for everyday startup.

These instructions use a Windows PowerShell or Command Prompt terminal opened in
the project folder (the folder containing `manage.py`). They assume the project's
`.venv` and frontend dependencies are already installed. Always use
`.\.venv\Scripts\python.exe` for Django commands so they use the project's packages.

Use the same Git revision, Supabase database/schema, and private storage bucket on
each laptop. Keep credentials in the root `.env`, never `VITE_*` variables. Use
either `DATABASE_URL` or `DB_*`, not both. Keep `CORTEX_TEMPLATE_ONLY=false`.

1. Stop the local Django server while setting up the replica.
2. Set these values in the root `.env` and save it:

   ```dotenv
   CORTEX_OFFLINE_SYNC=true
   CORTEX_TEMPLATE_ONLY=false
   ```

3. Connect to the internet, then run the migration:

   ```powershell
   .\.venv\Scripts\python.exe manage.py migrate --database=default
   ```

   Wait until the command finishes without a traceback. `No migrations to apply`
   alone does not mean success if an error appears afterward. If a command fails,
   stop setup and keep the existing database.

4. Import the cloud data:

   ```powershell
   .\.venv\Scripts\python.exe manage.py sync_cortex --initialize
   ```

   Wait for `Sync status: online`, then follow the daily startup steps below.

## Start Cortex each day

1. Open a terminal in the project folder. Start Django:

   ```powershell
   .\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000 --noreload --nothreading
   ```

   Leave this terminal open. Wait for
   `Starting development server at http://127.0.0.1:8000/`.
   The sync worker starts automatically.

2. Open a second terminal in the project folder. Start the frontend:

   ```powershell
   cd frontend
   npm run dev
   ```

   Leave this terminal open too. If the frontend is already running, reuse it.

3. Open the local URL printed by Vite (usually `http://localhost:5173/`).
   Both terminals must stay running while you use Cortex.

After the first successful setup, you can start and use Cortex without internet.
When internet returns, the worker automatically syncs changes. You do not need to
run `migrate`, `--initialize`, or a separate `--watch` worker each day.

To stop Cortex, press **Ctrl+C** in each server terminal. To restart it, repeat
these daily startup steps.

## Setup details

Initialization imports the cloud's application tables, accounts, permissions, and
lesson files. It refuses to replace an existing local working database; only
fresh migration seeds are allowed. It requires matching application migration
histories. It does not apply migrations or delete application records in Supabase.
It reserves numeric ID ranges by advancing PostgreSQL sequences. Do not initialize
a laptop by copying another laptop's replica: that would duplicate its ID allocation.

If Supabase needs application migrations, deploy them once through your normal
schema deployment process. The `offline_sync` tables exist only locally. Always
stop sync workers during schema upgrades, use the same application version on all
laptops, and back up replicas with pending work before changing schemas. New
content types/permissions created independently during migrations may need manual
reconciliation; schema upgrades are not automatically replicated.

## Daily use

- **Up to date:** the most recent sync completed successfully.
- **Syncing:** the worker is exchanging changes or preparing files.
- **Offline mode:** Supabase could not be reached. Local reads and writes continue.
- **Sync paused / needs review:** a conflict, schema mismatch, constraint, or file
  issue prevented completion; changes remain local.
- **Local server unavailable:** Django cannot be reached; new saves cannot succeed.

The status endpoint is `/api/sync/status/`. Counts are refreshed each cycle, not on
every keystroke. Successful syncs invalidate the browser's API cache; data appears
on the next fetch/navigation or existing polling update. An already displayed,
non-polling page may need refreshing.

To sync immediately:

With Django and any separate sync worker stopped, run this from the project folder
while online, then start Cortex again:

```powershell
.\.venv\Scripts\python.exe manage.py sync_cortex
```

For a server other than Django `runserver`, start one separate sync worker with
`.\.venv\Scripts\python.exe manage.py sync_cortex --watch` and keep it running.

There is no network fallback in a page request, so weak cloud connectivity does
not make ordinary reads wait for Supabase. During the short database apply phase,
concurrent local writes can briefly wait. Django and Vite (or the built frontend)
must remain running locally. This is not an offline browser/PWA: a device cannot
use another laptop's server if its connection to that laptop is lost.

## Conflicts and durability

The local checkpoint stores the last common version of every replicated row.
Differences from this checkpoint form a durable pending queue, including ORM bulk
updates, bulk creates, many-to-many changes, and SQL deletes. Restarting Django or
losing connectivity does not discard pending work.

Independent field edits merge automatically. Different edits to the same field,
different creates with the same ID, and update-versus-delete cases pause the entire
batch. Timestamps and concurrent login times take the latest value. Foreign-key
and uniqueness constraints are checked before completion. A uniqueness conflict
between two separately created records with the same username/code requires
reconciling those records; a generic sync error never silently overwrites them.

List record conflicts without printing their sensitive contents:

```powershell
.\.venv\Scripts\python.exe manage.py sync_cortex --conflicts
```

Inspect the affected records locally and in Supabase, then explicitly choose:

```powershell
.\.venv\Scripts\python.exe manage.py sync_cortex --resolve web_school RECORD_UUID --take local
# Or --take cloud
.\.venv\Scripts\python.exe manage.py sync_cortex
```

A resolution uses the cloud version observed at conflict detection, so further
cloud edits are checked again. Local edits made after conflict detection require
a fresh sync before resolution. Choosing a side may discard the other side's
changes, so review the records first.

Each numeric table reserves 100,000 positive IDs from its PostgreSQL sequence.
Django's normal and bulk-create paths allocate from that laptop's durable counter.
SQLite triggers reject inserts outside its reservation. Blocks replenish online;
if exhausted offline, new records stop with an error until another sync succeeds.
Existing records can still be read/updated. Direct SQL writers must use reserved
IDs; do not reset PostgreSQL sequences or local counters. UUID keys are unchanged.

Cloud changes commit before the SQLite checkpoint. A disconnect or crash between
commits leaves the old checkpoint intact; retry recognizes already-applied changes.
There is no two-phase distributed transaction: a cloud update can be visible before
the originating laptop finishes its local commit.

## Lesson files, EEG, and backups

Configure the existing `SUPABASE_STORAGE_*` variables to sync lesson assets. In this
mode uploads and previews use local `MEDIA_ROOT`; the worker copies immutable asset
paths to/from the private cloud bucket. Files are checked with SHA-256, downloads
use temporary files and atomic rename, and existing objects with different bytes
pause sync. Recently verified files are cached for five minutes. Missing or invalid
files block the batch until restored. For assets without a recorded checksum, the
two available copies are compared when possible.

Raw EEG recordings, processed files, and model binaries under `EEG_DATA_ROOT` remain
local. Database references to them replicate, but the corresponding files do not;
another laptop cannot analyze them unless those files are separately transferred.
External lesson URLs still require internet. Database deletions replicate; physical
file retention/deletion remains an explicit storage-maintenance operation. Do not
run retention cleanup independently on replicas while syncing.

Back up `.runtime/offline.sqlite3` (with SQLite's backup API or while Django is
stopped), `MEDIA_ROOT`, and `EEG_DATA_ROOT`. The checkpoint contains replicated
account password hashes and application data, so protect it like the cloud database.
Use only trusted developer laptops and appropriate development data. Each replica
holds the entire shared dataset; this is not per-user data isolation. Account
revocations cannot reach a disconnected laptop until it reconnects and syncs.

This implementation uses full-table snapshots and a short cloud table lock for
safe development synchronization. It is intended for a small development team,
not high-volume production replication. Large EEG metadata tables or asset
libraries increase synchronization time. Avoid running multiple workers per laptop.

To return to direct Supabase mode, sync all pending work first, stop Django, set
`CORTEX_OFFLINE_SYNC=false`, then restart. Unsynced local work remains in the replica
but will not appear in direct cloud mode.

## Verification

The dedicated suite uses two isolated SQLite databases, never the configured cloud:

```powershell
.\.venv\Scripts\python.exe manage.py test offline_sync --settings=offline_sync.test_settings --noinput
```

Before relying on the workflow, initialize two laptops, create different records
offline, reconnect, and verify both appear on both laptops. Also edit the same field
on both laptops and verify the conflict is shown. Test a lesson upload and playback
with internet disconnected after files have synced.
