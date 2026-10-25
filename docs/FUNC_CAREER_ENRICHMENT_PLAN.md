> Current status (2026-10-25): The creative redesign below is superseded. Original lesson IDs 16?21 are restored with one display-only refinement per lesson. See [CAREER_ENRICHMENT_RESTORATION.md](CAREER_ENRICHMENT_RESTORATION.md) for the active scope. Archived creative components remain only for saved historical versions.

# Functional Academics, Career, and Enrichment: review plan


## Career / Enrichment implementation update - 2026-10-25

The owner approved the creative redesign. The older audit below is retained as a historical planning snapshot; its Enrichment media/competency gaps are superseded by this update where noted. Functional Academics is outside this implementation.

- Canonical revised definitions: `web/creative_lessons.json`. Career has 6 / 7 / 7 screens; Enrichment has 7 / 8 / 8. The developer activity preview reads the same definitions.
- Verified against the official DepEd Order 021, s. 2020 curriculum tables: ENRICH-01 `TPEP-dt-NG-2`, printed page 71; ENRICH-02 `TPEP-mu-NG-2`, page 72; ENRICH-03 `TPEP-dc-NG-4`, page 74. The descriptions and source URL are stored with the definitions. Official source: https://www.deped.gov.ph/wp-content/uploads/2020/08/DO_s2020_021.pdf . Verification used the official document's indexed tables; direct binary retrieval returned an access error.
- Functional activities: skill collections with uncertainty/decline; Career Town and job stations; many-to-many skill connections; scene-changing work simulations and branching repair stories; ordered workdays; an editable SVG shape composition; real four-step electronic-tone composition/replay; sound comparisons; movement cue composition/replay; a manually selected movement wheel; saved-evidence showcases.
- Every journey works in Practice Mode. Existing Focus/Relax decisions, EEG classification/preprocessing, and teacher session control rules are unchanged. New playback is cancelled on pause, activity hide, navigation, regulation and unmount; in-session state is retained. Browser tests exercise a creative draft through the existing development-bypass regulation/return flow without generating EEG samples.
- A teacher records physical movement observations on the student learning profile. The authorized endpoint is `classes/<class_id>/students/<student_id>/movement-observations/`; records are append-only audit events. Learners cannot create teacher observations. Digital sequences and learner participation choices do not satisfy or overwrite a teacher observation.
- Collections read the signed-in learner's persisted Practice/session evidence within their enrolled class. Draft recovery uses account/context-scoped tab storage and is invalidated by version/configuration changes. UI confirmation says ready to save until the existing Next action succeeds.
- Publication: `python manage.py publish_creative_lessons --dry-run`, then `python manage.py publish_creative_lessons`. It creates fresh lesson/activity/slide IDs, archives prior lesson versions without rewriting their activities/responses, copies assignments, and stores snapshots in the audit log. Existing active sessions retain their old lesson reference. Learners with existing Practice progress can open previous versions from the package page. Other packages are untouched.
- Published to the configured app database on 2026-10-25: audit ID `300556`. Verification retained all 48 original slides, 7 responses, 4 Practice records and 6 session references; other package definitions were unchanged.
- Rollback: `python manage.py publish_creative_lessons --rollback PUBLICATION_AUDIT_ID`. New definitions and evidence are retained as history; prior versions are restored. Publication is serialized, transactional and idempotent. Changed definitions require an incremented content version. Positional legacy sync commands refuse to overwrite creative revisions.
- Missing media is intentional and visible: all six instructional videos await user-selected approved references; five recorded instrument samples await approval. Electronic composition tones are labelled as synthesized tones, not drum/piano/guitar recordings. New original SVG scenes/cues are interface illustrations, not approved real-life demonstrations. Additional teacher-reviewed movement demonstrations and localized narration/captions remain content work.
- Existing approved-on-file media must still be reviewed for its intended use. Existing echo WAVs are used only as electronic-tone patterns. No new external media URLs or movement-sensing claims were introduced.


Status: PLAN ONLY — awaiting approval before implementation.

Audit date: 2026-09-18. Inspected repository definitions, shared Supabase lesson rows, student players, task registry, media handling, adaptation, and existing asset references. No lesson definitions, shared data, or runtime behavior were changed for this task.

## Boundaries found during inspection

- FUNC-01 is everyday **communication**, not primarily environmental sign reading. Preserve help, needs, boundaries, greetings, appreciation, and apologies, with speech, pointing, AAC, or supported communication. An EXIT/OPEN word hunt would not adequately cover its actual objective.
- FUNC-02 is **recognition of coins/bills and notation**, not constructing totals, buying items, or calculating change. Do not adopt Build ₱20 or payment arithmetic as its assessed main activity.
- FUNC-03 includes **minutes, analog/digital representations, and a.m./p.m.**, not just whole hours. An analog clock alone cannot establish a.m. versus p.m.; use a written period or contextual example.
- ENRICH-01/02/03 have internal lesson IDs as competency codes, no exact competency text in their repository JSON, and blank shared `competency_description` fields. Their proposed activities below follow current instructional intent, **not a newly invented official competency**. Confirm the authoritative curriculum wording before finalizing assessment.
- User's ENRICHMENT-01 reference maps to existing internal ID ENRICH-01. Retain the internal IDs unless a separately reviewed migration is needed.
- All nine shared lessons currently have eight slides. None has a playable `media_url`. Four enrichment slides are typed as video but contain no source. Do not mistake those placeholders for working multimedia.

## Proposed mapping

| Lesson | Current learning objective | Current activity | Proposed main activity | Secondary activity | Video search term | Missing assets |
|---|---|---|---|---|---|---|
| FUNC-01 · Words I Use Every Day | TP_EFP-0lf-NG-1: Use words and expressions needed in everyday living | Four MC checks; help→thanks ordering; expression/conversation cards | Everyday Conversation Adventure: choose an expression/AAC card; the character responds and the scene changes | Guided request→receive→thank conversation; optional listen-to-expression support | everyday polite expressions asking for help greetings thank you for students | Drinking/needs scene; optional localized expression recordings; user video |
| FUNC-02 · Money Up to Twenty Pesos | TP_MFP-nv-NG-31: Recognize coins and bills up to Php20 and their notations | MC recognition, denomination/notation matching, find ₱10/₱20 | Money Recognition Desk: inspect one real currency image and place it into a labelled wallet pocket | Find the named denomination from 2–3 images; change the examples without counting money sets | Philippine coins and twenty peso bill recognition for students | Verified bill image(s) and any additional approved coin denominations; user video |
| FUNC-03 · Tell Time Using Clocks | TP_MFP-me-NG-2: Tell time in hours and minutes, including a.m. and p.m., using analog and digital clocks | Text-labelled analog matching; period sorting; MC digital/schedule checks | Set the Clock: manipulate/snapped hour/minute controls, including accessible increment buttons | My Day Clock: read a clock and assign it to an example routine; progress beyond whole hours | telling time analog digital minutes am pm for students | Accurate code-native clock face/hands; minute/period instruction; supplied video needs scope review |
| CAREER-01 · My Strengths and Skills | TP_CP-cp-NG-1: Identify their strengths, weaknesses, talents and skills | Category sorting; two unscored reflection selections; workplace check | Strength Collection: one activity card at a time; record can do / developing / want to explore; show a neutral collection | Show Me the Skill: image-driven example of organizing or following instructions | strengths developing skills talents self awareness for students | Following-steps scene; distinct organizing context; optional narration |
| CAREER-02 · My Skills and Possible Jobs | TP_CP-cp-NG-2: Match their strengths, talents and skills to possible exits or job opportunities | Yes/no, one-to-one matching, MC reasoning, multi-selection and reflection | Skill-to-Work Explorer: connect a skill to several plausible work/training contexts; reveal a task that explains each connection | Job Toolbox: pack relevant objects for a taught context, then explain the supporting skill | community work skills possible jobs gardening office kitchen tailoring | Distinct work-context illustrations; task/tool combinations validated by teacher |
| CAREER-03 · Helpful Attitudes at Work | TP_CP-cv-NG-1: Identify positive and negative attitudes towards career | Three MC decisions; asking-help yes/no; abstract effect matching; reflection | Workplace Story: short branches with visible consequences, retry, clarification, and cleanup | Build a Helpful Workday: arrange ready→listen→task→check→put away, with supportive behavior examples | helpful work habits responsibility cooperation asking for help students | Small reusable workplace scene; ready/listen/check/cleanup visuals |
| ENRICH-01 · Different Kinds of Talents and Skills | Exact official objective missing. Current intent: identify different talent/skill areas and explore interests without ranking them | Gallery cards; sort; yes/no; MC; unscored preference | Talent Explorer: tap a visual example to see a concrete creative/physical activity and a short explanation | My Talent Board: like / want to try, unscored; optional identify-the-activity check | different talents skills art music performing arts sports for students | Clear performing-arts example rather than a movie reel; existing ball can support sport illustration; approved examples |
| ENRICH-02 · My Music Skills | Exact official objective missing. Current intent: explore voice/instrument participation and reflect on music skills | Missing opening audio; two missing videos; text-pattern ordering; MC; unscored board | Make a Beat: 2–3 requested sound pads, record a short sequence, replay it; no performance grade | Copy My Rhythm: listen first, then tap a large pad with forgiving timing and unlimited replay | simple rhythm voice instrument music participation for students | Approved voice/instrument samples; pad visuals; short gentle sound sources; user video |
| ENRICH-03 · Move to the Beat | Exact official objective missing. Current intent: watch, practise, sequence, and perform approved/adapted movement | Safety yes/no; missing video; generic Movement 1/2/3 cards; ordering; performance placeholder; preference | Copy the Move: one demonstrated/adapted movement, learner-requested beat, learner/teacher progression | Predictable Stop-and-Go or short free movement, unscored and teacher-supported | gentle follow the beat seated standing adapted movement students | Approved movement set/demonstrations; rhythm clip; user video; teacher observation method |

## Existing learning sequences and assets

These describe the currently saved shared lessons, not proposed replacements.

- **FUNC-01:** assistance question → four expression stations → conversation models → thanks check → boundary check → greeting check → help/thanks order → wrap-up. Eight existing PNGs in `functional-academics/func-01` support help, hunger, boundaries, gratitude, and social interaction; most current question screens do not use contextual imagery. No lesson audio/video source.
- **FUNC-02:** money opening question → ₱5/₱10/₱20 gallery → notation model → matching → find ₱20 → find ₱10 → notation check → wrap-up. Existing ₱5 PNG, ₱10 JPG, and ₱20 coin PNG are borrowed from LIFE-03. Files exist, but presence alone does not establish currency accuracy. Matching currently also attaches images to some notation-side cards. No bill source or lesson audio/video.
- **FUNC-03:** morning-time check → digital instruction → hand instruction → analog/digital match → written-period sorting → digital check → schedule check → wrap-up. No clock imagery in current shared definitions: analog representations are text labels. No audio/video source.
- **CAREER-01:** goal → profile categories → strength/support model → classification → can-do reflection → developing reflection → workplaces check → wrap-up. Existing organizing, computer, gardening, food, repair, drawing, and customer-service PNGs. No lesson narration/video source.
- **CAREER-02:** one-skill/many-jobs opening → garden opportunity model → skill/work matching → reasoning → multiple computer contexts → personal exploration → generalization → wrap-up. Existing organizing, computer, food, tailoring, and gardening PNGs. Distinct workplace illustrations remain sparse. No audio/video source.
- **CAREER-03:** readiness decision → attitudes list → asking-help check → difficult task → mistake → behavior/effect match → reflection → wrap-up. Currently referenced images are ask-for-help and complete-task; most abstract behavior cards have no image. No audio/video source.
- **ENRICH-01:** gallery → talent areas → examples → sort → combined-skills check → music identification → interests → wrap-up. Music, drawing, handicrafts, skills, movie-reel, and ball assets exist. A movie reel is not a clear demonstration of acting/dancing. No video source.
- **ENRICH-02:** missing audio opening → music ways → missing voice video → missing instrument video → text rhythm order → singing check → unscored music board → wrap-up. Music PNG only; no playable instructional audio, instrument sample, or video. Existing generic feedback/BGM files are not instrument-identification evidence.
- **ENRICH-03:** readiness → missing full demonstration → generic movement breakdown → mirror instructions → generic movement order → missing performance video → preference → wrap-up. No configured movement images/audio/video. A text statement that the teacher confirms readiness is not an authenticated teacher observation record.

## Per-lesson implementation rationale

### FUNC-01 — communication in context

1. **Learn:** use expressions that match needs, boundaries, and social responses.
2. **Watch/listen:** user-selected conversation demonstration; optional requested narration in the approved learner language.
3. **Do:** help a character ask for materials, receive assistance, and express thanks; practise a boundary in another short scene.
4. **Fit:** using an expression creates a visible response; recognition alone does not claim independent spoken-language ability.
5. **Assets:** reuse existing help/gratitude/boundary art; add a needs/drinking context and optional recordings.
6. **Reuse:** `DiscussionCards`, `AudioNarration`, `ScenarioClassifier`'s step/retry mechanics, tap/drag accessibility, student navigation.
7. **New:** contextual dialogue/scene renderer and complete dialogue evidence validation; AAC-compatible response cards.

### FUNC-02 — recognize, do not calculate

1. **Learn:** identify approved Philippine coins/bills and their written values up to Php20.
2. **Watch/listen:** user-selected Philippine-currency recognition demonstration; requested denomination audio if approved.
3. **Do:** inspect one image and place it in the corresponding wallet pocket; then find a requested denomination.
4. **Fit:** the wallet supplies a practical setting without assessing sums, purchase power, or change.
5. **Assets:** verify existing coin images; add teacher-approved bill images and approved denomination coverage. No generated fake currency.
6. **Reuse:** `ItemVisual`, find-item logic, drag/tap placement and matching validation foundations; not the transaction-scoring `Shopping` task.
7. **New:** one-at-a-time wallet/recognition renderer and response contract; visually separate image choices from notation destinations.

### FUNC-03 — manipulate real clock representations

1. **Learn:** hours/minutes, analog/digital correspondence, and written/contextual a.m./p.m.
2. **Watch/listen:** supplied whole-hour video as an introductory segment, not coverage of the full competency.
3. **Do:** set a forgiving clock, read selected minute examples, and place a time into an explicitly labelled example schedule.
4. **Fit:** hands visibly respond; minute and period checks retain the actual objective. Routines are examples, not universal student schedules.
5. **Assets:** accurate SVG/canvas clock graphics with accessible text; reuse meal/get-ready artwork where appropriate.
6. **Reuse:** lesson navigation, visual cards, contextual routine imagery, tap/drag interaction conventions.
7. **New:** clock rendering, hand-angle/time calculation, snap/increment controls, staged levels, and server-side time validation.

### CAREER-01 — a neutral strength collection

1. **Learn:** distinguish demonstrated strengths, developing skills, interests, and areas to explore without deficit labels.
2. **Watch/listen:** supplied strengths video, subject to language/age/accessibility review; requested short explanation.
3. **Do:** respond to one skill card, see a collection grow, and identify a skill shown in another person's example.
4. **Fit:** reflection has no wrong answer; concept identification is separate from personal ability. No EEG-based aptitude claims.
5. **Assets:** existing positive skill art plus concrete following-steps/organizing scenes.
6. **Reuse:** `DiscoveryBoard` self-report fields/restoration, `picture_choice`, `DiscussionCards`, and narration.
7. **New:** compact one-card collection presentation and summary; no clinical score or job prescription.

### CAREER-02 — multiple possible pathways

1. **Learn:** connect strengths/talents/skills to plausible work or training opportunities.
2. **Watch/listen:** supplied career-path video as a candidate; its broad career-selection topic may need a short excerpt or a more concrete replacement.
3. **Do:** connect one skill to multiple contexts; reveal why it is useful; pack objects for one introduced context.
4. **Fit:** toolbox actions must explain the skill/context link, not turn this into a standalone tool-identification lesson.
5. **Assets:** reuse plant-care, food, computer, tailoring art; add distinct workplace backgrounds where needed.
6. **Reuse:** matching/multiple-selection validation, `DiscoveryBoard`, and `GardenKit` transfer/checkpoint mechanics after generalizing garden-only labels.
7. **New:** multi-link context renderer and task examples; generic work-kit labels/destinations. Never output “you should become…” or guarantee employment.

### CAREER-03 — choices with consequences

1. **Learn:** recognize helpful/unhelpful career attitudes through concrete behavior and effects.
2. **Watch/listen:** supplied positive-work-attitude video, pending full review.
3. **Do:** make a short story choice, see a practical result, request clarification, correct a mistake, and put materials away.
4. **Fit:** outcomes demonstrate responsibility/cooperation; needing help, disability-related accommodations, or a single mistake are not labelled negative attitudes.
5. **Assets:** reusable workplace background and small action illustrations, including existing help/complete-task art.
6. **Reuse:** `ScenarioClassifier` retries/progression and `sequence_order`; supportive reflection handling.
7. **New:** actual branching scene state/consequence display and complete-path validation; current classifier alone is not a branching simulation.

### ENRICH-01 — explore without ranking

1. **Learn:** current lesson's taught talent/skill areas; confirm official wording before assessment changes.
2. **Watch/listen:** supplied Understanding Talent candidate, then optional requested gallery narration.
3. **Do:** explore art/music/performance/sport examples and create a like/want-to-try board.
4. **Fit:** concrete participation and preferences, not a talent test; no area is ranked above another.
5. **Assets:** reuse art/music/handicrafts/ball; obtain a clear approved performing-arts scene.
6. **Reuse:** `DiscussionCards`, `DiscoveryBoard`'s unscored structured reflections, `picture_choice`, narration.
7. **New:** interactive gallery reveal presentation; adapted personal-board summary.

### ENRICH-02 — hear and create

1. **Learn:** current voice/instrument/participation intent; official music competency still needs confirmation.
2. **Watch/listen:** user video remains pending; approved voice/instrument examples plus requested gentle pad sounds.
3. **Do:** create and replay a tiny beat; copy a short auditory pattern with forgiving input and replay.
4. **Fit:** actual requested sound replaces text-only music teaching. Count/pattern practice is not a verified talent or proficiency measure.
5. **Assets:** short safe, licensed/approved sound sources, pad icons, demonstrations, and video. Synthesized pads may support creation but must not pretend to be recorded instruments for sound identification.
6. **Reuse:** `AudioSequence` playback/readiness patterns, lesson media controls, volume/fade foundations, structured self-report board.
7. **New:** shared cancellable audio controller, beat recording/replay, rhythm-copy input and tolerance, timer cleanup. No microphone detection.

### ENRICH-03 — supported physical participation

1. **Learn:** current watch/practise/sequence/perform intent; confirm official movement competency and accessible movement set.
2. **Watch/listen:** approved whole-sequence and single-move demonstrations; requested slow beat; user video pending.
3. **Do:** physically copy an appropriate seated/standing movement; pause/replay; learner or teacher advances. Optional gentle stop/go or creative movement.
4. **Fit:** performance takes place away from the mouse; progress is participation/self-report unless a teacher actually records observation. No camera, pose, or automatic movement verification claims.
5. **Assets:** approved move examples, adapted alternatives, rhythm source, and explicit observation criteria/process.
6. **Reuse:** instructional video, `sequence_order` after real movement cards exist, reflection, teacher pause/override and Ready to Continue.
7. **New:** movement prompt controller, predictable play/pause sequencing, observation/participation checkpoint that is not a simulated video player. Preserve teacher override; movement artifacts must not be interpreted as objective attention evidence.

## Delivery and completion audit: common to all nine

- **Focus/practice:** `PracticeLesson` and `LiveEEG` render `TaskCard` and the same task registry. Visited React `Activity` instances are hidden rather than discarded during normal navigation; local interaction state can survive going back and mode changes within the mounted session.
- **Adaptation:** Functional/Career configurations attach `ADAPTATION_POLICY`; enrichment JSON does not carry that policy. Shared runtime adaptation still exists, but adding config alone does not implement specialized activities.
- **Distracted:** current support includes anchor words, sentence chunking, small recall/reveal gates, and a separate generic refocus deck. That deck is not lesson-specific. Proposed change: pass a small context cue (help expression, denomination, clock, work behavior, or quiet talent card), 1–3 actions, then Ready to Continue. Audio-based refocus is opt-in, not appropriate during overstimulation.
- **Relax/overstimulated:** runtime can queue a separate regulation break after a successful Next save, and offers a pause action. It is not currently a universal immediate stop of every possible audio generator. YouTube handles `cortex:pause-media`; some native media pause on Activity effect cleanup, but there is no centralized controller for new generated/queued enrichment sounds. P0 must cancel all enrichment playback/timers and block starts on pause, hide, Relax, teacher pause, or unmount without requiring slide completion.
- **Audio comfort:** BGM has a visible volume feature and fades/ducks, with suspension for current media types. New audio tasks must explicitly suspend BGM and participate in cancellation. Feedback sounds and narration also need quiet/self-report treatment; do not reuse generic success/incorrect effects as music content.
- **Ready to Continue:** existing regulation switches to a separate ready screen; resume sets returning mode without resetting `position`. Preserve this plus the exact partial task state. In-session React retention is not equivalent to persistent checkpoints: current tab-scoped garden checkpoint keys apply only to livelihood. New activities need scoped checkpoint support and tests if refresh restoration is required.
- **Completion:** Next is gated by task callbacks; practice stores evidence/completed IDs in Supabase and live sessions save responses/exposure. YouTube currently unlocks at 50% progress or explicit external-watch confirmation; native media generally unlocks on ended. Neither is objective proof of learning/performance. Missing video currently renders a pretend play toggle; a safe explicit teacher-guided fallback must replace this for new content.
- **Video placeholders:** plan `media_url: null`, `video_reference_status: 'TODO_YOUTUBE_VIDEO'`, and an explicit optional/fallback flag supported by the player. Never put `TODO_YOUTUBE_VIDEO` into a real URL field. Development previews may show an editor placeholder; students get a calm teacher-guided alternative, not a fake player, playback error, or deadlocked Next.
- **Unscored evidence:** existing picture reflections and `scored: false` sorting support neutral completion, but enrichment has no consistent `evidence_role`. Add explicit self-report/participation roles so comfort feedback and reports cannot silently grade preferences or physical ability.

## Implementation priorities

### P0 — required before UAT

1. Approve mapping; confirm official enrichment objectives and safe movement examples; verify denomination assets.
2. Add one properly configured video learning slot per lesson after concise discussion and before main practice. Use supplied references only after review; retain safe placeholders for four missing references.
3. Correct the largest functional gaps: actual clock graphics/controls; contextual expression use; recognition-only money interactions; genuine requested enrichment audio; no fake video/performance controls.
4. Implement reliable audio/video stop and BGM suspension during pause/Relax; retain partial task state and exact position on return.
5. Use scoped per-lesson/package sync/versioning with backups and fresh IDs for semantically replaced activities. **Do not run `sync_integrated_lessons` for this work:** it also rewrites CARE/LIFE/PREV/LIVE.
6. Test drag/tap/keyboard alternatives, retries/reset, accurate evidence, neutral reflection, media missing/blocked, save failures, back navigation, teacher pause, and intervention/resume. Keep current objective metadata and historical evidence.
7. Share code-native/bundled assets through the repo/deployment; store newly uploaded private assets through Supabase with stable approved references and authorized preview access. Shared DB alone cannot distribute unpushed frontend code.

### P1 — strongly recommended

- Add the career multi-context explorer/branching consequences and enrichment personalized board/beat replay polish.
- Add approved localized requested narration/captions and accessible movement alternatives.
- Test the complete flow with two real student/teacher devices, target browsers, and the shared database; verify response latency and comfortable sound levels.

### P2 — can wait

- Extra scenery, more scenarios/sound banks, optional advanced rhythms, and additional clock levels beyond the agreed UAT subset.
- Avoid flashy effects, timers, leaderboards, automatic talent/career classification, or unimplemented sensing.

## Suggested implementation order after approval

1. FUNC-03: real clock visuals and whole-hour→minute progression using the supplied intro video.
2. FUNC-01/02: dialogue adventure and currency recognition desk.
3. CAREER-01→02→03: collection, multiple pathways, branching story.
4. ENRICH-01, then ENRICH-02/03 after approved objectives/audio/movement assets.

Replace existing generic slots rather than indefinitely adding screens. Keep compact goal/discussion/video/practice/application/wrap-up pacing; don't force one fixed slide count.

Review checkpoints: [video plan](VIDEO_REFERENCE_PLAN.md), [asset checklist](CONTENT_ASSET_CHECKLIST.md). The preceding implementation-approval restriction was superseded by the owner approval recorded in the update above.
