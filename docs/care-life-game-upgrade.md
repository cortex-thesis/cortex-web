# CARE / LIFE practice upgrade

## Scope and preservation

Only CARE-01–03 and LIFE-01–03 practice content was upgraded. Official titles, competency codes, videos, existing audio readings, instructional slides and completion images are retained. The 54 slide positions/purposes are unchanged, allowing sync to update existing activities in place rather than replacing IDs or duplicating lessons. Previously completed slides remain completed; students can replay to see the upgraded games.

The live database audit preserved 6 lesson IDs, 54 slide/activity IDs and 6 practice-progress records. No lessons, answers or saved progress were deleted. Local migration also applied the previously pending teacher-led/session-completion migrations 0020 and 0021 before the new additive migration 0022.

## Reusable components and changed files

- `frontend/src/components/molecules/TaskInteraction/MiniGames.tsx` and `.module.css`: Find It, Word Search, Audio Sequence, Shopping, shared object paging, system-colored controls, feedback and existing/native symbols.
- `frontend/src/lib/miniGameLogic.ts`: selection/endpoint logic with tests.
- `TaskInteraction.tsx` / `.module.css`: renderer integration, illustrated sequencing in both tray and selected routine, image/image matching, immediate sorting feedback, per-selected-choice correctness and matched check marks.
- `TaskCard.tsx` / `.module.css`: reset callback, adaptive cues, quiet feedback and reduced animation.
- `frontend/src/constants/activityTemplates.ts`, `frontend/src/types/index.ts`: generic template registry/types.
- `frontend/src/pages/student/PracticeLesson.tsx`, `LiveEEG.tsx`: configuration mapping, reset invalidation, Practice response capture, EEG presentation strategy.
- `web/lesson_games.py`, `care_lessons.py`, `life_lessons.py`: scoped content upgrades before existing asset linking.
- `web/game_validation.py`, `activity_templates.py`: validation and new-game response verification independent of EEG.
- `web/models.py`, `web/migrations/0022_practice_activity_evidence.py`, `web/views.py`: separate Practice evidence and supporting/primary response classification.
- `web/test_lesson_games.py`, `web/test_life_lessons.py`, `frontend/tests/mini-games.test.mjs`: contract, persistence, handler and renderer tests.
- `scripts/verify_lesson_game_sync.py`: additive migration/scoped sync audit.

No new dependencies, external assets or generated currency artwork were introduced. Existing real Philippine coin PNGs are reused.

## Activity distribution (one-based slide numbers)

| Lesson | Changed practice |
| --- | --- |
| CARE-01 | 2 Handwashing Word Hunt; 3 Get Ready to Wash (Find It); 6 Build the Routine (illustrated ordering); 7 What Comes Next (pictures). Slide 8 retains the everyday application decision. |
| CARE-02 | 5 Flip and Match Foods (face-down picture/definition cards); 6 healthful/less-healthful sort (immediate feedback); 7 Healthy Food Word Hunt; 8 Pack a Healthful Lunch; 9 Choose a Drink. |
| CARE-03 | 2 What Tool Do I Need (hair scenario); 6 Match the Tool; 7 Grooming Word Hunt; 8 existing tooth-brushing tool-recognition simulation; 9 Pack the Grooming Kit. The original modeling slide 5 is retained. |
| LIFE-01 | 5 Listen, Remember, Do (2 story rounds); 6 Unlock the Code (3 rounds, unchanged); 7 Classroom Stories (3 story rounds). |
| LIFE-02 | 4 Safety Word Hunt with STOP/EXIT meaning follow-ups; 5 Match Signs to Meanings; 6–7 existing sign-image safe-action decisions retained. |
| LIFE-03 | 1 Cortex Mini Store; 5 exact-price/payment matching; 6 Buy What You Need; 8 Check Your Change. Tag-price and model illustrations remain. |

Find It uses simple labeled visual workspaces (wash area, lunchbox, grooming bag), not a newly drawn realistic scene. Learners tap objects, then check their selection. Lunch accepts any two or more suitable choices; it does not require one perfect meal. Unpicked correct answers are not highlighted after an incorrect response.

## Exact word hunts and keys

All puzzles use deterministic 8×8 uppercase grids. Words occupy varied rows/columns, horizontal/vertical and forward/reversed paths, among ordinary alphabet filler. Each target stores explicit contiguous answer cells. Generation and tests scan all four directions for duplicate target occurrences. Choice lists are deterministically mixed per slide, without changing answer keys or reshuffling during retries/EEG transitions. Matching right-hand tiles are separately mixed with no corresponding left/right row matches.

| Lesson | Targets (paths stored in configuration) |
| --- | --- |
| CARE-01 | SOAP, WATER, RINSE, DRY |
| CARE-02 | RICE, FISH, EGG, MILK, MANGO |
| CARE-03 | COMB, TOWEL, BRUSH (explicitly labeled toothbrush; toothbrush image revealed after finding it) |
| LIFE-02 | STOP, EXIT, WALK, SAFE |

LIFE-02 STOP follow-up: “What does this sign tell you?” → **Stop before proceeding**. EXIT: “What is this sign showing us?” → **Way out during an emergency**. Word finding alone does not complete these two targets; successful responses include the meaning answers.

No LIFE-01 word hunt was added: its core tasks use pictures/symbols so reading does not confound following spoken directions.

## Exact LIFE-01 spoken directions and answer keys

Directions use browser speech (`en-PH`, rate 0.85) on a deliberate Listen click, not autoplay. A round can optionally specify an `audio_url` later. Object buttons are disabled until playback finishes; speech failure shows a retry message and offers an explicitly requested visual prompt. No complete sequence is printed by default. A learner-requested visual prompt is identified as supported practice, not independent auditory evidence.

| Task / round | Spoken direction | Key (item IDs) |
| --- | --- | --- |
| Listen, Remember, Do 1 | Mia wants to write in her notebook, but it is still closed. Once it is open, she needs something to write with. Which two things will she use, in order? | notebook → pencil |
| Listen, Remember, Do 2 | Leo made a mistake in his drawing. He wants to remove the mark, draw a straight line, and put his work away for the trip home. Which three things will help him, in order? | eraser → ruler → bag |
| Unlock the Code 1 | Listen to the secret code. Star, circle. | star → circle |
| Unlock the Code 2 | Listen carefully. Green, star, three. | green → star → three |
| Unlock the Code 3 | Your code is: triangle, two, blue. | triangle → two → blue |
| Classroom Stories 1 | Ana needs to check the time before reading a story. Which object shows the time, and which one holds the story? Choose them in that order. | clock → book |
| Classroom Stories 2 | Ben keeps his drawing paper in the blue folder. He takes it out, measures a line, and packs up to go home. Which three objects does he need, in order? | blue-folder → ruler → bag |
| Classroom Stories 3 | Sara wants to write a note and carry it home. First she opens the place where she writes her notes. Next she gets something to write with. Finally she packs her work. Which three objects does she need, in order? | notebook → pencil → bag |

Each round records picked IDs, replay count, requested visual-prompt use, whether audio was played, and `completion_support`: `without_replay`, `after_replay` or `with_visual_prompt`. These labels describe support use, never learner ability. Retry/reset never creates a penalty or changes the key. Existing LIFE-01 modeling MP3 and drawing video are preserved.

## Other keys and feedback

- CARE-01 Find It: water, soap, clean drying material; distractors pencil, comb, toothbrush. Routine: wet → soap → rub → rinse → dry. Next step after soap: rub. Correct: “Yes. Rub the soap over your hands before rinsing.” Retry: “Think about what happens between applying soap and rinsing.”
- CARE-02 picture/definition matching: rice → Go/energy; egg → Grow/build and maintain body; banana → Glow/fruits and vegetables keep body healthy. Supporting only. Primary food sort preserves the existing approved key: rice/fish/vegetables/water → more often; hot dog/packaged salty snack/fast-food meal/fried chicken → less often. Lunch valid set: rice, egg, banana, water (any two or more, no distractors). Drink: water. Lunch retry: “Look again. Which choices better support a healthful lunch?”
- CARE-03 kit: comb, toothbrush, nail clipper, towel; distractors pencil/book. Matching preserves toothbrush → clean teeth, comb → arrange hair, clipper → trim nails, towel → dry after washing. Hair scenario key is comb; existing brush simulation key remains toothbrush. Kit retry: “Think about which items care for hair, teeth, nails, and drying.”
- LIFE-02 matching: Emergency Exit → way to leave during an emergency; No Entry → do not enter; Pedestrian Crossing → designated place to cross; Stop → stop before proceeding. Existing Wet Floor and crossing scenarios retain their safe-action keys. Matching retry: “Look at the sign again. What is it telling you?”
- LIFE-03 store prices (simulated): boxed classroom item ₱15, pencil ₱8, water ₱10, banana ₱12. All sufficient offered payments are accepted; expected change is always chosen payment minus price. Mini Store target: boxed item, typical ₱20 payment, ₱5 received → Yes. Pencil mission: typical ₱10 payment, ₱2 received → Yes; ₱20 payment also accepted, with ₱12 change. Banana check: ₱20 payment, ₱3 received → No, then ₱8 correct change. Exact-payment matching: ₱1/₱5/₱10/₱20 to corresponding currency images. Tag price remains ₱10. Existing “drink ₱12, pay ₱20, receive ₱5” check remains No. Shopping retry: “Check the price and the amount paid again.”

Word hunts default correct feedback: “You completed the activity.” Retry invalid lines: “Try another line of letters.” LIFE-01 correct: “You followed the steps in order.” / “Code unlocked!” / “You listened, remembered, and followed all the steps.” Retry: “Try again. Remember what you heard first.” / “Not quite. Listen to the code again.”

Sound effects reuse existing files; intermediate successful matches/sorts/game stages sound once, final completion uses the existing parent callback. Overstimulated presentation suppresses nonessential new-game feedback sounds. Auditory directions remain available because they are essential instruction.

## Adaptation and accessibility

Focused: full workspace and normal controls. Distracted: current instruction emphasized; Find It/audio/shop workspaces show groups of four objects with explicit paging. Relaxed: normal activity with existing gentle pacing/cue, not an automatic Relax Mode switch. Overstimulated: animation/transitions removed, nonessential new-game sounds suppressed, Find It/audio/shop workspaces show two objects at a time. All objects remain available through paging; no target, answer or academic objective is removed or changed. Word grids and targets remain fixed across states. Sorting, matching and sequencing retain the same keys and use existing presentation behavior.

Live EEG still uses the existing regulation/return flow. Teacher manual mode overrides are unchanged; a teacher-held focus activity receives the current presentation strategy without changing its content. No new timer, lives, flashing animation, streaks or punishment.

Buttons support mouse/touch/keyboard activation, visible focus, minimum 44px height (38px letter height only on extremely narrow screens), and text/check/retry indicators in addition to colors. Word search supports pointer drag or tapping first/last letter; keyboard users activate the same endpoints. Object paging preserves selected IDs. Reset invalidates the local Next gate; existing persisted completed-slide IDs are not erased. React Activity retains in-session interaction state on previous/next navigation; unfinished game selections are not persisted across browser reloads.

## Evidence and schema

Additive migration 0022 adds `LessonPracticeProgress.activity_evidence` (JSON, default `{}`). No existing fields or records are removed. Practice saves successful response/support information with the slide-completion POST. New game responses are verified server-side; legacy requests without response evidence remain compatible.

EEG `ActivityResponse.response` records `evidence_role`, `practice_correct` and `digital_mastery_claim: false` for upgraded tasks. Supporting game responses set `is_correct` to null, so they are not counted as primary correct answers. Digital step completion remains distinct from primary correctness and never creates a mastery flag. Legacy unrelated responses retain their prior shape.

CARE-01 still requires teacher-observed real handwashing; its final slide and assessment metadata retain this requirement. There was no dedicated physical-performance sign-off UI in the inspected system, and this upgrade does not pretend that digital completion is that sign-off. CARE-03 recognizes grooming materials, not real grooming performance. LIFE-03 shopping success is evidence of a simulated transaction, not proof of independent real-world purchasing.

## Assets / remaining work / validation questions

Existing PNGs and approved real coin photographs are reused. Native classroom symbols from the already-installed icon library stand in for notebook, bag, eraser, ruler, clock and red/blue folders. Upload replacement PNGs for those if a photo/illustration-only style is preferred. There is no notebook PNG: the Mini Store accurately calls the existing generic product illustration a **boxed classroom item** rather than mislabeling it a notebook.

Still useful: eight recorded LIFE-01 direction clips (scripts above), notebook/store-item PNG, sink/lunchbox/grooming-bag/store/community scene illustrations. No random internet art was added. Browser speech quality/availability and `en-PH` voice selection vary by device; recordings will provide consistency.

Not added: a standalone realistic safety-sign scene hunt (word hunt with meaning checks plus matching/safety decisions is the reusable substitute), a LIFE-01 reading-based puzzle, a separate additional food hunt duplicating primary food sorting, diagonal word selection, or durable partial-game progress on reload. No dedicated teacher physical-performance sign-off UI or new mastery algorithm was introduced.

SPED/Panorama validation should confirm supporting word hunts are suitable for the learners, Go/Grow/Glow examples and fried/mixed-food wording match the approved instruction, whether optional visual prompts are sufficient for supported auditory practice, acceptable number of objects/replay prompts, and simulated price ranges. Supporting-game completion is not primary mastery evidence.

## Verification

Follow-up UI revision: found word cells have persistent green fill/border with full opacity, and target boxes show a check and Found badge. Listening has an in-place retry that keeps the current round ready, preserves previous rounds and makes replay optional. Practice and EEG hide their remounting retry button for these locally retryable games. Reusable `FlipMatching` handles the existing `memory_flip` template: hidden mixed cards, picture/definition pairs, successful-pair sounds, permanent face-up matched cards, learner-controlled mismatch dismissal (no timer), and reset. CARE-02 slide 5 uses this template. Added handler tests cover found cells, retry without replay, flip-card mismatch/completion/reset.

Targeted Django run: 36 tests passed. Frontend: 23 tests passed, covering renderer initialization, endpoint selection/reverse paths, invalid/duplicate choices, retries/reset, playback completion gate, replay/prompt evidence, shopping stages/payment/change, reduced-presentation paging, existing EEG transitions, API and focus-performance logic. Build/typecheck and lint passed (build retains a large-bundle warning). Final sync preserved six lesson IDs, 54 slide/activity IDs and six practice-progress records.

The full Django run executed 122 tests and reported two issues: `web.test_eeg_storage` could not import the missing `duckdb` dependency, and a repository workflow test had a stale hard-coded count of 13 task templates (the expanded registry has 18). The count assertion was changed to compare catalog IDs with the task registry; its separate rerun passed. The full suite is not a clean pass; no dependency installation or unrelated EEG-storage changes were made.

Browser screenshot/touch/device audio verification remains needed: the browser automation helper failed twice with `failed to write kernel assets: The system cannot find the path specified`. Handler tests simulate interaction and speech events; they do not prove audible playback on the student's device. Final test totals and any full-suite issues are reported in the handoff.
