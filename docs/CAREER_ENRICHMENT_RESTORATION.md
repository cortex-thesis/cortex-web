# Career and Enrichment restoration — 25 October 2026

## A. Restoration

Original lessons 16–21 are approved and active again. Redesigned lessons 300031–300036 are archived, with no deletion of slides, activities, responses, practice records or sessions. Publication audit 300556 identifies both sets.

Before modification, a complete SQLite online backup was taken at `.runtime/restoration/before-20261025-174422.sqlite3`. Its SHA-256 is recorded in `.runtime/restoration/backup.json`; integrity_check returned `ok`, and every table's row count matched the source. This contains private application data and must remain local. Restore a backup only with application writers stopped, retaining a copy of any later data first.

All 48 original slide configurations were compared exactly before enhancement. Original lesson, slide and activity IDs, ordering, instructional content, and standard Practice player were restored. Preview sources again use the original Career/Enrichment mocks. No special creative template occurs in the active six lessons. No EEG classifier, preprocessing, adaptation policy or teacher control was changed.

The original versions retain 12 activity responses, 4 practice records and 6 learning sessions. The archived redesign retains 3 practice records (no activity responses or sessions at restoration time). Full response, practice and session snapshots were compared, including their evidence and IDs; nothing was transferred. Other packages' lesson records, slides and activities were compared with the backup and remain unchanged.

The package page's authorized “Previous lesson versions and saved progress” section opens archived practice only for learners with their own saved progress and current class access. The saved collection API now includes the owner's archived evidence, still scoped to their identity and enrollment. Historical creative renderers/validators remain to support these records; they are absent from the active six journeys. Teacher observations and session evidence remain attached to their original identities.

Official Enrichment metadata was rechecked against the indexed tables of [DepEd Order 021, s. 2020](https://www.deped.gov.ph/wp-content/uploads/2020/08/DO_s2020_021.pdf):

| Lesson | Code | Official competency | Printed page |
|---|---|---|---|
| 19 / ENRICH-01 | TPEP-dt-NG-2 | Identify different types of human talents and skills | 71 |
| 20 / ENRICH-02 | TPEP-mu-NG-2 | Identify individual skills in music | 72 |
| 21 / ENRICH-03 | TPEP-dc-NG-4 | Perform basic dance steps /movements | 74 |

The direct PDF fetch returned HTTP 403, but the official domain's indexed tables exposed the code/description correspondence. Source references are retained in lesson configuration and restoration audit metadata. Legacy synchronization now retains official descriptions and selects active lessons without selecting archived redesigns.

Baseline verification completed before applying refinements: 34 Django tests, 84 frontend unit tests, and six browser tests covering all 48 original screens at 390px width. The browser tests check the standard player, eight-step progress, current screen, navigation, absence of creative templates and horizontal overflow. A separate history regression verifies archived evidence/practice access for the owner and rejection for another learner.

## B. Targeted enhancements

Exactly one existing screen per lesson changed. All eight-slide sequences, activity types, choices, answer keys, grading mappings and progress identities remain unchanged. The six previous configurations are recorded in the `restored_lesson_refinements` audit for publication 300556.

| Lesson | Slide | Change |
|---|---|---|
| 16 / CAREER-01 | 3 — Strengths and Support | Existing organizing/customer-service illustrations now accompany a short school-supply example and a supported conversation example. |
| 17 / CAREER-02 | 4 — Why Might It Fit? | School cooperative stock-room context and clearer reasoning/retry feedback. |
| 18 / CAREER-03 | 5 — Respond to a Mistake | Barangay-event supply-label situation and specific supportive feedback. |
| 19 / ENRICH-01 | 5 — Build a School Showcase | Shorter, one-job-at-a-time instructions and clearer retry guidance; original three scenarios retained. |
| 20 / ENRICH-02 | 5 — Echo the Sound Pattern | Clear replay/visual-prompt instructions; existing WAVs explicitly described as electronic tones rather than instrument recordings. |
| 21 / ENRICH-03 | 6 — Make the Routine Work for You | Concrete seated/standing alternatives, pointing/observing options, and explicit distinction between sequencing knowledge and teacher-observed movement performance. |

Enrichment curriculum metadata was also corrected on all eight screens in each lesson; this does not alter activities or grading.

No new media was fabricated or marked approved. New Philippine-context illustrations, authentic instrument recordings and instructional videos still require selection and review. Existing bundled visuals and electronic-tone recordings continue to work. Physical movement remains a teacher-observed assessment; the website does not detect performance. No headset/hardware test was performed.

## Local verification commands

Generate `.runtime/restoration/lessons.json` from the active lesson definitions (IDs 16–21, titles, package, slide IDs and activity configuration only; no student data). Then set `CORTEX_RESTORATION_FIXTURE` to its absolute path and run `npm.cmd run test:browser -- restored-lessons.spec.mjs` in `frontend`. This opt-in browser suite uses mocked transport with actual restored definitions; it does not write learner progress.

Restoration command: `python manage.py restore_career_enrichment --publication 300556 --backup-manifest .runtime/restoration/backup.json`.

Refinement command: `python manage.py refine_restored_lessons --publication 300556`. Both operations are transactional; refinement refuses to run without a recorded restoration and is idempotent.

Final verification after refinement: 77 Django tests passed across Career, Enrichment, historical creative compatibility and the other learning packages; 84 frontend unit tests passed; 27 browser tests passed (all 48 restored screens, unrelated workflow regressions, and two refined Career retry/save checks); production build passed. Existing large-bundle warning remains. Local backend health returned `ok` and Vite returned HTTP 200 at http://localhost:5173.

## Career asset reuse follow-up

Reused existing bundled illustrations on 14 active Career screens, covering missing instructional-step, sorting, matching and reflection images. Mapping: `web/career_asset_reuse.json`; applied only to Career definitions and Career previews. Existing images are preserved. General-purpose symbols support the accompanying text and do not claim to depict new workplace scenes. No new media or approval status was invented. A verified full backup precedes this update at `.runtime/restoration/before-career-assets.sqlite3`; previous activity configurations are retained in the `career_asset_reuse` audit. Complete learner evidence snapshots matched before and after.

The previous-version disclosure is now hidden from the package selection UI as requested. Archived records and authorized API access remain intact. New scene-specific illustrations and approved videos remain optional asset work; this change fills suitable illustration slots using the existing library.
