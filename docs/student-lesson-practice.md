# Student lesson practice

Students can open **My Classes → a class → a learning package → a lesson → Practice**.
The player loads the published database lesson and renders its ordered activities.
Correct answers or the activity's Continue action enable the next activity.
Students can retry activities or return to the package list.

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
