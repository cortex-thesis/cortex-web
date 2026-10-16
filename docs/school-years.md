# School-year reports and archival

Both teacher report APIs accept `school_year`. General and advanced reports show the configured active school year by default. Without an active setting they retain the existing active-class default (`all`), excluding archived years. The selected year is stored in the URL and passed between report pages.

School-year associations remain on `SchoolClass.school_year`; learning sessions, EEG data, answers, and reports continue to follow their existing class relationships. No class assignments or historical rows are rewritten. Common hyphen, en dash, em dash, and slash year formats are grouped under an en dash label for reporting. Blank assignments are available through **Unassigned school year**. Existing unusual text remains selectable, but administrator actions require consecutive `YYYY–YYYY` years.

The selector includes years represented by the teacher's classes, school-level settings, and this calendar year's and next calendar year's intake. These options do not create placeholder records or declare a year active. Explicit year selection also includes individually archived classes so historical reports remain readable. Historical learners remain selectable after their enrollment is removed.

School administrators manage their own school's years from the school dashboard. Archive, restore, and active-year changes require confirmation, are audited, and persist in `SchoolYear`. An active year cannot be archived. Switching the active year changes the report default without reassigning classes. Restoring a year does not restore independently archived classes. Archived years are hidden from default reports, class management lists, and active class dashboards, while remaining selectable in historical reports. Teachers and students cannot change year settings. This administrative interface is limited to school administrators; cross-school super-administrator controls were not added.

All four cognitive-state explanations are shared by general reports, advanced reports, class analytics, dashboard state legends, and completed teacher-led session reports. They support hover, keyboard focus, Escape, and touch. Tooltips render outside chart containers and their position is constrained to the viewport. Report sections include the nonclinical disclaimer. EEG algorithms and percentage calculations are unchanged.

## Migration and deployment

`web/migrations/0027_schoolyear.py` only creates the `SchoolYear` settings table, with uniqueness for school/year names, at most one active year per school, and a constraint preventing an active archived year. There is no data backfill and no year is automatically activated.

Apply migrations through the normal deployment procedure before restarting application workers. For an offline replica, migrate the authoritative cloud database and the local replica, then run the existing synchronization process to allocate IDs for the new table and finish content-type/permission setup. Do not change ID ranges manually.

In this workspace, creation of the local table succeeded. The post-migration permission step stopped because the existing offline replica needs refreshed ID allocation. Cloud connectivity was unavailable. Year writes return an actionable 503 if offline allocation is unavailable; production/cloud migration and replica synchronization remain pending. No school year was activated or archived in the user's database.

There are no schema-design decisions requiring confirmation. A school administrator must explicitly choose the school's active year through the implemented confirmation flow.

## Changed files

- Backend: `web/models.py`, `web/school_years.py`, `web/views.py`, `web/urls.py`, `web/migrations/0027_schoolyear.py`.
- Report UI: `frontend/src/pages/teacher/Reports.tsx`, `AdvancedReports.tsx`, `reportingYears.ts`, `SchoolYearOptions.tsx`, `ClassAnalytics.tsx`, `Dashboard.tsx`, `ClassSession.tsx`.
- Shared tooltip: `frontend/src/components/molecules/CognitiveStateInfo.tsx` and `CognitiveStateInfo.module.css`.
- Administration: `frontend/src/pages/schoolAdmin/Dashboard.tsx`, `SchoolYears.tsx`, `SchoolAdmin.module.css`.
- Tests: `web/test_school_years.py`, `frontend/browser-tests/school-years.spec.mjs`.
- Documentation: `docs/school-years.md`.

## Validation

- Focused backend reporting, school-year, and dashboard regression tests: 16 passed (including all six new school-year tests).
- Frontend unit tests: 75 passed.
- Browser tests: six passed in Edge, covering year defaults/filter requests, report navigation/reload, empty states, administrator confirmation, keyboard/Escape behavior, and all four tooltips on both report pages at a mobile viewport. Mobile screenshots were visually inspected.
- TypeScript and production build: passed. The build retains its large-bundle warning.
- Targeted lint, Django system checks, migration drift check, and whitespace checks: passed. Cloud migration-history verification was unavailable because of connectivity.

The broader backend regression run exercised 77 tests: 75 passed and two existing live-EEG tests could not complete because this environment lacks the required ML dependencies. The virtual environment lacks joblib; the system Python has NumPy 1.x, which lacks `numpy.trapezoid` required by the existing EEG code. No classifier changes or test shims were made.
