# Cortex system flow and UX audit

Audited 2026-09-24 against the React router, page components, API clients, Django routes, views, models, and regression tests. “Connected” means the route and data/action path exist in code; it does not claim that every deployment has populated records or attached lesson assets.

## Student flow

| Stage | Route / component | Data source | Forward action | Status |
| --- | --- | --- | --- | --- |
| Login | `/` · `pages/Login` | `/api/auth/login/`; authenticated `Profile` plus bootstrap | Role redirect to `/student/home` | Connected |
| Home | `/student/home` · `student/Home` | `/student/dashboard/`, `/student/sessions/`, notifications, auth store | Resume active session, open class, profile, journal, settings | Connected after audit fixes |
| Classes | `/student/classes` · `student/Classes` | `/classes/` filtered by active enrollment | Open `/student/class/:classId` or join class | Connected |
| Class | `/student/class/:classId` · `student/ClassDetail` | `/classes/:id/?summary=1` | Open assigned package | Connected |
| Lesson list | `/student/class/:classId/package/:packageSlug` | approved lessons from student class-package API | Open lesson mode selector | Connected |
| Lesson choice | `/student/class/:classId/lesson/:lessonId` | student lesson API | Practice player or EEG pairing | Connected |
| Practice | `.../practice` · `PracticeLesson` | lesson/slides and `LessonPracticeProgress` | Slide progression and return to package | Connected; separate from EEG session analytics |
| EEG session | `/student/eeg-pairing` → `/student/mode-select` → `/student/eeg-live` | Muse client state; `/sessions/start/`, EEG, slide, intervention, and mode APIs | Adaptive lesson activities and session end | Connected |
| Adaptation | `LiveEEG`, `FocusMode`, `RelaxMode`, `SwitchingModes` | Muse DSP/store, predictions, adaptation/intervention APIs | Continue, switch presentation, or teacher override | Connected; requires hardware/consent except explicit development bypass |
| Completion | `/student/session-summary` | navigation state generated from the saved session | Journal or home | Connected; direct entry now returns to session history instead of showing mock results |
| Progress | `/student/sessions`, `/student/profile` | `/student/sessions/`, `/student/package-progress/`, badges | Review saved summary, journal, classes/home | Connected |

State carried forward includes class ID, lesson ID, optional teacher class-session ID, learning-session ID, selected mode, activity progress, EEG samples/state distribution, and completion summary. Server models persist session, slide exposure, activity response, prediction, adaptation, analytics, journal, practice, and badge records.

## Teacher flow

| Stage | Route / component | Data source / mutation | Next action | Status |
| --- | --- | --- | --- | --- |
| Login | `/` · `pages/Login` | `/api/auth/login/` plus teacher dashboard bootstrap | `/teacher/dashboard` | Connected |
| Dashboard | `/teacher/dashboard` | `/teacher/dashboard/`, live refresh, session controls | Class, session, journal, reports | Connected; statistics distinguish missing EEG data from zero |
| Classes | `/teacher/classes` | `/classes/` | Open class or create `/teacher/classes/new` | Connected |
| Class overview | `/teacher/class/:id/overview` | class detail, class analytics, live sessions | Start session or select students/analytics tabs | Connected |
| Students | `/teacher/class/:id/students` | class roster | Enrollment or student profile | Connected |
| Content | Class-session lesson selector plus content APIs | approved global lesson repository and class packages | Select content for a teacher-led session | Partially connected: content APIs exist, but there is no first-class teacher content-management destination in the main navigation |
| Session | `/teacher/class/:id/session`, `/teacher/class-session/:groupId` | class-session APIs, controls, live learning sessions | Monitor/control modes and finish session | Connected |
| Analytics | `/teacher/class/:id/analytics`, `/teacher/reports`, `/teacher/reports/advanced` | class/session analytics, EEG aggregates, reports | Filter, inspect learner/class trends | Connected |

## Cross-system trace

Teacher creates a `SchoolClass` and manages `Enrollment` → student dashboard/classes read the same class and enrollment → class packages expose approved `Lesson` records → the student starts a `LearningSession` (optionally attached to a teacher `ClassSession`) → slide exposure, responses, EEG samples, predictions, adaptation events, and analytics are stored against that session → student history/profile and teacher dashboard/class analytics read those records.

The core class-to-session-to-analytics relationship is implemented. Two limits remain explicit:

- Teacher content authoring/assignment endpoints exist (`/content/lessons/`, slides, assets, assignment), but the audited production teacher navigation does not expose a complete content-management workflow.
- Practice-only lesson progress uses `LessonPracticeProgress`; it does not create an EEG `LearningSession`, so it is intentionally absent from EEG analytics.

## Navigation and element findings

- Functional/navigational: primary student and teacher navigation, class cards, lesson/package actions, session controls, profile/settings/notification links, enrollment, reports, journals, and analytics filters all resolve to implemented routes.
- Informational/feedback: cognitive-state badges, distributions, signal quality, progress bars, session summaries, notifications, and empty states derive from APIs or persisted models.
- Decorative: Playful Zone blobs and lesson imagery are non-interactive and do not impersonate controls.
- Fixed P0: direct `/student/session-summary` no longer renders a fabricated `MOCK_SUMMARY`.
- Fixed P0/P1: the home “continue” area now reads real in-progress sessions and preserves class/lesson/session context when resuming.
- Fixed P1: the home journal shortcut now opens the implemented journal rather than the profile.
- Fixed P1/P2: removed the hard-coded zero progress card and replaced it with real completed-session and learning-time data.
- Fixed P2: added a compact identity card backed only by authenticated/dashboard fields and linked it to the profile.
- Identified future/prototype scope: registration, password recovery, calibration/diagnostics, and multiple components in `pages/prototype` contain explicitly prototype-only UI or non-persisted actions. They should remain labeled/feature-gated rather than presented as production account workflows.
- Identified content placeholders: lesson definition files intentionally retain `asset_placeholders`; these are curriculum-production metadata, not dashboard data. The frontend mock lesson modules are development fixtures and are not the authenticated student data source.

## Remaining priority

1. **P1:** expose or deliberately feature-gate teacher content management so “Content” has an honest production entry point.
2. **P1:** replace prototype registration/password-recovery routes with real account APIs or visibly label/disable them outside template mode.
3. **P2:** add focused frontend tests for home active-session resume and missing-summary redirect.
4. **P3:** split the large production JavaScript bundle; current build succeeds but reports a chunk over 500 kB.

