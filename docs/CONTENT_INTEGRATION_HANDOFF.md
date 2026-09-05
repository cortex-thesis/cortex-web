# Cortex content integration handoff

Last updated: 2026-09-06

## Purpose

This document preserves the current implementation decisions and the information needed for the next content-integration session. The lesson source files may remain in Google Drive; they do not need to be committed to this repository.

## Research and curriculum decisions

- Lesson packages and activities must remain aligned with the thesis paper, its RRL, and the Transition Curriculum.
- The Transition Curriculum does not require one universal language. Instruction should begin in the learner's first language and progress according to needs and developmental milestones.
- The exact target age/grade group is not final. Panorama learners are broadly Kinder to Grade 10, with the researchers currently leaning toward younger learners. Until stakeholders decide, content should use short, concrete, age-neutral language and avoid assumptions tied to one grade.
- Language selection/localization remains an important unresolved system requirement. Ask the researchers about the final target learners and language strategy before finalizing production content.
- Participating SPED teachers may be contacted again for prototype testing. Formal approval is expected through a Certificate of Content Acceptability and Authorization for Testing rather than a new approval questionnaire.
- Do not make unnecessary database changes. The current content work uses the existing JSON configuration field and requires no schema migration.
- Missing optional lesson details may use explicit placeholders, but placeholders must never be presented as approved instructional content.

## Delivery-mode behavior

- Focused: steady academic instruction.
- Distracted: attention-reengagement adaptation within Focus Mode.
- Relaxed: gentle reactivation/re-entry behavior.
- Overstimulated: switch to Relax Mode for low-stimulus sensory regulation.
- Regulation guides such as breathing, calming visuals, and soundscapes belong to Relax Mode and must not overlap academic task interactions on the same screen.
- Academic tasks can be reused across delivery modes through delivery variants; the content meaning and learning objective should remain consistent.

## Implemented activity system

Presentation templates:

1. Instructional video
2. Step-by-step visual narrative
3. Interactive knowledge check
4. Re-engagement prompt
5. Breathing exercise
6. Calming visual
7. Calming soundscape

Task templates:

1. Multiple choice (`multiple_choice`)
2. Picture choice (`picture_choice`)
3. Yes or no (`yes_no`)
4. Matching pairs (`matching_pairs`)
5. Order the steps (`sequence_order`)
6. Sort into groups (`sort_groups`)
7. Tap the correct item (`tap_target`)
8. Build the picture (`picture_puzzle`)
9. Move to the right place (`drag_to_target`)
10. Hotspot hunt (`hotspot_hunt`)
11. Trace the route (`trace_route`)
12. Memory flip (`memory_flip`)
13. Pattern builder (`pattern_builder`)

Direct-manipulation tasks support dragging and a tap/click fallback for accessibility and touch compatibility.

## Dynamic layout contract

Activity screens expand vertically and repeated items wrap based on the content. A task can optionally supply layout hints:

```json
{
  "layout": {
    "size": "wide",
    "preferred_columns": 4,
    "board_min_height": 320,
    "media_fit": "contain"
  }
}
```

- `size`: `compact`, `standard`, `wide`, or `immersive`
- `preferred_columns`: integer from 1 to 8
- `board_min_height`: integer from 160 to 900 pixels
- `media_fit`: `contain` or `cover`

These are layout hints, not a requirement. Omitting `layout` activates responsive automatic placement. Backend lesson JSON uses snake_case. The current frontend `Task` model uses camelCase equivalents (`preferredColumns`, `boardMinHeight`, and `mediaFit`), so API integration must map between the two representations.

## How to provide each lesson

One Google Drive document per lesson is preferred. Use the following headings in this order:

```text
Lesson code:
Lesson title:
Learning package:
Draft/approval status:
Target learner or developmental level:
Estimated duration:
Primary language:
Optional translated language(s):

Learning objective(s):
Prerequisite skill(s):
Materials/assets:

Opening/instruction:

Activity 1
- Presentation template (if any):
- Task template (if any):
- Learner instruction:
- Question/prompt:
- Items/choices/pairs/steps/categories:
- Correct answer or correct arrangement:
- Correct feedback:
- Supportive retry feedback:
- Optional hint:
- Asset filenames:
- Optional layout hints:

Activity 2
[repeat the same fields]

Completion message:
Teacher notes:
Source/curriculum basis:
Accessibility or sensory notes:
Items still awaiting SPED-teacher approval:
```

For every image, audio clip, or video, provide the actual file in a neighboring Drive folder and use a stable filename in the lesson document. Do not paste images as the only copy of an asset. Indicate whether each asset is original, licensed, public domain, or still a placeholder. Do not include identifiable learner information.

Correct answers must be stated explicitly. For sorting, matching, routes, puzzles, and patterns, give stable item IDs or uniquely worded labels so the system does not have to infer the answer.

## Recommended first content batch

Provide one complete pilot lesson before preparing every package. CARE-01 is the current natural candidate. The first integration pass should include:

- the lesson document;
- all media assets;
- the intended activity-template choices;
- explicit answer keys and feedback;
- any citations or curriculum references; and
- a list of facts or wording that still requires SPED-teacher validation.

After that lesson renders correctly and is reviewed, use it as the production pattern for the remaining lessons.

## Development and preview instructions

Backend from the repository root:

```powershell
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

Frontend from `frontend`:

```powershell
npm.cmd run dev
```

Login-free development preview:

`http://127.0.0.1:5173/preview/activities`

The preview route exists only in Vite development mode. Normal student, teacher, and administrator pages remain authenticated.

Demo student credentials, if the complete workflow is needed:

- Email: `student@example-school.test`
- Password: `student-demo-2026!`

## Current verification

- Frontend production build passes.
- ESLint passes.
- Django system check passes.
- All 25 Django workflow tests pass.
- The build reports a non-blocking large JavaScript bundle warning that can be handled later through code splitting.

## Questions to ask next time

Before final production content is approved, ask again:

1. Which learner age, grade, or developmental range is the final prototype targeting?
2. Which first-language and multilingual options will be supported in testing?
3. Which lesson content and media have been reviewed by the SPED teachers/school representative?
4. Should unapproved fields remain clearly labeled placeholders or be omitted from learner-facing screens?
5. Is CARE-01 the agreed pilot lesson for end-to-end integration?

