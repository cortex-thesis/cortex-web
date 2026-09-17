# PREV-01 Discovery Studio — implementation report

## Outcome and preservation

Update: the subsequent [PREV workflow refresh](prev02-workflow-refresh.md) supersedes the original 18-screen delivery below. Students now see nine core screens; the other nine are retained in storage as optional review to preserve IDs and historical evidence.

PREV-01 only is redesigned from 8 to 18 screens. Existing problems: skill/capability conflation, minimal talent teaching, abrupt definition/quiz flow, no usable narration/video, no overlapping personal discovery board, and red styling on valid self-reflection choices. The new progression is teaching → interest exploration → concept practice → optional video/reflection → fictional model → discovery board → scenarios → knowledge check → personal reflection → summary/completion. No career/aptitude/personality inference is generated.

Lesson 7 and its eight existing slide/activity IDs are retained by stable screen keys. The original eight identities map to orientation, concepts, story, classification, interests, board, knowledge, summary. Positions change intentionally; ten new slides are added. All 11 existing practice-progress records and their completion/evidence values were preserved; 142 unrelated slides were unchanged. A previously complete lesson may now have new screens to finish, but old completed slide IDs are not erased. Repeated sync is idempotent. Active lessons should be reloaded after this content revision.

## Official curriculum fields

- lesson_id: PREV-01
- title: My Capabilities, Interests, and Skills
- competency_code: TPPV-ST-NG-2
- official_competency: Identify individual learner’s capabilities, interests, talents and skills
- content_standard: The learner… Demonstrates understanding of the underlying concept and principles of assessing one’s personal strengths, talents, abilities and skills
- performance_standard: The learner… Recognizes individual talents, skills, abilities and strengths

Standards are stored exactly in structured lesson data and slide lesson_metadata; the official code/title remain unchanged. The requested curly-apostrophe competency spelling replaces the legacy straight-apostrophe spelling. No database model/migration or dependency was added.

## Files changed / reusable implementation

- `web/prev01_discovery.py`: structured lesson content, narration, scenarios, reflections and supplied video.
- `web/prev_lessons.py`: apply PREV-01 redesign before existing asset attachment; PREV-02/03 definitions unchanged.
- `web/management/commands/sync_prev_lessons.py`: --lesson scope, stable-key reuse and transactional position reordering, official standards metadata.
- `web/activity_templates.py`, `web/game_validation.py`: reusable discovery_board / scenario_classifier contracts and server-side completion verification.
- `web/views.py`: self_report EEG answers use null is_correct, not primary correctness.
- `frontend/src/components/molecules/TaskInteraction/DiscoveryActivities.tsx` / `.module.css`: AudioNarration, DiscussionCards, DiscoveryBoard, ScenarioClassifier; system-colored responsive controls, no checkmarks/timers/forced audio.
- `TaskInteraction.tsx`, `TaskCard.tsx`: integrate new templates and optional narration, suppress self-report reward sounds. Includes the prior self-reflection red-border fix.
- `frontend/src/constants/activityTemplates.ts`, `frontend/src/types/index.ts`: registry/types.
- `frontend/src/pages/student/PracticeLesson.tsx`, `LiveEEG.tsx`: configuration mapping, optional video gate, local scenario retries; Practice restores saved reflection responses.
- `web/test_prev_lessons.py`, `frontend/tests/mini-games.test.mjs`: contracts, persistence, neutrality, overlap, supported capability, narration control, knowledge keys, scoped sync and EEG self-report tests.
- `scripts/verify_prev01_sync.py`: local content sync/preservation audit.

## Scoring and personal response semantics

Scenario games/knowledge check score identification of concepts in fictional examples only. Each clue emphasizes one concept; real activities can overlap. Every discovery_board has scored=false, evidence_role=self_report and digital_mastery_claim=false. A learner may put the same activity into several areas. Not sure yet is valid in each area and exclusive only within that area. Other/Something else is a selectable option, not a required typed/spoken response. Save requires an activity or Not sure yet in each area, not any particular answer.

Practice stores response JSON in existing LessonPracticeProgress.activity_evidence and restores board selections on reload. EEG stores self-report response/support metadata with is_correct=null; never interprets preferences as verified skills. No verified performance data, talent assignment, recommendations or learner diagnosis are created. Self-report is neutrally acknowledged, with no correctness color/reward sound. The final board fields are selfReportedInterests, selfReportedCapabilities, activitiesToExplore; no verifiedSkills/aptitude fields.

## Adaptive delivery and accessibility

Focused: normal discussion and full card set. Distracted: one discussion card at a time, groups of four activity choices, current-question cue from existing strategy. Overstimulated: one discussion/activity card at a time, nonessential sound/animation suppressed, learner-requested narration preserved. Relaxed: normal calm pacing under existing strategy; it does not force Relax Mode. All choices remain reachable using Previous/More controls, and answer keys/objectives remain invariant. Teacher/manual regulation flow is unchanged; EEG never writes any interest/skill/talent/capability field. Scenario rounds show one fictional clue at a time in all states. Areas retain their labels and selection summaries.

Controls use real buttons, keyboard/touch/mouse support, 44px minimum targets, focus rings, visible Selected/area counts and textual feedback rather than color alone. Wrong scenario attempts retry locally without discarding completed clues. Narration is requested, pausable/resumable/replayable; cleanup cancels it on hiding/leaving. Requested narration remains available in quiet mode and stops before interaction feedback. Device/browser TTS availability varies; fallback is readable cards/teacher assistance.

## Video configuration and validation

User-supplied video: https://www.youtube.com/watch?v=JwNI1F21eK8 ; configured embed: https://www.youtube.com/embed/JwNI1F21eK8. The page could not be fetched for content review in this environment. video_status=user_supplied_pending_expert_validation. Research Team/Panorama/SPED must validate suitability, language, length, licensing and conceptual accuracy before production. Offline/unavailable video never blocks Next; a visible fallback directs learners to the examples. A neutral post-video reflection immediately follows, with no invented video-specific answer key.

Stored researcher search terms: strengths interests talents and skills for students; difference between interests talents and skills for students; talento kakayahan at interes ng mag-aaral. Optional future searches: discover your strengths and interests students; knowing your strengths and skills career education; interes talento at kakayahan Filipino lesson.

## Exact screen content, narration, activities and keys

### 1. Discover Myself (orientation)

- Discover Myself: People have different interests, talents, skills, and capabilities. Knowing yourself can help you discover activities to learn, practice, and explore.

Narration: People have different interests, talents, skills, and capabilities. You may enjoy some activities more than others. You may already know how to do some things, while other skills are still developing. In this lesson, you will explore what you enjoy, what you can do, and what you may want to practice.

### 2. Different People, Different Activities (hook)

- Different People, Different Activities: People enjoy and learn different things. Enjoying an activity does not mean you already know how to do it.
- Drawing or design: Enjoy creating; keep learning.
- Organizing materials: Learn to arrange and label.

Narration: People enjoy and learn different things. Someone may enjoy drawing and still be learning to draw. Someone else may be able to organize materials but want to explore music. We do not need to have the same interests or abilities.

### 3. What Is an Interest? (interest)

- What Is an Interest?: An interest is something you enjoy or want to know more about. You can have more than one interest.
- Gardening: Enjoy learning about plants.
- Music: Want to explore sounds and rhythm.

Narration: An interest is something you enjoy or want to know more about. You might enjoy cooking, gardening, using computers, making music, playing sports, creating art, organizing things, or helping others. People can have different interests, and interests can change as we discover new activities.

### 4. What Interests You? (interests)

Prompt: Choose activities you enjoy or would like to explore. Not sure yet is okay.

Activity cards: Gardening; Sports; Drawing or design; I'm not sure yet; Help with household tasks; Food preparation; Using a computer; Organizing materials; Something else; Music; Building or repair; Helping people.

Areas: Activities I enjoy or want to explore.

Self-report fields: {"enjoy":"selfReportedInterests"}.

Completion acknowledgement: You recorded what you enjoy or want to explore.

Retry/cue: Look at the clue again. You can try another choice.

### 5. What Is a Skill? (skill)

- What Is a Skill?: A skill is something you have learned or are learning to do. Skills can improve with practice, experience, and support.
- Using a computer: Learning to create and save a document.

Narration: A skill is something you have learned or are learning to do. Skills can develop through practice, experience, and support. For example, someone may learn to prepare food, use a computer, organize materials, care for plants, draw, or follow instructions. We do not have to know how to do everything. Skills can continue to develop.

### 6. Interest or Skill? (classification)

Prompt: Which idea does each fictional clue emphasize?

1. I enjoy learning about plants.
   Choices: Interest | Skill
   Key: Interest
   Correct feedback: This tells us what the person enjoys exploring.

2. I can water plants using the steps I learned.
   Choices: Interest | Skill
   Key: Skill
   Correct feedback: This describes something the person has learned to do.

3. I like learning how computers work.
   Choices: Skill | Interest
   Key: Interest
   Correct feedback: The clue emphasizes curiosity and enjoyment.

4. I can create and save a document on a computer.
   Choices: Interest | Skill
   Key: Skill
   Correct feedback: This example describes a learned computer skill.

5. I enjoy preparing food with my family.
   Choices: Skill | Interest
   Key: Interest
   Correct feedback: The clue describes enjoyment, not verified performance.

6. I can measure ingredients using the tools I learned to use.
   Choices: Interest | Skill
   Key: Skill
   Correct feedback: The clue describes a learned measuring skill.

Completion acknowledgement: You identified the concepts in these examples.

Retry/cue: What is the clue emphasizing: enjoyment, learning, or being able to do something?

### 7. What Is a Talent? (talent)

- What Is a Talent?: A talent is an ability that a person may do well and continue to develop. Talents can grow through practice and experience.

Narration: A talent is an ability that a person may do well and continue to develop. People may notice talents in different activities, such as music, art, sports, working with tools, organizing, or other areas. Practice and experience can help people continue developing their abilities.

### 8. What Is a Capability? (capability)

- What Is a Capability?: A capability is something you are able to do. You may do it independently or with appropriate support.

Narration: A capability is something you are able to do. Some activities can be done independently. Other activities may be completed with instructions, tools, practice, or support. Receiving support does not mean the activity is not a capability.

### 9. Remember the Difference (concepts)

Supporting text: Real activities can fit more than one concept. Practice clues emphasize one idea.

- Interest: What I enjoy or want to explore.
- Skill: Something I learned or am learning to do.
- Talent: An ability I may do well and continue to develop.
- Capability: Something I am able to do, with or without support.

Narration: Interest is about what you enjoy or want to explore. A skill is something you have learned or are learning to do. A talent is an ability you may do well and continue to develop. A capability is something you are able to do, with or without appropriate support.

### 10. See It in Real Life (video)

Supporting text: Watch, then reflect on what you noticed.

Media: https://www.youtube.com/embed/JwNI1F21eK8. Optional: true.

### 11. What Did You Notice? (video-reflection)

Prompt: Reflect on the video, or on the examples if you skipped it. There are no wrong answers.

Activity cards: Music; Gardening; Drawing or design; Help with household tasks; Food preparation; Sports; Something else; I'm not sure yet; Building or repair; Organizing materials; Using a computer; Helping people.

Areas: Activities I noticed | Skills people used | Something to explore.

Self-report fields: {"noticed":"selfReportedVideoObservations","skills":"selfReportedObservedSkills","explore":"activitiesToExplore"}.

Completion acknowledgement: You recorded your observations, not a scored answer about the video.

Retry/cue: Look at the clue again. You can try another choice.

### 12. Meet Alex (story)

- Meet Alex: Alex enjoys working with plants. Alex learned to water plants and care for garden materials. Alex works carefully and wants to learn more.
- Interest: Plants and gardening.
- Skill: Watering and caring for plants.
- Developing strength: Careful work.
- Capability: Completing familiar gardening tasks.

Narration: Alex enjoys working with plants. Gardening is an interest. Through practice, Alex has learned skills such as watering plants and caring for familiar garden materials. Alex also works carefully and wants to continue learning. One person can have different interests, skills, talents, strengths, and capabilities.

### 13. My Discovery Board (board)

Prompt: An activity can belong in more than one area. Choose Not sure yet where needed.

Activity cards: I'm not sure yet; Something else; Drawing or design; Using a computer; Helping people; Sports; Building or repair; Help with household tasks; Music; Food preparation; Gardening; Organizing materials.

Areas: I enjoy this | I can do this | I want to practice or explore this.

Self-report fields: {"enjoy":"selfReportedInterests","can":"selfReportedCapabilities","explore":"activitiesToExplore"}.

Completion acknowledgement: You recorded your own choices. These are self-report, not verified skills.

Retry/cue: Look at the clue again. You can try another choice.

### 14. Discover the Difference (scenarios)

Prompt: Which idea does each fictional clue emphasize?

1. Lea enjoys drawing during her free time.
   Choices: Skill | Interest | Capability
   Key: Interest
   Correct feedback: Lea enjoys drawing; this clue emphasizes an interest.

2. Marco learned how to organize files into labeled folders.
   Choices: Capability | Interest | Skill
   Key: Skill
   Correct feedback: The clue emphasizes what Marco learned to do.

3. Sam is able to prepare materials for a familiar classroom task, with a checklist for support.
   Choices: Capability | Interest | Skill
   Key: Capability
   Correct feedback: The clue emphasizes what Sam is able to do. Support is valid.

4. Jamie enjoys learning how electronic devices work.
   Choices: Capability | Interest | Skill
   Key: Interest
   Correct feedback: This describes Jamie's curiosity and enjoyment.

5. Chris learned how to type a short message using a keyboard.
   Choices: Skill | Capability | Interest
   Key: Skill
   Correct feedback: The clue clearly emphasizes a learned skill.

Completion acknowledgement: You identified the concepts in these examples.

Retry/cue: What is the clue emphasizing: enjoyment, learning, or being able to do something?

### 15. What Do These Ideas Mean? (knowledge)

Prompt: Which idea does each fictional clue emphasize?

1. Rina enjoys learning new recipes. What does this describe?
   Choices: Skill | Capability | Interest
   Key: Interest
   Correct feedback: This tells us what Rina enjoys.

2. Paolo learned to organize books by label. What does this emphasize?
   Choices: Capability | Skill | Interest
   Key: Skill
   Correct feedback: The clue emphasizes learning a skill.

3. Which statement best describes a skill?
   Choices: A job Cortex chooses | Something that must be perfect | Something learned or being learned
   Key: Something learned or being learned
   Correct feedback: Skills develop through learning and practice.

4. Which statement best describes an interest?
   Choices: Something enjoyed or worth exploring | A Cortex score | Something already done perfectly
   Key: Something enjoyed or worth exploring
   Correct feedback: An interest is about enjoyment and curiosity.

5. Can a person have more than one interest or skill?
   Choices: Yes | No
   Key: Yes
   Correct feedback: People can have many interests and skills.

6. Can skills improve with practice and support?
   Choices: Yes | No
   Key: Yes
   Correct feedback: Skills can continue developing.

7. If someone uses support to complete an activity, can it still be a capability?
   Choices: Yes | No
   Key: Yes
   Correct feedback: Appropriate support does not take away a person's capability.

Completion acknowledgement: You identified the concepts in these examples.

Retry/cue: What is the clue emphasizing: enjoyment, learning, or being able to do something?

### 16. My Reflection (reflection)

Prompt: Choose something you enjoy, can do, and want to practice. Not sure yet is okay.

Narration: Think about yourself. Choose something you enjoy, something you can do, and something you would like to practice or explore. There are no wrong answers here.

Activity cards: Organizing materials; Food preparation; Sports; Drawing or design; Building or repair; Using a computer; I'm not sure yet; Helping people; Help with household tasks; Music; Something else; Gardening.

Areas: Something I enjoy | Something I can do | Something I want to practice or explore.

Self-report fields: {"enjoy":"selfReportedInterests","can":"selfReportedCapabilities","explore":"activitiesToExplore"}.

Completion acknowledgement: You reflected on yourself. You can keep learning and exploring.

Retry/cue: Look at the clue again. You can try another choice.

### 17. What I Discovered (summary)

Supporting text: People have different strengths. We can keep learning and developing them.

- Interest: What I enjoy or want to explore.
- Skill: Something I learned or am learning to do.
- Talent: An ability I may do well and continue to develop.
- Capability: Something I am able to do, with or without support.

Narration: People have different interests, talents, skills, and capabilities. An interest is something you enjoy or want to explore. A skill is something you have learned or are learning to do. A talent is an ability you may do well and continue to develop. A capability is something you are able to do, with or without support. We can continue learning, practicing, and discovering what we can do.

### 18. Discovery Complete (completion)

- Discovery Complete: You explored your interests, skills, talents, and capabilities. Next, discover different livelihood activities.

Narration: You know more about yourself, and you can keep exploring. Next, you will discover different livelihood activities.

## Asset manifest / remaining work

| Activity | Reused asset / status |
| --- | --- |
| I'm not sure yet | Labeled native symbol; optional replacement PNG needed |
| Something else | Labeled native symbol; optional replacement PNG needed |
| Drawing or design | /assets/pre-vocational/common/drawing-interest.png |
| Using a computer | /assets/pre-vocational/common/using-computer.png |
| Helping people | Labeled native symbol; optional replacement PNG needed |
| Sports | /assets/care/care-01/ball.png |
| Building or repair | /assets/pre-vocational/common/repair.png |
| Help with household tasks | /assets/pre-vocational/common/household-tasks.png |
| Music | /assets/pre-vocational/common/music.png |
| Food preparation | /assets/pre-vocational/common/meal-preparation.png |
| Gardening | /assets/pre-vocational/common/gardening.png |
| Organizing materials | /assets/pre-vocational/common/organizing.png |

Optional missing assets: age-neutral Alex/people illustration, Discovery Studio/station scene, helping-people PNG, recorded narration clips for the scripted discussions/reflection. Existing gardening, cooking, computer, drawing, music, organizing, household, sports ball and repair PNGs are reused without fetching internet art. Other/Not sure cards intentionally use text/native symbols, not missing-image slots. No newly generated raster assets were needed.

Not implemented: optional Activity Explorer scene/stations (no new room art; existing activity cards and Discovery Board provide exploration), free-form typed Other descriptions, a separate permanent vocational profile editor, or verified real-world performance signoff. Board reports remain in existing practice/session evidence. Do not claim the learner has a verified skill because they selected a card. New PREV-02/03 upgrades are explicitly out of scope.

## Verification and expert review

### Post-merge safety audit

Audited against main commit `b5c8e32`. Resolved both unmerged files (`LiveEEG.tsx` and `PracticeLesson.tsx`) by retaining main's focus gates, save/retry handling and navigation labels alongside our optional-video handling and local scenario retries. Main's teacher analytics and adaptive-support implementation were not replaced. New discussion/scenario text uses the shared adaptive text renderer; active support narrows the new activities too. Main's existing attention micro-gate remains separate from knowledge/self-report scoring.

Post-merge verification: 48 frontend tests and 60 targeted Django tests passed; production build passed; Django system checks passed and no schema changes were detected. Repeat scoped sync preserved all 18 existing slide/activity IDs, 11 progress records and 142 unrelated slides. No unresolved Git conflicts remain. No commit or destructive reset was performed; staged and unstaged work remains available to review.

Whole-project lint currently reports 10 errors in upstream files. These are not a clean lint result for the merged branch; the earlier lint pass below refers to the pre-merge implementation. Device-level visual/audio QA is still outstanding.

Automated frontend interactions cover neutral self-reflections, overlap, Not sure, saved response restoration, scenario retries/completion, narration requested play/pause/resume/replay, one-card quiet discussion, and existing CARE/LIFE games. Build/typecheck and lint passed. No migrations detected. Local sync audit preserved the IDs/progress described above. Final automated totals are recorded in the handoff.

Real-browser visual/touch/screenreader and audible voice/video playback checks remain needed; handler tests simulate browser speech rather than prove audible playback. The earlier browser automation helper failed to initialize; this task does not claim device QA. The previous full Django suite also had a missing duckdb dependency; this task uses targeted regression tests and does not claim a clean full-suite run.

Research Team/Panorama/SPED validation: exact curriculum punctuation/fields, developmental suitability of interest/skill/talent/capability wording and supported capability, clarity of intended classification versus real-life overlap, adult-respectful PNG style, optional narration language/voice, scenario length, reflection privacy/retention and the user-supplied video. The final pedagogical outcome is self-awareness and continued exploration—not a Cortex determination of aptitude or best career.

