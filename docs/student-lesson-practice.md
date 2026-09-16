# Student lesson practice

Students can open **My Classes → a class → a learning package → a lesson → Practice**.
The player loads the published database lesson and renders its ordered activities.
Correct answers enable the next activity. Reading slides allow students to use
Next activity immediately; presented audio and video unlock it when playback ends.
Visited activities retain their answers, work, and feedback during navigation within
the open practice lesson. Try again resets only the current interactive activity;
instructional slides have no retry or separate Continue button.
The progress display shows activities left on the first pass and hides that count
when reopening a previously completed lesson for practice.

Practice saves opened/completed activity progress per student, class, and lesson
when the student continues to the next activity. Package cards show a gray
not-started indicator, a progress ring with a percentage, or a green completion
check. Returning to practice resumes the first unfinished activity.
Practice does not create EEG learning sessions, measurements, or grades.
The **EEG Session** option retains the existing consent and headset flow.
Class enrollment, active class/package status, and lesson publication are checked
on the server before practice content is returned.

To publish or synchronize the integrated curriculum in another environment:

```powershell
.venv/Scripts/python.exe manage.py sync_integrated_lessons
```

The command publishes 21 lessons across seven packages in one transaction. It uses
an existing administrator as content owner; `--owner USERNAME` selects another
existing owner. It preserves unrelated content, accounts, classes, enrollments,
and recorded sessions, and retains lesson and slide IDs on repeat runs.

The six existing Python lesson definitions remain authoritative for their packages.
The enrichment definitions in `web/enrichment_lessons.json` were imported from the
existing frontend enrichment activities. After changing that source, regenerate
the snapshot from `frontend` with `node tests/export-enrichment.mjs`, then test and
run the synchronization command. Existing media placeholders remain placeholders;
teacher observation requirements in lesson content still apply.

## EEG lesson adaptation

The live Muse lesson uses the practice player styling, answer sounds, media completion
rules, and Next activity navigation. Device details are collapsed by default.
The classified state returned by the EEG sample endpoint determines the next mode
when Next activity (or Finish lesson) is clicked:

- Focused or relaxed: continue the lesson.
- Overstimulated: show a quiet pastel breathing screen with softly fading guidance.
  Focused or relaxed readings reveal Ready to continue and a Continue button.
- Distracted: rotate four-picture word, writing, and organizing activities. Completing
  an activity while focused or relaxed returns automatically to the pending lesson
  activity. Missing readings keep the refocusing flow open. An overstimulated reading
  at activity completion moves to breathing.

The development build includes a bottom-left Force state chooser and Back to EEG
 device based button. Forced states affect only the local interface; recorded samples
 still use the device classification. Collapse the chooser to keep the screen quiet.
 Break samples have no lesson slide attached; the pending slide is entered on return.

Run transition checks from frontend with `node --test tests/eeg-transitions.test.mjs`.
Manual check: select each forced state before Next activity; during breathing select
focused/relaxed and press Continue; during refocusing select focused/relaxed mid-task
and verify that the lesson returns automatically only after the answer is correct.
Distracted activities have no Finish activity button: the last correct letter, completed
writing prompt, or final correct grouping choice completes the activity and plays a
soft success chime. The picture game keeps its 2x2 pictures on the left and letters
on the right. Breathing hides surrounding lesson text while preserving the card;
Continue appears only after recovery.
