# EEG lesson regression audit — 25 October 2026

## Findings and changes

- Calibration samples lived inside a connection callback and were discarded on every reconnect. They now live in the Muse store and survive automatic reconnects and manual retries of a failed saved connection. Partial calibration continues from the accepted samples; completed calibration remains complete. Raw buffers start fresh, and callbacks from previous connections cannot overwrite the current stream. An explicit disconnect still clears the baseline for a new session.
- Local completed sessions with 10 completed steps and 15 database slides had five hidden `optional_review` steps. The player excludes those steps, but summaries counted them. Student summaries, teacher participant reports, and completion updates now use the required steps delivered by the player. Teacher student-detail summaries now count completed steps rather than answers, so instruction and media steps count too.
- The EEG API rejected negative browser log10 band powers, although powers below one legitimately have negative logarithms. Validation now accepts finite negative log powers while retaining nonnegative validation for relative and normalized bands.

## Model-output verification

Read-only replay of the local database found 247 windows recorded with the current `augmented-eeg-5d8ad5cfca72` artifact. All 247 predicted `relaxed` again, both when reconstructed from stored features and when extracted again from raw chunks. There were zero differences from stored predictions and zero differences from the corresponding session EEG samples consumed by the frontend.

The runtime adapter also reproduces all 279 saved evaluation predictions exactly. The model's saved real-data evaluation is 8/19 correct (42.1%); the 81.7% mixed demonstration result includes artificial data. Output fidelity does not establish physiological accuracy. The artifact and its state mapping were not changed.

## Regression coverage

New checks cover partial/full calibration retention, manual retry after an error, stale connection callbacks, optional review exclusion, instruction/media completion without answers, and preservation of all four model outputs in API responses and storage. The endpoint output test also submits valid negative log powers.

No existing session records or frozen report snapshots were rewritten. Bluetooth behavior still needs verification with a physical Muse headset; software tests use simulated connections and recorded windows.

Validation: 76 frontend tests, 41 browser tests with installed Chrome, the production frontend build, and lint for the changed Muse store/test passed. The full backend run executed 228 tests: 227 passed, and one older fixture still equated answering with completing. After updating that fixture to include explicit step completion, all 41 affected backend tests passed. The earlier full 225-test backend suite also passed before adding the new checks.

## Loading and resume follow-up

The active hybrid configuration uses local SQLite and filesystem media. A basic local query took 1.8 ms. The student-session endpoint took 4439.8 ms against the local records because its multi-relation aggregate multiplied exposure, slide, and prediction rows. Independent aggregate subqueries reduced the same endpoint to 30.8 ms, with the same response size. These are local measurements, not a guarantee for every page or machine. Package lesson lists now prefetch slide activities to avoid a separate query for each activity.

The EEG read endpoint now returns completed slides, the latest saved answer/attempt for each slide, and the recording's last sequence number. The player restores the first unfinished step and resumes sequence numbering. Teacher-led players explicitly receive the participant's recording session ID. Practice answers are saved on submission without marking the step complete until Next succeeds; reload restores saved responses and completed steps. Saves are queued to preserve answer order, and navigation waits for pending answer writes.

Follow-up verification passed: 60 affected backend tests, 76 frontend tests, 12 browser workflow tests (including practice autosave/reload and EEG reload/resume), and the production build. Targeted lint still reports three pre-existing effect-state errors in `LiveEEG.tsx`.
