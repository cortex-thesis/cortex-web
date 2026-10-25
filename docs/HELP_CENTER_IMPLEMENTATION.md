> Superseded: onboarding now follows actual selected lessons and normal saved Practice. See ACTUAL_LESSON_ONBOARDING.md. All preview routes and sample activity content have been removed.

> Redesign update: standalone onboarding has been replaced by contextual, cross-route guided exploration. See CONTEXTUAL_ONBOARDING.md for the current architecture, mappings and validation.

> Navigation update: Help & Guides now lives in Settings for both roles, replacing its main-bar entry. The teacher tour concludes at Settings. See HELP_TRACEABILITY.md for the pending manuscript/timetable alignment audit.

# Cortex Help Center implementation and verification

## Audited integration

The active frontend is `frontend/src`, using React Router protected role groups, Zustand authentication, Lexend typography, existing design tokens, TeacherDashboardTemplate and PlayfulZoneTemplate. Student navigation is a bottom bar; teacher navigation is a top bar, rather than a sidebar. Help & Guides uses those existing bars, with the circle-help icon, active state and accessible text. Teacher navigation now wraps and scrolls horizontally on narrow screens.

Inspected routes, authStore, Home, Dashboard, class overview/roster/enrollment/setup, session controls, general and advanced reports, journals, movement observations, student session setup/consent, FocusMode, TaskInteraction, matchingOrder and FocusSupport. Existing APIs own progress and session writes. No new API, dependency, migration or data model was added.

Teacher screens support section creation, enrollment, class analytics, learner reports, direct movement observations, teacher-led lobbies and controls, journals, notifications and account functions. They do not expose a general lesson/media/slide editor or individual package assignment control. New sections include all seven packages. Help documents those limits instead of inventing controls.

## Implementation plan and files

- `frontend/src/features/help/content.ts`: five student topics and twelve teacher guides, categorized and searched against titles, descriptions and full instructions. Detail views include related guides and links to real screens.
- `HelpCenter.tsx` and `Help.module.css`: role-aware Help Center, About, student demo, nonmodal first-visit offer and guided teacher navigation. Existing templates, illustration and tokens are reused.
- `persistence.ts`: versioned localStorage keys scoped by authenticated account ID and role. Completed and dismissed states both suppress repeated offers. An in-memory fallback preserves usability when storage is blocked. Clearing storage or moving to another browser offers onboarding again; this is device-local persistence.
- Router and App: protected `/student/help`, `/student/help/tour`, `/teacher/help`, `/teacher/help/tour` routes and a shared guidance host after authentication initializes.
- Student and teacher NavBars: persistent Help & Guides entry. Teacher nav uses explicit route anchors for tour highlights.
- Dashboard, Classes, ClassSession, Reports and AdvancedReports: contextual guide links.
- `frontend/browser-tests/help.spec.mjs`: six behavioral and accessibility browser tests with intercepted API fixtures.

## Student preview

Seven short steps cover welcome, discovering a sample lesson goal, matching everyday helpers, ordering handwashing/snack preparation, asking for help, manually showing a keyword cue and completion. Matching, sequence and choice reuse TaskInteraction, its random option ordering and its validation. The keyword example reuses AdaptiveLessonText/FocusSupportContext. These interactions were chosen because they are real, keyboard/touch-operable lesson patterns with immediate feedback and no hardware dependency.

Activities support retry, skip, back and exit. The demo has no lesson API callbacks, Muse store access, result writes or scoring persistence. The visual cue is explicitly labeled as a demonstration without EEG acquisition or simulated state predictions. Completion offers real classes, Home and replay; no achievement or progress is awarded.

## Teacher guidance

Categories cover live learning, classroom, learning content, progress/records and account/privacy. Guides include dashboard interpretation, class details, enrollment, package availability, lobby/start/pause/resume/end, four class modes, connection recovery, EEG quality/limitations, reports/history/export, advanced slide-level reports, direct movement observation, journals, account permissions and troubleshooting.

The optional six-stop tour highlights real navigation and visits Dashboard, Classes, Sessions, Journals, Reports and Help. Navigation remains usable and the panel has Back, Next and Exit. It never clicks a mutation control. Class- and learner-specific workflows use instructions beginning at Classes rather than fabricating an ID or creating records. Detailed guides remain independently accessible.

About uses the repository educational context, actual frontend package version and cognitive-state/privacy limitations. No team names or credentials were invented.

## Verification (2026-10-26)

- `npm.cmd run build --prefix frontend`: passed. Vite warns about the existing large application chunk.
- `npm.cmd test --prefix frontend`: 93 tests passed, zero failed.
- Repository-wide `npm.cmd run lint --prefix frontend`: failed with 19 errors and 2 warnings in existing components (including FocusSupport exports, GardenMission refs and existing page effects).
- ESLint on the new help directory and changed navigation components: passed.
- Edge Playwright, `help.spec.mjs --reporter=line`: six tests passed. The bundled Playwright Chromium is absent; installed Edge was used. A separate Vite port was used because the default test port was occupied.
- Browser tests cover matching, ordering, incorrect/correct choice retry, visual cue, completion, search/empty results/topics/About, all teacher tour stops, exit/dismissal, refresh persistence, account switching, role protection, keyboard activation/focus, mobile overflow, reduced-motion mode and blocked storage. API interception verifies zero mutations during both demo and teacher tour. Browser page errors fail tests.
- Axe checks passed for student demo and teacher Help Center main content. Desktop teacher and mobile student screenshots were visually inspected.
- `git diff --check`: passed (line-ending advisory only).

## Remaining manual verification

Real login/logout across devices, real Muse acquisition/calibration, classroom invitations on two devices, live report values, all existing screen controls and a broader assistive-technology review were not exercised by these fixture-based tests. First-visit offers appear on the student Home or teacher Dashboard, so active lesson/session screens are not interrupted. Completion is local to the browser/account/role, not synchronized between devices. Hardware behavior was not changed. Use a controlled supervised session for final defense rehearsal.

Existing user changes in `offline_sync/engine.py` and `offline_sync/tests.py` were left untouched.
