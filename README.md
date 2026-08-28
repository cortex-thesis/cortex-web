# Cortex Web — Frontend

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

Template-only mode is the default. When the real backend is ready, set
`CORTEX_TEMPLATE_ONLY=false` to enable the configured Supabase connection.

Open `http://127.0.0.1:8000`. Django serves the existing React interface and
keeps all client-side routes working. Backend routes live under `/api/`; the
health check is available at `/api/health/`.

The minimum school workflow is available through session-authenticated API
routes for registration/login, profiles, class creation and assignment,
enrollment/removal, consent, and session start/end. See
[`SECURITY_PRIVACY.md`](SECURITY_PRIVACY.md) for the consent, pseudonymization,
retention/deletion, secrets, uploads, audit, backup, and non-diagnostic
messaging baseline.

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

Open `http://localhost:5173` in your browser.

---

## Environment Variables

Create a `.env.development` file in the root:

```env
VITE_API_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000/ws
```

These point to the Django backend. The frontend runs independently
without the backend — mock data is used for all screens during
frontend development.

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

**2. Enable CORS for localhost:5173.**
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
