# Cortex on your Mac

Double-click **Cortex** on the Desktop. It starts Django and React, waits for both to respond, and opens Cortex in a Chrome app-style window. If Chrome is unavailable, it uses the default browser. Repeated launches reuse the running servers.

Double-click **Stop Cortex** to stop the servers started by the launcher. Closing the browser window alone leaves the servers running. After restarting your Mac, double-click Cortex again. Nothing is configured to run automatically at login.

The database mode follows `.env`. With `CORTEX_OFFLINE_SYNC=true`, Cortex uses `.runtime/offline.sqlite3` and synchronizes with the configured Supabase project after first-time initialization. Sign in with an account imported from that project. See [offline sync](offline-sync.md).

The earlier standalone demonstration database remains in `db.sqlite3`; it is used when `CORTEX_TEMPLATE_ONLY=true` and offline sync is disabled. Switching modes selects a different database; it does not merge the two databases.

The launcher binds both servers to `127.0.0.1`. Its startup log and backend/frontend logs are in `.runtime/mac-launcher/`. If a port is occupied by another application, the launcher reports the problem without stopping that application.

Django runs with request threading enabled so a slow connection or EEG request can coexist with connectivity probes. The health and sync-status probes skip classroom-presence cleanup; ordinary authenticated API requests still perform that cleanup.

## Local installation layout

- `.venv/`: permanent Python environment with `requirements.txt` installed.
- `.runtime/node/`: local Node.js runtime (24.13.0 on this Mac).
- `frontend/node_modules/`: dependencies installed from the frontend lockfile.
- `.env`: private local configuration, including the generated Django secret.
- `.runtime/apps/Cortex.app` and `.runtime/apps/Stop Cortex.app`: generated application bundles.
- Desktop copies of those apps point to this project's absolute location.

Keep the project at its current location. If you move it, run `python3 scripts/create_mac_apps.py` from its new location and replace the two Desktop apps with the newly generated bundles. The Desktop apps require this project and its dependencies; they are not a self-contained distributable installer.

## Restore the setup

With Python 3.12+ and Node 24 installed, create the Python environment and install dependencies:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
cd frontend
npm ci
cd ..
```

For a fresh local setup, create `.env` with `CORTEX_TEMPLATE_ONLY=true`, `CORTEX_OFFLINE_SYNC=false`, `DJANGO_DEBUG=true`, `CORTEX_ENABLE_DEMO_ACCOUNTS=true`, and a unique `DJANGO_SECRET_KEY`. Preserve an existing configuration when restoring a project with saved data.

```sh
.venv/bin/python manage.py migrate
.venv/bin/python manage.py shell -c 'from web.views import _ensure_demo_accounts; _ensure_demo_accounts()'
# Seed the bundled lessons in a fresh local database:
.venv/bin/python manage.py sync_integrated_lessons --owner super-admin-demo
python3 scripts/create_mac_apps.py
```

Copy the two generated `.app` bundles from `.runtime/apps/` onto the Desktop. The launcher finds Node in `.runtime/node/bin/node`, on PATH, or in the usual Homebrew locations.

## Command-line controls

```sh
.venv/bin/python scripts/mac_launcher.py start
.venv/bin/python scripts/mac_launcher.py status
.venv/bin/python scripts/mac_launcher.py stop --quiet
```

Desktop startup uses the connected React screens even though Django uses local SQLite. It does not automatically reseed lessons, reset data, or install packages on each launch.

### Run locally without background cloud connections

Keep `CORTEX_OFFLINE_SYNC=true` to use the initialized replica at
`.runtime/offline.sqlite3`. Set `CORTEX_SYNC_PAUSED=true` and restart Cortex to
pause the automatic Supabase worker. The status banner will say **Local mode**.
Pages, synced lesson files, and new saves use this Mac; cloud updates remain
unsynced until you set `CORTEX_SYNC_PAUSED=false` and restart while connected.
YouTube lesson videos still require internet. Fonts are bundled locally.
