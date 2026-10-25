# Matching and movement video review

## Implementation

Both matching columns now use independent Fisher-Yates shuffles. React state retains their order for the mounted attempt, including selection, successful matches and parent rerenders with recreated pair arrays. Existing lesson players remount activities for new slides/retries.

Answer orders with a correct pair in the same row are rejected. Valid candidates are scored to reduce neighboring-row clues. A bounded fallback evaluates rotations of the shuffled left column. Four or more pairs can avoid both same-row and neighboring-row matches; with two or three pairs, some nearby answers are unavoidable in the existing two-column layout.

Only presentation order changes. Original pair objects, IDs, validation, feedback, images, button/drop handlers, layout and completion tracking are preserved.

Files changed for this request:
- frontend/src/components/molecules/TaskInteraction/TaskInteraction.tsx
- frontend/src/lib/matchingOrder.ts
- frontend/tests/matching-order.test.mjs
- frontend/tests/mini-games.test.mjs
- docs/MATCHING_AND_MOVEMENT_VIDEO_REVIEW.md

## Initial source inspection (superseded by live check below)

The active ENRICH-03 definition is in web/creative_lessons.json. The preview imports it through frontend/src/mocks/creativeLessons.ts. The separate legacy sequence in frontend/src/mocks/enrichmentLessons.ts was not changed.

Title: Move to the Beat.
Existing official competency: Perform basic dance steps /movements.

Current sequence:
1. Welcome to the Movement Studio: participation and adaptation choices.
2. Movement Cards: illustrated movement cues.
3. Follow the Beat: a visual beat guide.
4. Build a Movement Sequence: choose, arrange and play three cues.
5. The Movement Wheel: choose a comfortable cue.
6. Rhythm and Movement Match: sequence the existing tap/clap/pause pattern.
7. Movement Video Demonstration: an optional instructional-video slide, screen key e3-video, currently without a media URL.
8. My Movement Performance: replay and reflection, with teacher observation separate.

No slide was replaced. An empty dedicated video slot already exists. Filling slide 7 after verification would preserve all teaching content and the flow into the final performance/reflection. The Movement Wheel overlaps with Movement Cards, but removing it is unnecessary while that video slot exists.

## Proposed video

https://www.youtube.com/watch?v=vXHY70q6viw

Public YouTube oEmbed and watch-page player metadata were retrieved successfully:
- Title: What is Rhythm in Music? | Music Theory for Kids | Building Blocks of Music | Green Bean's Music
- Channel: Green Bean's Music - Children's Channel
- Duration: 194 seconds (3:14).
- Player status: OK; playableInEmbed: true.
- Publisher description: long/short sounds and silences, clapping exercises, beginner rhythm concepts.

The caption endpoint returned empty responses for both listed English tracks. The full audiovisual demonstrations, pacing, movement adaptations and learner suitability could not be verified. The publisher description and embeddable flag do not establish these qualities or prove playback in Cortex.

Decision: integration remains pending. The video may offer rhythm background, but a suitable steady-beat movement demonstration has not been established. No content or metadata was fabricated.

## Alternatives compared

### Oak National Academy: Keeping a steady beat as we move, sing and play
https://www.thenational.academy/teachers/lessons/keeping-a-steady-beat-as-we-move-sing-and-play

The official page supports moving to the beat, body percussion, knee patting and responding in time. It lists a lesson video and clips. This is the strongest curricular lead for a beat-focused demonstration. The video remained dynamically loading in the accessible response: the actual audiovisual sequence, adaptations, usable Cortex media URL and embed playback were not verified. Its KS1 presentation also needs review for the intended learners.

### Carnegie Hall: Seat on the Beat
https://www.carnegiehall.org/Education/Programs/Music-Educators-Toolbox/1-Seat-on-the-Beat

The official page lists the video Grade 1 Activity Exemplar: Rhythm and Meter and describes students creating rhythmic patterns with their bodies. It is a credible demonstration candidate, but the four-chair classroom activity and note values make it less direct as an individual movement follow-along. The actual stream/embed and suitability were not verified.

### Ophea: Grades 1?3 Sample Lesson: Moving to the Beat
https://ophea.net/grades-1-3-sample-lesson-moving-beat

The official lesson covers steady-beat movement, comfortable seated positions and inclusive participation. It is useful for assessing adaptations and instructional fit. No usable demonstration video was identified on the page; this is a planning reference, not an approved replacement video.

No alternative was automatically integrated.

## Verification

- Full frontend suite: node --test tests/*.test.mjs ? 89 passed, 0 failed.
- TypeScript: node node_modules/typescript/bin/tsc -b ? passed.
- Helper and component tests cover 0, 1, 2, 3, 4, 5, 6, 8, 9 and 12 pairs, independent orders, no same-row answers, reduced adjacent clues, input immutability, bounded fallback, stable positions, recreated props, click/drop correctness, wrong-answer feedback and completion.
- Existing YouTube tests passed for URL validation, unavailable/error/timeout continuation and iframe lifecycle after activity cleanup.
- Live playback and new-video navigation were not tested or claimed: no video was inserted.

## Replacement video integrated (October 26, 2026)

Selected: Move To The Beat | The Sitting Movement Song For Preschool & Kindergarten Music Groups, Music For Kiddos.
https://www.youtube.com/watch?v=hrbGVGcXB5Q
Duration reported by YouTube: 139 seconds (2:19).
YouTube player metadata: status OK, playableInEmbed true.

Content verification used primary publisher evidence beyond the title:
- https://www.musicforkiddos.com/blog/2026/8/24/what-to-teach-in-september-steady-beat directly links this exact video and describes a sitting song for practicing a steady pulse.
- https://www.musicforkiddos.com/blog/podcast9 provides the move/stop refrain and actual movement cues, including clapping and shoulder movements, and explains seated/upper-body participation.
- Its original audience is preschool/kindergarten. Used here as an optional seated follow-along supporting the existing movement competency, with pause/replay and adapted participation.

This verifies the song's instructional content through the creator's published cues and lyrics. Captions returned empty; a full independent audiovisual review and live Cortex playback were not claimed.

The live database check corrected the earlier source-only assumption: the running app uses the older eight-slide lesson (lesson 21), rather than the newer creative journey:
1. Move Lab: Check Before Moving
2. Meet the Three-Beat Sequence
3. Find the Missing Beat
4. Remember the Movement Cue
5. Arrange Your Three-Beat Routine
6. Make the Routine Work for You
7. Choose Your Next Practice
8. Move Lab Complete

For that current lesson, only the final completion summary was replaced with Move to the Beat: Follow Along. It repeated prior learning, introduced no new assessed skill, and was the least disruptive replacement. The video now provides practical seated movement after teaching, sequencing and adaptation practice. Slide and activity IDs (171) are retained. Historical responses were not deleted. A before-update backup is retained at .runtime/movement-video-before-update.json.

The same video fills the existing optional video slot in the newer creative-journey definition. No additional slides were removed there.

Files changed for this video integration:
- web/enrichment_lessons.json: replace the current lesson's final summary.
- frontend/src/mocks/enrichmentLessons.ts: keep the legacy preview consistent.
- web/creative_lessons.json: fill the newer journey's existing video slot.
- frontend/tests/creative-journeys.test.mjs: verify both definitions, placement, duration, optional video and unchanged slide count.
- docs/MATCHING_AND_MOVEMENT_VIDEO_REVIEW.md: record verification and the live lesson correction.

The existing instructional-video component, YouTube URL conversion, responsive player, completion callbacks, pause/replay and error/skip behavior are reused.

Final integration checks: 91 frontend tests passed; TypeScript passed; both video configurations passed the existing activity validator; the live database confirms slide 171 points to hrbGVGcXB5Q. Live audiovisual playback was not tested.
