# Cortex Web — Frontend

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

### Installation

```bash
git clone https://github.com/[your-org]/cortex-web.git
cd cortex-web
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. Vite serves the React
application and proxies `/api/*` requests to Django on port 8000.

Keep Django running in a separate terminal with `python manage.py runserver`.
Port 8000 is the internal backend service and should not be opened as the site.

---

## Environment Variables

Create a `.env.development` file in the root:

```env
VITE_API_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000/ws
```

The application uses relative `/api` requests, so the browser only sees the
Vite site URL. Vite proxies those requests to Django during development.

**Never commit `.env` files.** They are in `.gitignore`.

---

## Architecture Overview

```
Browser (React)
    ↕  REST API (Axios)        → Django REST Framework
    ↕  WebSocket               → Django Channels
    ↕  [future] WebSocket      → Python EEG Bridge → Muse 2 headset
```

The frontend communicates with the backend via:

- **REST API** — auth, content, class management, analytics
- **WebSocket** — real-time EEG state updates, live teacher dashboard,
  adaptive mode switching, teacher override

---

## API Contract

The frontend expects the following from the backend.
**Do not change these shapes without coordinating with the frontend dev.**

### WebSocket Events

#### `eeg_update` — Backend → Frontend

Sent every ~1 second during an active session.

```json
{
  "type": "eeg_update",
  "student_id": "string",
  "state": "focused | relaxed | distracted | overstimulated",
  "band_powers": {
    "theta": 0.0,
    "alpha": 0.0,
    "beta": 0.0,
    "gamma": 0.0,
    "tbr": 0.0
  },
  "signal_strength": 0,
  "timestamp": "ISO8601 string"
}
```

#### `mode_change` — Backend → Frontend (Student)

Triggered when the adaptive engine switches the student's mode.

```json
{
  "type": "mode_change",
  "from_mode": "focus | relax",
  "to_mode": "focus | relax",
  "reason": "eeg_triggered | teacher_override",
  "timestamp": "ISO8601 string"
}
```

#### `teacher_override` — Frontend (Teacher) → Backend

Sent when a teacher manually overrides a student's mode.

```json
{
  "type": "teacher_override",
  "student_id": "string",
  "target_mode": "focus | relax",
  "teacher_id": "string"
}
```

### WebSocket URLs

```
ws://[host]/ws/session/{sessionId}/    Student + teacher connect here
ws://[host]/ws/eeg/                    EEG bridge connects here
ws://[host]/ws/dashboard/{classId}/   Teacher live dashboard
```

### REST Endpoints

```
POST   /api/auth/login/
POST   /api/auth/logout/
GET    /api/auth/me/

GET    /api/classes/
POST   /api/classes/
GET    /api/classes/{id}/
GET    /api/classes/{id}/students/
GET    /api/classes/{id}/content/
POST   /api/classes/{id}/content/
PUT    /api/classes/{id}/content/{contentId}/
DELETE /api/classes/{id}/content/{contentId}/

POST   /api/sessions/start/
POST   /api/sessions/{id}/end/
GET    /api/sessions/{id}/summary/

GET    /api/analytics/class/{id}/
GET    /api/analytics/student/{id}/

GET    /api/students/{id}/profile/
```

---

## Critical Contract — Cognitive State Strings

The four cognitive state values are locked. The backend, bridge, and
frontend must all use these exact strings. Lowercase, no variations.

```
"focused"
"relaxed"
"distracted"
"overstimulated"
```

**If the backend sends `"Focused"` or `"FOCUSED"`, the frontend will
break silently.** These strings are used as object keys throughout the
codebase.

---

## Data Models

### User

```typescript
{
  id:       string
  name:     string
  role:     "student" | "teacher" | "admin"
  avatar:   string | null
  classIds: string[]
}
```

### EEG Update

```typescript
{
  type:           "eeg_update"
  studentId:      string
  state:          CognitiveState
  bandPowers:     { theta, alpha, beta, gamma, tbr: number }
  signalStrength: 0 | 1 | 2 | 3 | 4
  timestamp:      string
}
```

### Content Item

```typescript
{
  id: string
  title: string
  type: 'image' | 'audio' | 'video' | 'interactive'
  package: CurriculumPackage
  mode: 'focus' | 'relax' | 'both'
  cognitiveStateTarget: CognitiveState
  fileUrl: string
  thumbnailUrl: string | null
  durationSeconds: number
  createdBy: string
  createdAt: string
}
```

### Session

```typescript
{
  id: string
  studentId: string
  classId: string
  startedAt: string
  endedAt: string | null
  focusScore: number | null
  mode: 'focus' | 'relax'
}
```

### Journal Entry

```typescript
{
  id:          string
  sessionId:   string
  studentId:   string
  createdAt:   string
  prompt:      string
  response: {
    type:      'text' | 'drawing' | 'audio'
    content:   string        // text content OR base64 data URL for drawing/audio
  }
  mood:        'happy' | 'okay' | 'tired' | 'confused' | 'proud' | null
  tasksDone:   string[]      // list of task titles completed this session
}
```

### REST Endpoints (add to existing list)

```
POST   /api/journal/entries/
GET    /api/journal/entries/?studentId={id}
GET    /api/journal/entries/?sessionId={id}
GET    /api/journal/entries/{entryId}/
```

---

## Development Without Backend

The frontend is fully buildable without a running backend.
All screens use mock data from `src/mocks/`.

To simulate a live EEG stream during development:

```typescript
import { createMockEEGStream } from '../mocks'

// In any component or hook:
useEffect(() => {
  const stop = createMockEEGStream((state) => {
    console.log('Mock EEG state:', state)
  }, 3000)
  return stop
}, [])
```

---

## Component Structure

Components follow atomic design:

```
atoms/       Smallest units — StateBadge, Button, Avatar
molecules/   2+ atoms — StudentStateCard, TaskCard, NavBar
organisms/   Complex sections — LiveDashboardGrid, FocusSessionLayout
templates/   Page-level shells — CalmZoneTemplate, TeacherDashboardTemplate
```

Import from barrel files:

```typescript
import { StateBadge, Button, Avatar } from '../components/atoms'
import { TaskCard, NavBar } from '../components/molecules'
```

---

## Design System

Full token reference: `src/constants/tokens.ts`
Cognitive state colors: `src/constants/states.ts`

### Two-Zone Visual System

| Zone         | Background | Used For                                                 |
| ------------ | ---------- | -------------------------------------------------------- |
| Playful Zone | `#FBF7EE`  | Splash, Home, Join Class, Rewards                        |
| Calm Zone    | `#F8F8FC`  | EEG Pairing, Focus Mode, Relax Mode, all session screens |

### Cognitive State Colors

| State          | Color     | Fill      | Text      |
| -------------- | --------- | --------- | --------- |
| Focused        | `#1D9E75` | `#E1F5EE` | `#085041` |
| Relaxed        | `#378ADD` | `#E6F1FB` | `#0C447C` |
| Distracted     | `#EF9F27` | `#FAEEDA` | `#633806` |
| Overstimulated | `#D85A30` | `#FAECE7` | `#712B13` |

---

## For the Backend Developer

The frontend is being built independently using mock data.
Here is what you need to know to stay in sync:

**1. Run your backend on port 8000.**
The frontend dev environment expects `http://localhost:8000`.

**2. Enable CSRF trust for the Vite-only development server.**
The Vite dev server runs on port 5173. Add it to your Django
`CORS_ALLOWED_ORIGINS`.

**3. Use the exact API contract above.**
Especially the WebSocket event shapes and the cognitive state strings.

**4. The frontend does not care how you implement the backend.**
Django REST Framework, Django Channels, BrainFlow, whatever you choose
internally is your decision. The only thing that matters to the frontend
is that the endpoints and WebSocket events match this contract exactly.

**5. Auth uses JWT tokens.**
The frontend sends `Authorization: Bearer <token>` on every API request.
Set up `djangorestframework-simplejwt` on your end.

**6. When you are ready to test together:**

- Run Django on `localhost:8000`
- Run the EEG bridge script pointing to `localhost:8000`
- Tell the frontend dev to switch from mock data to real endpoints
# Baseline EEG model training

Baseline recordings collected at `/baseline` can be audited and trained directly from the configured database.

```powershell
pip install -r requirements-ml.txt
python manage.py train_baseline_models --report-only
python manage.py train_baseline_models
python manage.py analyze_baseline_data
python manage.py train_augmented_baseline_model
python manage.py train_advanced_eeg_model
python manage.py generate_synthetic_eeg_demo
python manage.py train_combined_eeg_model
start local-data\analysis\baseline_analysis.html
```

By default only quality-approved epochs are used. Validation is grouped by participant code, preventing the same participant from appearing in both training and validation folds. Outputs are written to `EEG_DATA_ROOT/EEG_MODEL_SUBDIR` (normally `local-data/models`):

- `baseline_classifier.joblib` — supervised condition classifier
- `baseline_clusterer.joblib` — unsupervised epoch clustering pipeline
- `baseline_model_metrics.json` — dataset counts, feature list, validation metrics, and confusion matrix

The analysis command creates a browser-ready report plus `baseline_epoch_features.csv` and the complete compressed `baseline_raw_signals.csv.gz` export under `local-data/analysis`.

Use `--include-flagged` only for an explicit sensitivity analysis. These models are research baselines and are not clinical diagnostic tools.

The optional augmented experiment creates exactly 100,000 balanced synthetic/real epoch-feature rows (25,000 per state; 500,000 paper-aligned feature values) separately inside every training fold. Validation rows always remain untouched real EEG from held-out participants. Its artifacts are clearly separated as `baseline_augmented_classifier.joblib`, `baseline_augmented_metrics.json`, and `baseline_augmented_training_features.csv.gz`; synthetic rows must never be reported as independent participants.

`train_advanced_eeg_model` recomputes Welch PSD independently from each epoch's own four-channel raw signal, adds channel-specific relative/absolute powers, ratios, Hjorth parameters, electrode asymmetry, and participant-neutral deltas, then compares Logistic Regression, RBF SVM, Random Forest, Extra Trees, and the paper's four-cluster-to-label flow using participant-grouped evaluation.

`generate_synthetic_eeg_demo` creates an isolated 30-participant, 100,000-row artificial dataset for demonstrations and load-testing. Its output is stored under `local-data/synthetic-demo`, is never inserted into Supabase, and must never be reported as human-subject evidence.

`train_combined_eeg_model` combines the 100,000 synthetic rows with all eligible real epochs in a clearly source-labeled export. Synthetic and real sources receive equal total training weight, while validation is performed exclusively on untouched real participant folds.
