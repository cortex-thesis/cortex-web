# Cortex security and privacy baseline

This baseline applies to the student, teacher, and administrator workflows. It is an implementation and deployment checklist, not legal advice. The school/data controller must approve the final notice, consent wording, retention schedule, and deletion process.

## Consent and non-diagnostic messaging

- Obtain and record versioned, affirmative consent before EEG processing, journal/media collection, and sharing with school staff. Store consent type, version, decision, and timestamp.
- Explain purpose, data categories, recipients, withdrawal, retention, and deletion in age-appropriate language. For minors, obtain the legally required parent/guardian authorization and student assent.
- EEG-derived states are product interaction signals, not medical diagnoses. UI, exports, and teacher messages must say “focus signal,” “session state,” or “learning support”; never “diagnosis,” “disorder,” or clinical conclusions.

## Identity and access

- Use Django authentication with role-bound profiles. Teachers may manage only classes assigned to them; students may access only active enrollments and their own sessions.
- Session records use UUIDs and expose a stable pseudonym rather than a student username or name to EEG/analytics integrations.
- Use HTTPS, secure HttpOnly session cookies, SameSite cookies, CSRF protection, strong passwords, and a non-default `DJANGO_SECRET_KEY` in production. Do not put secrets in source, frontend bundles, logs, or URLs.

## Retention and deletion

- Define and publish a school-approved retention schedule before production. A recommended starting point is: account/profile data while enrolled plus the school’s required period; raw EEG and audio for the shortest documented period; derived session summaries only as long as educationally necessary; audit records for the approved compliance period.
- Provide verified deletion/export workflows for student data. Deletion must remove or anonymize linked sessions, journal/media objects, consents where legally required to retain proof, and backups according to the backup expiry window.
- Soft removal is used for enrollment history (`removed_at`); it is not a substitute for the approved data deletion process.

## Uploads and media

- Accept uploads only through authenticated, role-authorized endpoints. Enforce an allowlist of MIME types and extensions, size limits, malware scanning, randomized names, and storage outside the web root or in private object storage.
- Never trust client filenames or content types. Serve media through authorization checks and short-lived signed URLs. The current settings cap request bodies at 10 MB and in-memory uploads at 5 MB; media endpoints must enforce stricter per-type limits when added.

## Audit logging

- Record account creation, login/logout, consent decisions, class creation/assignment, enrollment changes, and session start/end. Logs contain action, object type/id, actor, timestamp, and minimal metadata.
- Do not log passwords, raw EEG, journal text, audio, access tokens, or unnecessary student identifiers. Restrict audit-log access to authorized administrators and monitor unusual access.

## Backups and operations

- Encrypt backups in transit and at rest, restrict backup access, test restoration regularly, and document the backup expiry window. Apply deletion requests to active data and expire corresponding backup copies on schedule.
- Use separate development/test data, rotate secrets, patch dependencies, enable error monitoring without sensitive payloads, and review access quarterly.

## Implemented baseline

The Django app provides role-aware account/profile, class creation and teacher assignment, enrollment/removal, consent recording, pseudonymous session linkage, and audit records. Production settings enable secure transport/cookie headers and upload request limits when `DJANGO_DEBUG=false`. Before deployment, configure HTTPS, secret values, database backups, malware scanning/storage, and the school-approved retention/deletion policy.
