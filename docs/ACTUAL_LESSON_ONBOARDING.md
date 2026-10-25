# Actual lesson workflow onboarding correction

This report supersedes the preview-based onboarding reports. The guided journey now uses the real selected class lesson and normal Practice from beginning to end.

## Audit

Home's actual lesson entry is labeled **Start a lesson**, with the existing play icon; there is no separate Lessons item in the current bottom navigation. The guide targets that real Home control, which opens `/student/classes`. Class buttons open class details; package buttons open their available lessons; any lesson opens LessonModeSelect. Its book-icon Practice option and Continue to practice button open `/student/class/:classId/lesson/:lessonId/practice`.

PracticeLesson owns initial access, saved answers, retry state, slide progression and completion. Its existing POST calls, response handling, gates, callbacks, media controls and completion logic were retained. Only stable data attributes were added to this player. The guide does not choose a class, package, lesson, answer or mode on behalf of a learner.

## Removed

- `/student/practice-preview` route.
- Home Try Practice card.
- PracticePreview component, sample tasks file, sample support toggle and all preview CSS.
- Guide assumptions about unsaved practice or identical lesson activities.

There are no tutorial-only activities or sample lessons left in the frontend. Help Center and About remain available in Settings. Learning journal continues to use the standard card style.

## Current flow

1. Home → actual Start a lesson control.
2. Choose any accessible class, package and lesson using existing screens. The same selection stop follows all three routes; no lesson ID is hardcoded by the tour.
3. Activate the real Practice option, then Continue to practice. Entry is checked against the selected lesson route.
4. Read one short hint alongside the actual player. The current activity template drives matching, sequencing, choice, media or general instructions. A DOM observer updates these hints as the learner moves through their real lesson.
5. A separate navigation hint responds to available retry and completion controls. It does not enable Next, require an answer, click Finish or change lesson gates.
6. The learner may remain in Practice, exit the tour, or use its existing Back to lessons control to continue exploring. Package screen → actual Home control → Achievement Garden → Sessions → Settings → Help.

Onboarding completion only updates the account/role onboarding preference. Real practice answers, retries and progress continue to save normally, even while onboarding is active. Exiting the tour removes guidance and any temporary layout reservation; it does not unmount Practice or cancel its saves. Finishing a lesson does not complete the tour, and finishing the tour does not finish the lesson.

Missing enrollment, missing lessons or loading errors remain real application states. The guide explains teacher/enrollment access or offers skip/exit; it never substitutes generated content. The teacher tour remains a read-only guide to actual routes.

## Guidance behavior

Existing portal positioning, visual-viewport bounds, focus, Escape, reduced motion, Back, Skip, interruption handling and account isolation remain. Versioned in-progress keys moved to v4 to avoid restoring obsolete preview indices. During choice screens and actual practice guidance, desktop space is reserved beside the content; narrow screens use a compact bottom hint and scrollable application area. The guide stays outside application activity controls. Temporary presentation spacing disappears on exit; data and learning behavior do not depend on tour state.

## Files

GuidedTour.tsx/CSS, existing Home/Classes/ClassDetail/ClassPackageLessons/LessonModeSelect/PracticeLesson and its CSS, router, help content, and browser-tests/help.spec.mjs. practicePreviewTasks.ts was deleted. Existing unrelated offline_sync changes were preserved.

## Verification

Build and targeted lint passed. All 93 existing frontend tests passed. Browser tests use intercepted API fixtures to execute the real selected-lesson screens and existing persistence calls; fixture lessons exist only in the test file, not in the application.

The fixture suite selects two different lesson IDs and structures, exercises matching and ordering, an incorrect answer and retry, subsequent choice activity, normal POST saves and completion after exiting the tour. It also follows the complete onboarding while leaving Practice unfinished, checks unchanged completion state, tests mobile real activity interaction and Axe dialog accessibility, reload/replay with missing enrollment, and teacher read-only navigation. Development Strict Mode may issue two initial empty practice-access POSTs; tests allow this normal behavior while checking for zero fabricated answer or completion requests.

Final browser outcomes are appended after the completed run. Real database storage, all curriculum templates, headset acquisition, two-device classroom operation and the unavailable authoritative manuscript/timetable remain outside these fixture checks.

Final results: all seven Edge browser tests passed (24.0 seconds). The final production build passed with the existing bundle-size warning; targeted help/player/mode-selection lint and diff whitespace checks passed. All 93 existing frontend tests passed earlier in this correction. A mobile screenshot of the actual chosen lesson after a real matching interaction was inspected: the original player remains visible above the compact guidance panel. A frontend source search found no remaining preview route, preview component, preview task file or Try Practice entry.
