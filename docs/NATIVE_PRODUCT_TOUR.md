> Superseded: onboarding now follows actual selected lessons and normal saved Practice. See ACTUAL_LESSON_ONBOARDING.md. All preview routes and sample activity content have been removed.

# Native product exploration — 2026-10-26

## Audit and design decisions

The student app has no dedicated Practice Modes navigation icon. Home links to classes/lessons, the Achievement Garden, profile/progress, journals and saved Sessions. A class leads to curriculum packages, then lessons; LessonModeSelect offers Practice or EEG Session. PracticeLesson uses TaskCard and persists initial access, answers and completed slides through POST requests. It cannot safely serve an unsaved onboarding example unchanged.

EEGPairing, ModeSelect, live EEG, FocusMode, RelaxMode, the classroom lobby, calibration and session-summary routes participate in real acquisition or session workflows. The tour does not invoke them or manufacture the records they require. Journals support written/drawing/audio reflection; profile supports identity and progress. Settings contains account preferences/security and Help & Guides. Achievements fetches saved badge unlocks; its garden lets learners inspect earned flowers and locked buds. Teacher Dashboard, classes/rosters, session preparation, journals, reports, account menu and Settings remain the actual teacher destinations.

The manuscript and development timetable have not been provided or located in the repository. Approved-document alignment and deadlines remain unverified, as recorded in HELP_TRACEABILITY.md. No thesis module, manuscript or timetable was modified.

## Architecture

The tooltip explains; the application demonstrates. GuidedTour no longer imports or renders TaskInteraction, TaskCard, AdaptiveLessonText or sample tasks. The prior popup activity, retry state, answer gating and simulated-support controls were removed. Existing viewport portal, observers, route-result gating, focus management, Escape, completion/dismissal, interruption recovery and role/account isolation are retained. In-flight actions are now persisted so a refresh between navigation and progression can recover. A v3 session key avoids resuming obsolete step indices; existing completion preferences remain intact.

Home now has an honest **Try Practice / Unsaved activity preview** card with the existing play icon. It opens the protected `/student/practice-preview` route. PracticeLesson's explicit preview entry renders a small unsaved player with the existing TaskCard, PracticeLesson CSS layout, activity navigation and three sample activities (matching, sequencing, choice). It never mounts LessonPlayer, the component owning API reads/writes and saved practice state. Sample tasks live under pages/student, not the help layer. Preview Previous, Next activity, retry and visual-support buttons are application controls, available without any tour. Completing an activity is never required to continue.

Real class Practice remains unchanged and continues to save progress. Preview labels state that no records are saved. No class IDs, checkpoint keys, fake sessions, EEG readings or achievements are created. Keyword support is manually toggled in the practice UI and labeled illustrative; the application includes an expandable explanation of the four states and two delivery modes.

## Journey and targets

| Chapter | Actual controls and destinations | Guidance |
|---|---|---|
| Practice | Home `student-practice` → practice-preview; `practice-goal`, `practice-support`; header Home | Try real matching/ordering/choice controls and optional support, then return Home |
| Garden | Home `student-garden` → achievements; first actual `garden-flower`; header Home | Inspect existing flower/bud details without unlocking anything |
| Lessons | Home `student-learn` → class, classes or Join Class; real `learning-heading`; Home/back | Explain package → lesson → Practice/EEG options without creating enrollment |
| Your learning | Bottom-nav `student-sessions` → saved Sessions; actual search field | Find saved sessions; preview results are absent |
| Help | Existing Settings icon → Settings Help & Guides | Find searchable reference and replay |
| Teacher | Existing Classes, Sessions, Reports, account, Settings and Help controls | Same controller with shorter workflow-focused hints; no teacher mutation control is activated |

The suggested journey has action stops and informational stops, with Back/Skip/Exit throughout. Learners can interact normally, skip activities entirely, leave a route and recover, or restart. Reference content remains independent of the tour. Garden mouse interaction was corrected: focus no longer opens a bud immediately before the click toggles it closed; keyboard Enter/Space still activate the native button.

## Placement and visual design

Cortex tokens, Lexend typography, icon conventions, rounded corners and soft shadows are preserved. Hints are 280px wide with a chapter indicator, small progress track, short copy and one-row controls where possible. Motion is a single brief fade and restrained spotlight shadow transition, disabled for reduced motion. No bouncing, flashing, confetti or reward simulation was added.

Placement uses measured target/panel/visual-viewport geometry. It prefers a fully fitting side/above/below candidate, constrains height to available space and re-centers offscreen action targets after resizing. The unsaved player reserves a right guidance column on desktop. On narrow screens, the hint docks above the real bottom navigation and the app reserves that area, so activity controls remain scrollable and clickable above it. The reserve is removed on tour exit or when leaving the preview. Exit and footer navigation remain reachable when content scrolls.

## Files

- Refactored features/help/GuidedTour.tsx and GuidedTour.module.css; retained HelpCenter and persistence.
- Extended pages/student/PracticeLesson.tsx and its CSS with a strictly isolated preview branch; sample data moved to practicePreviewTasks.ts.
- Added the protected preview route, Home play-card target and garden target, QuickActionCard's optional tourId, student Sessions navigation/search targets, class/join heading targets, garden native-button target and click correction.
- Help topic copy explains saved real Practice versus unsaved preview. Existing teacher routes use the same contextual controller.
- Replaced browser-tests/help.spec.mjs with behavioral native-flow, isolation, placement, accessibility and lifecycle checks.
- Existing offline_sync user edits remain untouched.

## Verification and limits

All 93 existing frontend tests passed. Targeted lint passed. The full six-test Edge browser suite passed after correcting the intercepted-control and garden click issues. A further targeted mobile test passed with actual practice-button clicks and Next activity navigation, viewport bounds, non-overlap checks and Axe dialog analysis. Mobile screenshots were visually inspected. Final build/test rerun results follow below.

Browser fixtures verify zero API mutations during the full student and teacher tours and the independent preview. They exercise real components/routes with empty saved records, not a live classroom database. Real Muse acquisition, two-device classroom operation, all enrolled-class data variants and broader assistive-technology testing remain manual checks. This is a usability enhancement, not effectiveness or clinical evidence.

Final validation: seven Edge browser tests passed (27.8 seconds), including the full native student/teacher paths, independent unsaved preview, refresh/back/interruption/exit/replay, search/account separation, viewport non-overlap, actual mobile activity clicks, Axe dialog checks and actual mobile garden inspection. All 93 existing frontend tests passed. Targeted changed-component lint and diff whitespace checks passed. Production build passed with the pre-existing bundle-size warning. Mobile Practice and Garden screenshots were reviewed; garden placement accounts for both the flower and its native milestone-detail bounds, keeping the detail popup clear.
The final garden-specific regression additionally checks that the tour never overlaps the native flower-detail tooltip. That Edge check passed after accounting for both bounds, and the resulting mobile screenshot was inspected.
