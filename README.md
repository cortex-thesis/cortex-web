# Cortex Web 

## Hybrid Supabase and local EEG storage

For development on separate laptops with intermittent internet, see
[Offline development and synchronization](docs/offline-sync.md). This optional
mode uses local SQLite for application requests and syncs with Supabase in the
background. The direct-cloud behavior described below remains the default.

For teacher/student testing across two devices, see
[Teacher-led sessions on two devices](docs/teacher-led-two-device-test.md).

Supabase PostgreSQL is the authoritative application database. Django migrations own Django Auth and all `web` application tables. Raw signals, processed Parquet, model binaries, and processing scratch files live beneath `EEG_DATA_ROOT`; database rows contain UUID-based, forward-slash object keys such as `eeg/raw/<recording-uuid>.edf`, never machine-specific absolute paths. DuckDB is used only inside the EEG data service to query local Parquet and is not an application database. `EEGEpoch` contains only compact processing-window metadata; individual EEG samples are never PostgreSQL rows.

Required software: Python 3.12+, Node/npm, and Docker Desktop (with virtualization enabled) for the local Supabase stack. Install dependencies with:

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
npm install
```

Initialize and operate local Supabase (this repository already contains `supabase/config.toml`; do not overwrite it with another `init`):

```powershell
npm install supabase --save-dev
# For a repository without supabase/config.toml only: npx supabase init
npx supabase start
npx supabase status
npx supabase stop
```

The configuration binds application URLs to loopback and disables Supabase Auth because Django Auth remains the only credential system. Docker is required for `start`, but not for editing or Django's SQLite test suite.

Copy `.env.example` to `.env`. For local Supabase use `DB_HOST=127.0.0.1`, `DB_PORT=54322`, and `DB_SSLMODE=disable`. For hosted Supabase, use either its `DATABASE_URL` or discrete `DB_*` values with `DB_SSLMODE=require`; do not set both. Use a strong `DJANGO_SECRET_KEY` outside development.

The default local layout is:

```text
local-data/
  eeg/raw/          immutable acquisition files
  eeg/processed/    UUID-named Parquet files
  models/           trained model binaries
  temp/             incomplete atomic writes
```

Set up Django and validate it with:

```powershell
.\.venv\Scripts\python manage.py migrate
.\.venv\Scripts\python manage.py createsuperuser
.\.venv\Scripts\python manage.py check
.\.venv\Scripts\python manage.py makemigrations --check --dry-run
.\.venv\Scripts\python manage.py test
```

For a safe local reset, stop Supabase, confirm that the project is local and unlinked, back up PostgreSQL and `EEG_DATA_ROOT` separately, and only then use the Supabase reset command. Never reset a linked/hosted project. **Resetting Supabase neither backs up nor deletes local EEG files**; those files require their own explicit retention or removal process.

Production backup and recovery must cover two coordinated assets: PostgreSQL metadata and the local EEG directory. Preserve recording UUID/object-key relationships and test restoring both. A database-only backup cannot restore signals; a file-only backup cannot restore sessions, predictions, or provenance.

### Legacy duplicate tables

Migration `0012_archive_duplicate_public_tables` moves the former unprefixed SQL-export tables from `public` to the `legacy_duplicates` schema. It does not delete their rows. The application does not model or query that schema; active application tables are Django-owned (`web_*`, `auth_*`, and `django_*`). Back up PostgreSQL and inspect the archived row counts before considering a later permanent drop. Reversing migration `0012` restores the tables to `public` only when no same-named public table exists.

For manual Supabase SQL-editor cleanup, run `supabase/scripts/duplicate_tables_preflight.sql` first and inspect every result. The guard accepts Django-owned tables in either `django` (the project's historical hosted search path) or `public`; only the unprefixed duplicate tables in `public` are archived. After backing up PostgreSQL, run `supabase/scripts/archive_duplicate_tables.sql`. The matching `restore_duplicate_tables.sql` is an emergency rollback. Do not run both the Django archival migration and the manual archive script concurrently; each is idempotent when the other has already completed, but schema changes should still be performed through one controlled deployment path.

React + TypeScript frontend for Cortex: an EEG-integrated neuro-adaptive
multimedia application for ADHD learners in SPED transition curriculum settings.

---

## Run with Django

```bash
python -m pip install -r requirements.txt
Copy-Item .env.example .env
# Edit .env and add your Supabase DATABASE_URL
cd frontend
npm install
npm run build
cd ..
python manage.py migrate
python manage.py runserver
```

Get `DATABASE_URL` from **Supabase Dashboard → Project Settings → Database →
Connection string**. Use the transaction-pooler URI when available and replace
its password placeholder with your database password. The local `.env` file is
ignored by Git so credentials are not committed.

For frontend/template-only development, add `CORTEX_TEMPLATE_ONLY=true` to
`.env`. Django will use a local `db.sqlite3` database instead of connecting to
Supabase, so migrations persist between management commands and server reloads.

Supabase mode is the default whenever `DATABASE_URL` is configured. Set
`CORTEX_TEMPLATE_ONLY=true` only when you deliberately want the local SQLite
fallback. Production refuses to start without `DATABASE_URL`.

Apply the complete Cortex schema to Supabase with:

```powershell
Copy-Item .env.example .env
# Replace DATABASE_URL with the Supabase transaction-pooler connection string.
python manage.py migrate
python manage.py check --database default
```

The Django migrations are the schema source of truth. Supabase stores accounts,
schools, curriculum content, sessions, consent history, EEG metadata and
features, model versions, predictions, adaptations, analytics, journals,
assessments, alerts, audit history, and privacy lifecycle requests. General uploaded
content may use private Supabase Storage; EEG signals and model binaries use the
separately backed-up local `EEG_DATA_ROOT`, with only relative object keys and checksums in PostgreSQL.

Supabase Storage is configured through its server-side S3-compatible endpoint.
Enable that endpoint, create its access keys, create a private
`private-content` bucket, and fill the `SUPABASE_STORAGE_*` variables in `.env`.
Never expose those keys through `VITE_*` variables or browser code.

Open `http://localhost:5173`. Vite serves the existing React interface and
proxies all `/api/` requests to Django on port 8000. The backend health check
is available internally at `/api/health/`.

The minimum school workflow is available through session-authenticated API
routes for registration/login, profiles, class creation and assignment,
enrollment/removal, consent, and session start/end. See
[`SECURITY_PRIVACY.md`](SECURITY_PRIVACY.md) for the consent, pseudonymization,
retention/deletion, secrets, uploads, audit, backup, and non-diagnostic
messaging baseline.

Account governance follows a super-admin → school-admin → teacher chain.
Super administrators manage schools and create school administrators through
`/api/admin/schools/` and `/api/admin/accounts/`. School administrators create
or approve same-school teachers through `/api/admin/accounts/` and
`/api/admin/accounts/{profileId}/status/`. New public teacher registrations are
pending. Privacy lifecycle requests use `/api/privacy/requests/`. Development
demo credentials are controlled by `CORTEX_ENABLE_DEMO_ACCOUNTS`.

The Cortex administrator interface uses `/admin/dashboard`. Django's internal
administration site is intentionally kept separate at `/django-admin/`.

The repository is organized as follows:

```text
cortex/          Django project settings and root URLs
web/             Django application, API views, and tests
templates/       Django HTML templates
frontend/        React source and all Node/Vite/TypeScript configuration
requirements.txt Python dependencies
manage.py        Django command entry point
```

## Project Structure

This repository contains the React interface and its Django server/backend
shell. The Python EEG bridge remains a separate service.

```
cortex-web/        ← you are here (React frontend)
cortex-backend/    ← Django REST + Channels
cortex-bridge/     ← Python EEG bridge script
```

---

## Tech Stack

| Layer            | Technology            |
| ---------------- | --------------------- |
| Framework        | React 18 + TypeScript |
| Build tool       | Vite                  |
| Routing          | React Router DOM      |
| State management | Zustand               |
| HTTP client      | Axios                 |
| Icons            | Lucide React          |
| Font             | Lexend (Google Fonts) |

---

## Getting Started

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+

