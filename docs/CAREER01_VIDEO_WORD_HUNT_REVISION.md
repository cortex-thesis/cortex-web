# CAREER-01 targeted revision — October 26, 2026

## Result

Published one new standard Cortex lesson version: **300037**, replacing current CAREER-01 **16** in the package listing. Exactly eight slides remain. No creative workspace, alternate player, or new lesson route was introduced.

- **Slide 2:** “Strengths: In the Words of Students,” using the user-selected YouTube URL `https://www.youtube.com/watch?v=WN3AnXRUmuc` and the existing instructional-video player. The exact requested introduction appears above the player. Three existing illustrations support the requested takeaways under **Lesson guidance**, including when playback fails. The guidance is not represented as quotations or verified video content. Existing controls, manual playback, pause handling, retry, and “Continue without video” remain.
- **Slide 6:** **Skill Word Hunt**, using the existing `word_search` activity. A 6×6 grid contains COOK, DRAW, GROW, and FIX across/down only. Each word has an existing food/drawing/gardening/repair illustration and a short meaning check. No timer was added. Keyboard, touch endpoints, existing dragging, reset, feedback, and completion handling are reused. It is supporting vocabulary practice, explicitly not evidence of personal ability.
- **Other six slides:** cloned from the live lesson without changing their configuration, illustration references, asset links, or delivery settings. Slide 5 remains unscored personal reflection. Official competency code/description and each slide’s existing official metadata are retained.

## History and coordination

Inspected Git status before editing; substantial existing work was present and retained. No Git push, pull, reset, stash, or commit was performed.

The original lesson had one practice-progress record, three learning sessions, and recorded slide exposure. The ordinary Career sync would replace activities in place, so it was not used to publish these changes.

`publish_career01_revision` creates one lesson with eight fresh slide/activity identities, clones class/student content assignments, and archives the previous lesson. It copies **no** progress, completion, response, session, or exposure records. It requires a reviewed source checksum, runs transactionally, supports a read-only dry run, and is idempotent. Positional Career sync now refuses an unsafe replacement of an existing CAREER-01 and retains an already-published revision.

The existing superseded-lesson audit contract preserves authorized access to old practice and session data. The student package screen’s historical disclosure stays hidden. Career listings use official competency order so the new CAREER-01 remains first despite its new database ID.

Live before/after serialization confirmed that every preexisting slide, activity, practice record, response, learning session, exposure, and other lesson was unchanged. Only the original lesson’s approved/archive status changed as required. The six retained slide configurations in the new version were compared directly with the old version. Backups: `.runtime/career01-before.json` and `.runtime/career01-evidence-before-publication.json`.

## Code changes

- `web/career01_revision.json`: the two shared replacements and user-provided video attribution/review status.
- `web/management/commands/publish_career01_revision.py`: single-lesson, checksum-guarded publication.
- `web/career_lessons.py`, `frontend/src/mocks/careerLessons.ts`: consume the shared replacement data for future seeding/previews.
- `web/management/commands/sync_career_lessons.py`: prevent positional replacement of existing CAREER-01 evidence identities.
- `web/views.py`: retain Career ordering and require meaningful evidence for the explicitly flagged new Word Hunt. Existing packages do not acquire that flag.
- `ActivityTemplate.tsx` / `.module.css`: optional, picture-supported lesson-guidance strip in the existing video component.
- `MiniGames.tsx`: optional “word” wording for meaning checks; existing sign activities keep their default wording and behavior.
- `types/index.ts`, `PracticeLesson.tsx`, `LiveEEG.tsx`: type/map the two optional display fields. No EEG processing, adaptation, or teacher-control logic changed.
- `web/test_career01_revision.py`, `frontend/browser-tests/career01-revision.spec.mjs`: publication, authorization, evidence validation, video integration, responsive Practice interaction and hidden-disclosure tests.

## Verification and limitations

- **93 frontend unit tests passed.**
- **16 browser checks passed** across the targeted revision and existing card/Enrichment suites, including the hidden previous-version disclosure.
- **3 targeted backend publication/history tests passed.** These verify fresh IDs, preserved historical records/active sessions, unchanged six slides and delivery settings, metadata, unscored reflection, authorization, no positional completion transfer, idempotence, dry run/stale-source refusal, Practice without hardware, optional-video continuation, and meaningful Word Hunt answers.
- Combined backend regression run: **65 of 67 passed** using existing system ML packages plus the project runtime. Two EEG integration tests errored because installed NumPy lacks `trapezoid`. The project virtual environment also lacks `joblib`; no dependency or EEG implementation changes were made to conceal these environment limits.
- TypeScript and targeted ESLint passed. Lesson configuration validation and local image-path checks passed. Local preview health returned OK after reloading the backend.
- Browser video checks deliberately use simulated YouTube events to test embedding, manual-play configuration, teacher pause signaling, unavailable-video fallback and continuation. Real YouTube streaming was not independently verified. The full video and transcript were **not independently reviewed**; its title/publisher and selection come from the user.
- Word Hunt browser checks cover keyboard and touch selection, invalid selections, meaning retries, completion gating, loaded illustrations and reset. Existing unit tests cover endpoint validation used by click and drag; physical drag gestures were not separately retested.
