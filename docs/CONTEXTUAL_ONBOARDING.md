> Superseded: onboarding now follows actual selected lessons and normal saved Practice. See ACTUAL_LESSON_ONBOARDING.md. All preview routes and sample activity content have been removed.

> Superseded tour design: see NATIVE_PRODUCT_TOUR.md. Activities and support controls have moved out of tour hints into an unsaved practice screen using the real player components.

﻿# Cortex contextual guided exploration

This document supersedes the standalone demo and navigation-tour sections in HELP_CENTER_IMPLEMENTATION.md. Help & Guides stays in Settings, preserving the user's requested placement.

## Audit and route mapping

Reused protected React Router routes, authStore identity, existing templates and navigation. Removed the standalone StudentDemo and old teacher query-string tour from HelpCenter. Retained searchable content, About, version, contextual links and v1 account/role completion keys. The manuscript and timetable remain unavailable in the repository; HELP_TRACEABILITY.md records the unverified thesis/schedule alignment. No thesis or schedule artifact was edited.

| Role / stop | Actual target | Observed result |
|---|---|---|
| Student Home | Home's real Start learning / Join class card, `student-learn` | Classes, a class detail, or Join Class route |
| Student learning area | Existing PlayfulZone main landmark | Information and isolated matching activity; no enrollment required |
| Student support | Same real screen with AdaptiveLessonText preview | Manually toggled illustrative keyword cue, no EEG |
| Student Home return | Existing header brand or Join Class back button, `student-home` | `/student/home` |
| Student Settings | Existing header Settings button | `/student/settings` |
| Student help | Existing Settings Help & Guides link | `/student/help`, completion message |
| Teacher dashboard | Existing Classes navigation | `/teacher/classes` |
| Teacher classes | Existing template main landmark | Class/learner/package explanation |
| Teacher session preparation | Existing Sessions navigation | `/teacher/sessions`, safe preparation/monitoring guidance |
| Teacher reports | Existing Reports navigation | `/teacher/reports`, saved-evidence explanation |
| Teacher account | Existing account button | Real menu becomes expanded |
| Teacher Settings | Existing menu item | `/teacher/settings` |
| Teacher help | Existing Settings Help & Guides link | `/teacher/help`, completion message |

## Controller

GuidedTour.tsx is shared by both roles. TourLaunch consumes the existing `/help/tour` route and presents welcome over the real dashboard. Topic-specific launch links start at the appropriate safe section (teacher sessions/reports or student support). The controller never clicks a control or submits a workflow.

Steps use explicit data attributes, click observation and expected route or expanded-menu state. Informational stops use Next; activity Next requires successful matching, with a separate skip option. MutationObserver detects asynchronous and conditional targets. ResizeObserver, captured scroll and window resize update target rectangles and tooltip dimensions. Positioning uses measured geometry and viewport bounds, with no fixed delays or hardcoded target coordinates. Spotlights are pointer-transparent. The nonmodal dialog leaves application navigation available, focuses its heading, restores connected prior focus, supports Escape and respects reduced motion. Missing targets offer skip; leaving the expected screen pauses highlighting and offers return.

SessionStorage keeps interrupted runs separately per authenticated ID and role, including current stop and route history. Reload restores that run. Completion and explicit dismissal use the existing localStorage lifecycle. Logout/account changes unmount the keyed controller; another account gets its own state. Storage failures preserve in-memory usability. Clearing storage or changing browsers does not synchronize progress.

## Isolation and limitations

Matching reuses TaskInteraction and matchingOrder; its callback only updates component state. The support example uses AdaptiveLessonText/FocusSupportContext with manually selected terms. No Muse store, EEG classifications, session control API, answer endpoint, progress endpoint or report mutation is called by the controller. No achievement or lesson completion is awarded.

The tour adapts to the existing Home learning destination, including learners without enrollment. It does not automatically choose private class/lesson IDs or create an enrollment. A single reusable activity is intentionally offered over the real learning area rather than reconstructing the lesson player. Session-specific controls are explained at the preparation screen; the tour does not create a live session to reveal them. Real-headset, actual multi-device acquisition, all enrolled-class variants and assistive-technology review remain manual checks.

## Changed files

New GuidedTour.tsx / GuidedTour.module.css and extracted demoTasks.ts; refactored HelpCenter.tsx / Help.module.css; App and router integration; stable attributes in Home, JoinClass, StudentHeader, teacher navbar and role templates; replaced browser-tests/help.spec.mjs with cross-route behavioral tests. Existing unrelated offline_sync edits were preserved.

## Validation

Production build passed with the existing large-bundle warning. All 93 existing frontend tests passed. The initial browser accessibility check identified an invalid aside/dialog role pairing; the dialog container was corrected to a div. Targeted help ESLint passes after dependency corrections. Desktop student and teacher plus mobile screenshots were inspected. Final browser outcomes are recorded below after the final run.

Final Edge browser rerun: seven tests passed (22.3 seconds). Verified real student and teacher route progression, expected-result gating, matching interaction and no API writes, refresh/resume, Escape/replay, hidden or missing target fallback, mobile viewport bounds, reduced-motion setting, keyboard focus, Axe dialog accessibility, Settings/reference/About access, account isolation, Back/route interruption recovery, feature-specific launch and blocked storage. Build, all 93 existing frontend tests, targeted help lint and diff whitespace checks passed. Real hardware, authenticated production data and two-device teacher-led sessions remain unverified.

## Viewport clipping correction

Tour overlays now render through a portal directly under document.body. Placement uses measured panel/target bounds and the visual viewport (including resize, zoom and viewport-scroll events), clamps all edges with a 16px margin, and selects a fully fitting adjacent placement where possible. Long content scrolls within a height-constrained panel; the exit/header stay outside that scroll area, and navigation actions use a sticky footer. Compact styles support short landscape windows.

Production build, targeted GuidedTour ESLint and whitespace checks passed. A dedicated Edge regression passed across 1366×500, 640×360, 390×500 and 320×240 with live resizing, content growth, visible Exit and reachable Next/Skip controls. The 640×360 screenshot was visually checked for unclipped panel bounds.
