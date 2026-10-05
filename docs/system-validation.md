# Super administrator system validation

Open **System overview → Validation** (`/admin/evaluation`) and select **Run all automated tests**. Only an active super administrator can read results, run tests, or record manual evidence. The API uses the existing session authentication and CSRF protection.

The page shows overall and category pass percentages, passed/failed/error/skipped counts, individual durations, expected and actual results, run history, and JSON downloads. Expand a failed check for details, or enable the unsuccessful-check filter. Failures create a defect record automatically. A subsequent completed run identifies previously failed tests as **corrected** or **still failing**. Manual evidence revisions also retain previous observations in the downloaded report.

Percentages are `passed / all recorded automated checks × 100`. Skips and runner errors do not count as passes. An in-progress percentage is provisional. Manual headset/device evidence is shown separately, so a 100% automated result does not imply that a physical headset or every device/browser has been verified.

## Isolation and execution

The worker runs the Django `web` suite in a subprocess with `web.validation_settings`: a fresh in-memory SQLite database, temporary filesystem media storage and a temporary EEG directory. It also executes Node logic/component regression tests and Playwright Chromium tests with synthetic API fixtures. Browser login/logout, failed login, access restrictions, validation workflow, phone/tablet layout, keyboard focus, axe WCAG/contrast on the validation page, reduced motion and a five-second fixture rendering budget are tested. EEG extraction has a two-second processing budget per acquisition window. Browser fixtures exercise the actual React pages without sending requests to the application database. The synthetic session integration test exercises real Django session, EEG prediction, duplicate-window rejection, adaptation control, lesson answer/completion and teacher reporting endpoints; physical Bluetooth pairing remains a manual check.

The fixed command list accepts no executable, shell command, test label or destination from the browser. At most one full run is active. Backend execution is limited to ten minutes, each Node file to thirty seconds and browser execution to five minutes. Interrupted runs are marked unsuccessful after thirty minutes so they can be restarted. Results are written atomically under `.runtime/validation/`; the latest twenty runs appear in the interface. These files are local to the backend host, excluded from Git, and survive server restarts. A multi-host deployment should use one designated validation host or move history/locking to shared storage before enabling runs on multiple hosts.

## Setup

Use the same Python and Node installations that run Cortex:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
cd frontend
npm.cmd install
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) '../.runtime/playwright-browsers'
node node_modules/@playwright/test/cli.js install chromium
```

Chromium is kept in the project runtime directory. The dashboard reports an unsuccessful browser suite if Node, dependencies or Chromium are missing; it never downloads dependencies automatically during a run. Restart the backend after adding the validation endpoints.

For local diagnostics:

```powershell
# From the repository root:
.\.venv\Scripts\python.exe manage.py test web --settings=web.validation_settings --noinput
.\.venv\Scripts\python.exe manage.py validate_system --settings=web.validation_settings

# From frontend (keep PLAYWRIGHT_BROWSERS_PATH set as above):
npm.cmd test
npm.cmd run test:browser
npm.cmd run build
```

## Manual validation and defects

The six manual checks cover real headset/two-device flow, broader phone lesson/report layouts, keyboard navigation, measured contrast, operating-system reduced motion, and measured hardware/teacher-command latency. For each check, record its expected result, actual observations, measurements/acceptance threshold where relevant, and passed/failed/blocked status. Do not enter student names, passwords, tokens or raw EEG. Correct defects and rerun automation; repeat the manual check and save new evidence to retain its retest history. New automated runs start with pending manual evidence to avoid reusing old device observations.

Runtime code must have access to the checked-out test files and development browser dependencies. The suite tests this checkout with synthetic fixtures; it does not measure production database availability, real-device latency, or educational/clinical validity.
