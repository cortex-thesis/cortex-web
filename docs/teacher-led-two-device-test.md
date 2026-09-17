# Teacher-led sessions on two devices

Classes, enrollments, curriculum packages, lesson activities, teacher controls,
invitations, and reports use the existing Django API backed by Supabase PostgreSQL.
Database credentials remain on the backend. No browser Supabase key is needed.

1. Keep `CORTEX_TEMPLATE_ONLY=false` in the root `.env` and configure `DATABASE_URL`
   (or the `DB_*` connection settings) for the same Supabase project.
2. Run `.\.venv\Scripts\python.exe manage.py migrate`, then restart the backend
   and frontend with `start-cortex.bat`. Vite listens on port 5173 on the LAN;
   Django can stay on loopback because Vite proxies `/api`.
3. Find the computer's Wi-Fi/Ethernet IPv4 address using `ipconfig`. Open
   `http://<computer-ip>:5173` on both devices on the same network. Allow the
   frontend through Windows Firewall on the private network if necessary.
   Development settings permit private addresses resolved for this computer.
   If your adapter address is not resolved automatically, append it to
   `DJANGO_ALLOWED_HOSTS` in `.env` and restart Django.
4. Sign in as the teacher on one device and a student on the other. Create or
   choose an active section and enroll the student, or have the student join
   using its class code. Invitations go to that section's enrolled students.
5. Open **Sessions**, choose the section, and select **Open lobby and invite
   students**. The student receives a prompt within five seconds. Offline
   students see open sessions after signing in. The teacher sees the full roster
   and can re-invite students who selected **Later** without creating duplicate
   notification rows.
6. Have the student join the lobby. Select and apply an approved lesson on the
   teacher device. Expand **Lesson data and references** to inspect lesson steps
   and attached materials. Start the lesson; connect the student's headset to
   continue into the existing EEG lesson flow.
7. Verify pause/resume, class mode changes, and lesson changes on the student
   device. End the session and reopen its saved overview/CSV report.

The lobby and controls poll every three seconds. Each device keeps its own
login cookie. Invitations do not automatically join students or interrupt an
existing lesson. Headset pairing requires a browser secure context: use trusted
HTTPS for a remote device that needs Web Bluetooth; LAN HTTP is sufficient to
test invitations, joining the lobby, and teacher controls.
