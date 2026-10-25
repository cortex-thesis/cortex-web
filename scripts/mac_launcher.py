"""Start/stop the project's local servers from the macOS desktop apps."""
from __future__ import annotations

import argparse
import fcntl
import json
import logging
from logging.handlers import RotatingFileHandler
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import sys
import time
from urllib.error import URLError
from urllib.request import ProxyHandler, build_opener

PROJECT = Path(__file__).resolve().parents[1]
RUNTIME = PROJECT / ".runtime" / "mac-launcher"
STATE = RUNTIME / "servers.json"
URL = "http://localhost:5173/"
HTTP = build_opener(ProxyHandler({}))
LOG = logging.getLogger("cortex-launcher")


def fetch(path: str, port: int) -> str:
    with HTTP.open(f"http://127.0.0.1:{port}{path}", timeout=2) as response:
        return response.read(2_000_000).decode("utf-8")


def healthy(role: str) -> bool:
    try:
        if role == "backend":
            result = json.loads(fetch("/api/health/", 8000))
            return result.get("service") == "cortex" and result.get("status") == "ok"
        source = fetch("/src/App.tsx", 5173)
        return "ClassSessionInvitation" in source and "SyncStatus" in source
    except (OSError, URLError, ValueError):
        return False


def listening(port: int) -> bool:
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=0.5):
            return True
    except OSError:
        return False


def identity(pid: int) -> str:
    """Record command and launch time so Stop cannot target a reused PID."""
    result = subprocess.run(
        ["/bin/ps", "-p", str(pid), "-o", "lstart=", "-o", "command="],
        capture_output=True, text=True, check=False,
    )
    if result.returncode != 0:
        return ""
    parts = result.stdout.strip().split(maxsplit=5)
    if len(parts) != 6:
        return ""
    # Framework Python execs from the venv shim into Python.app on macOS.
    # Keep the immutable launch time and project arguments, not that shim path.
    started, command = " ".join(parts[:5]), parts[5]
    for entry in (PROJECT / "manage.py", PROJECT / "frontend/node_modules/vite/bin/vite.js"):
        position = command.find(str(entry))
        if position >= 0:
            return started + " " + command[position:]
    return ""


def read_state() -> dict:
    try:
        value = json.loads(STATE.read_text())
        return value if isinstance(value, dict) else {}
    except (OSError, ValueError):
        return {}


def save_state(state: dict) -> None:
    temporary = STATE.with_suffix(".tmp")
    temporary.write_text(json.dumps(state, indent=2))
    temporary.chmod(0o600)
    temporary.replace(STATE)


def owned(record: dict) -> bool:
    pid = record.get("pid")
    expected = record.get("identity")
    return (
        type(pid) is int and pid > 1 and isinstance(expected, str)
        and bool(expected) and str(PROJECT) in expected and identity(pid) == expected
    )


def stop_record(record: dict) -> None:
    if not owned(record):
        return
    pid = record["pid"]
    try:
        os.kill(pid, signal.SIGTERM)
        deadline = time.monotonic() + 8
        while time.monotonic() < deadline and owned(record):
            time.sleep(0.2)
        if owned(record):
            os.kill(pid, signal.SIGKILL)
    except ProcessLookupError:
        pass


def node_binary() -> Path:
    candidates = [PROJECT / ".runtime/node/bin/node"]
    candidates += [Path(p) for p in (shutil.which("node"),) if p]
    candidates += [Path("/opt/homebrew/bin/node"), Path("/usr/local/bin/node")]
    for candidate in candidates:
        if candidate.is_file() and os.access(candidate, os.X_OK):
            return candidate
    raise RuntimeError("Node.js is missing. See docs/mac-desktop-app.md to restore the local setup.")


def start_servers() -> None:
    python = PROJECT / ".venv/bin/python"
    vite = PROJECT / "frontend/node_modules/vite/bin/vite.js"
    if not python.exists() or not vite.exists() or not (PROJECT / ".env").exists():
        raise RuntimeError("The local Cortex setup is incomplete. See docs/mac-desktop-app.md.")
    commands = {
        "backend": [str(python), "-u", str(PROJECT / "manage.py"), "runserver",
                    "127.0.0.1:8000", "--noreload"],
        "frontend": [str(node_binary()), str(vite), "--host", "127.0.0.1",
                     "--port", "5173", "--strictPort"],
    }
    ports = {"backend": 8000, "frontend": 5173}
    state = read_state()
    started = []
    children = []
    try:
        for role, command in commands.items():
            if healthy(role):
                LOG.info("Reusing ready %s", role)
                continue
            if listening(ports[role]):
                # Another launcher may have just spawned this project's server.
                if owned(state.get(role, {})):
                    continue
                raise RuntimeError(
                    f"Port {ports[role]} is already in use by a service that is not ready as Cortex. "
                    "Close that service and try again."
                )
            environment = os.environ.copy()
            environment.update({"PYTHONUNBUFFERED": "1", "DATABASE_CONN_MAX_AGE": "60",
                                # Django's SQLite option does not imply mock React screens.
                                "VITE_TEMPLATE_ONLY": "false"})
            environment.pop("VITE_API_URL", None)
            # This app belongs to this checkout, even if launched from an activated venv.
            environment.pop("DJANGO_SETTINGS_MODULE", None)
            cwd = PROJECT if role == "backend" else PROJECT / "frontend"
            log_path = RUNTIME / f"{role}.log"
            with log_path.open("ab") as output:
                process = subprocess.Popen(command, cwd=cwd, env=environment,
                                           stdin=subprocess.DEVNULL, stdout=output,
                                           stderr=subprocess.STDOUT, start_new_session=True)
            record = {"pid": process.pid, "identity": identity(process.pid)}
            if not record["identity"]:
                process.terminate()
                raise RuntimeError(f"Could not verify the {role} process. Check {log_path}.")
            state[role] = record
            save_state(state)
            started.append(role)
            children.append((role, process))
            LOG.info("Started %s PID %s", role, process.pid)
        deadline = time.monotonic() + 60
        while time.monotonic() < deadline:
            if healthy("backend") and healthy("frontend"):
                save_state(state)
                return
            for role, process in children:
                if process.poll() is not None:
                    raise RuntimeError(f"Cortex {role} stopped during startup. See {RUNTIME / (role + '.log')}.")
            time.sleep(0.4)
        raise RuntimeError(f"Cortex did not become ready within 60 seconds. Logs: {RUNTIME}")
    except Exception:
        for role in started:
            stop_record(state.pop(role, {}))
        save_state(state)
        raise


def open_window() -> None:
    chrome = Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
    if chrome.exists():
        subprocess.run(["/usr/bin/open", "-n", "-a", "/Applications/Google Chrome.app",
                        "--args", f"--app={URL}"], check=True)
    else:
        subprocess.run(["/usr/bin/open", URL], check=True)


def dialog(message: str) -> None:
    subprocess.run(["/usr/bin/osascript", "-e",
                    'on run argv\ndisplay dialog (item 1 of argv) with title "Cortex" '
                    'buttons {"OK"} default button "OK"\nend run', message],
                   capture_output=True, check=False)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("start", "stop", "status"), nargs="?", default="start")
    parser.add_argument("--no-browser", action="store_true", help="Start without opening a window.")
    parser.add_argument("--quiet", action="store_true", help="Avoid native dialogs (CLI checks).")
    args = parser.parse_args()
    RUNTIME.mkdir(parents=True, exist_ok=True)
    handler = RotatingFileHandler(RUNTIME / "launcher.log", maxBytes=2_000_000, backupCount=2)
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    LOG.addHandler(handler)
    LOG.setLevel(logging.INFO)
    if args.action == "status":
        print(json.dumps({"backend_ready": healthy("backend"), "frontend_ready": healthy("frontend"),
                          "url": URL, "logs": str(RUNTIME)}, indent=2))
        return 0
    try:
        with (RUNTIME / "launcher.lock").open("a") as lock:
            # Serialize repeated double-clicks and Stop versus Start.
            fcntl.flock(lock.fileno(), fcntl.LOCK_EX)
            if args.action == "stop":
                state = read_state()
                for record in state.values():
                    stop_record(record)
                save_state({})
                LOG.info("Stopped launcher-owned servers")
            else:
                start_servers()
                if not args.no_browser:
                    open_window()
        return 0
    except Exception as error:
        LOG.exception("Cortex %s failed", args.action)
        message = f"{error}\n\nStartup logs: {RUNTIME}"
        print(message, file=sys.stderr)
        if not args.quiet:
            dialog(message)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
