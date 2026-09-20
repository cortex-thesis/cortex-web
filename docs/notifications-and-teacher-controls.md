# Notifications and teacher controls

Restart the Django backend after updating. The launcher uses `--noreload`, so refreshing the browser alone does not load backend changes. No database migration is required.

## Notifications

Students, teachers, school administrators, and super administrators have an inbox backed by `/api/notifications/`. The inbox refreshes every ten seconds and supports search, category and unread filters, individual read acknowledgement, and marking all read. Read state is saved on the server. Notification links open their destination after successful acknowledgement.

Real events include class invitations, earned badges, shared journals, new accounts awaiting administrator approval, teacher takeover/release, and existing intervention alerts. Demo notifications have been removed. Each request is scoped to the signed-in recipient; administrator privileges do not expose another user's inbox.

## Free-mode override

1. Start a student free-mode EEG session in a class taught by the teacher.
2. Open the teacher dashboard. A student heartbeat is sent every two seconds; the dashboard refreshes every four seconds.
3. Use **Override - take control** beside the student. Choose focus, refocusing, or breathing, or pause/resume the session.
4. Use **Return to free mode** to restore adaptive student playback.

Taking control requires a student heartbeat within the last twelve seconds. Another teacher cannot take control, and classroom sessions use their own classroom controls. The student sees a teacher-guidance notice. A paused player preserves lesson progress. If connectivity is lost during teacher control, playback waits for reconnection. Control changes are audited, and student-generated mode updates cannot overwrite the teacher's choice.

Online presence and EEG freshness are separate: an online student can be visible while their headset is calibrating or disconnected. An EEG sample older than eight seconds is not shown as a current signal.

## Reporting basis

The teacher dashboard defaults to the current calendar month and supports another month, all time, or a specific active class. Completed sessions are included by their start timestamp using the server's reporting timezone. The displayed reporting month and last-updated timestamp describe the loaded dataset. Class and student counts describe current active classes and enrollments; live sessions are independent of the historical reporting period.

Dashboard state percentages use counts of valid recorded EEG samples (at least one accepted channel) from completed sessions, so longer recorded sessions contribute more samples. Zero-data sessions do not dilute the distribution. The interface reports the sample and measured-session counts and does not describe sample proportions as elapsed time.

State distributions use largest-remainder rounding: displayed nonempty distributions total 100%; empty distributions remain zero. Class analytics and historical reports retain their session-based aggregation, with explicit all-time labels on class analytics and student search. The decorative, fabricated focus sparkline was removed from student cards.

## Verification

Backend regression coverage: notification persistence and ownership for every role; badge notification deduplication; takeover, mode changes, pause/resume and release; unauthorized/stale-session rejection; month scoping, valid-sample filtering and percentage totals. A physical two-device test is still needed to verify the complete classroom network and headset experience.
