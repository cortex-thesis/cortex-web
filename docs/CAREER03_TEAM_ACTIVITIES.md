# CAREER-03 practical activities and text-only matching

## Follow-up review — October 26, 2026

Re-inspected the working tree and live lesson before editing. Active lesson 300038 already contained the requested slide 4 sorting and slide 5 sequencing, with no practice/session/response records on that version. Earlier versions retain saved evidence. The remaining changes were slide 5's exact requested retry message and visible guidance that this sequence applies to this situation; other workplace problems may need a different order.

Published `career03-team-sorting-sequence-v2` as lesson **300039** using the existing checksum-guarded publisher. No old activity was edited or reused. All preexisting activities, slides, responses, practice records, sessions, exposure records and unrelated lessons were serialized before and compared after publication; only lesson 300038's archive status changed. The other six configurations, official metadata and unscored reflection were compared and preserved. CAREER-01 was unchanged. Snapshot: `.runtime/career03-v2-before.json`. No completion was copied. Existing authorized history access and hidden student previous-version disclosure remain unchanged.

Verification: 93 frontend tests, 40 backend regression tests, two additional backend tests after tightening the wording assertions, TypeScript, and 20 desktop/mobile browser checks. Browser coverage includes incorrect/correct sorting, retry, real drag sorting, incorrect/correct sequencing, reset, drag reordering, keyboard completion for both activities, mobile taps and no horizontal overflow, CAREER-01 video/Word Hunt/player behavior, and Enrichment navigation. These use standard Practice Mode without EEG hardware. No EEG processing or adaptation code changed. Hardware-dependent EEG behavior was not exercised.

The same three existing supporting illustrations listed below are reused with readable labels and honest supporting-illustration alt text. No new media or approval claims were added; exact barangay-event scenes remain an asset limitation.

## Changes

- The shared two-column `matching_pairs` renderer now omits topic illustrations on **both** prompts and choices, regardless of whether the stored content includes images. Text labels always remain visible. Pair IDs, answer validation, shuffling, feedback and completion behavior are unchanged.
- Draggable sources retain the neutral six-dot `GripVertical` handle at 18px. Removed the small-screen rule that hid it. Sorting, sequencing and flip-card pictures are unaffected.
- CAREER-03 slide 4 is now **Help the Team Get Ready**: the four requested actions are sorted into **Helps the team** / **Needs a different response**, using existing drag/tap sorting. Feedback explains how communication and checking help the team; it does not judge the person.
- Slide 5 is now **Oops! What Happens Next?**: three illustrated steps are sequenced as **tell → ask → correct**. The option cards are initially presented out of order. Existing reset, tap selection, dragging, checking and retry are reused. Completion feedback is the requested message about mistakes, communicating and asking for help.
- Added server-side validation for these explicitly evidence-required sorting/sequencing activities. Empty, partial, incorrect or extra-item submissions cannot complete them, even if a client sends `correct: true`. Existing unflagged activities keep their behavior.

## History protection

The existing CAREER-03 lesson **18** had saved practice, session, response and exposure records, including responses on both replaced slides. Published the standard eight-slide revision as **300038**, with fresh slide/activity identities. Retained the six other slide configurations, official competency metadata, delivery settings and unscored slide 7 reflection.

The existing single-lesson publisher was made configurable and reused for CAREER-03 through a small command subclass. Publication is transactional, checksum-guarded, dry-run capable and idempotent. The normal positional sync now protects both versioned Career lessons. Historical authorization continues through the existing history contract; student previous-version disclosure stays hidden. No progress is copied by position or otherwise.

Live before/after serialization confirmed every preexisting slide, activity, response, practice record, session, exposure record and other lesson—including CAREER-01—remained unchanged. Only the original CAREER-03 lesson's archive status changed. Backups are retained under `.runtime/career03-before.json` and `.runtime/career03-evidence-before-publication.json`.

## Assets

Reused the existing checklist (`/assets/livelihood/common/checklist.png`), asking-for-help (`/assets/functional-academics/func-01/ask-for-help.png`) and organizing (`/assets/pre-vocational/common/organizing.png`) illustrations as supporting cues. These are not presented as exact event scenes. The checklist includes a plant symbol; precise barangay supply-packing, reporting/leaving and box-label correction scenes remain an artwork requirement. No new illustrations were fabricated.

## Verification

- **93 frontend unit tests passed**, including matching with images in the data and `hideImageLabels` enabled: topic images are absent and labels still function.
- **40 backend tests passed**, covering both Career publishers, history preservation, metadata, fresh IDs, scoped validation and existing lesson/game/Enrichment contracts.
- **19 browser checks passed** at desktop/mobile sizes, including real desktop matching drag, mobile matching tap, visible drag handles, absent matching images, sorting retry, sequencing reset/correct order, CAREER-01 video/Word Hunt/history disclosure and Enrichment navigation/completion.
- TypeScript, targeted ESLint and diff whitespace checks passed. Reviewed desktop/mobile screenshots of matching, sorting and sequencing.
- Reloaded the local backend preview and confirmed its health endpoint returned OK. No Git push, pull, reset or commit was performed.

Shared replacement data: `web/career03_revision.json`. Publication command: `publish_career03_revision --source-lesson ID --dry-run`, then the same command with `--expected-source-sha256` from the reviewed dry run.
