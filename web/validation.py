"""Restricted, asynchronous validation API. Commands and test labels are fixed."""
import json
import os
import subprocess
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from .models import Profile
from .views import _require_profile

CATEGORIES = {
    "access": "Login, logout and role access",
    "eeg": "EEG filtering, band power, TBR and events",
    "adaptive": "Adaptive states and signal fallback",
    "lessons": "Answers, progress, resume and completion",
    "commands": "Teacher authorization, targeting and retries",
    "reports": "Report totals and exports",
    "session": "Session integration",
    "security": "Routes, uploads, stale data and privacy",
    "usability": "Performance and accessibility",
    "regression": "Regression and correction rechecks",
}
MANUAL = [
    ("headset", "session", "Pair a real headset, complete an adaptive lesson, and verify the teacher report on a second device."),
    ("phone", "usability", "Check login, lesson and reports at phone widths; verify no clipped content or horizontal scrolling."),
    ("keyboard", "usability", "Complete navigation and lesson controls using only the keyboard; verify visible focus and no traps."),
    ("contrast", "usability", "Measure text contrast (4.5:1 normal, 3:1 large) and control/focus contrast (3:1)."),
    ("motion", "usability", "Enable reduced motion in the operating system and verify lesson and navigation animations."),
    ("latency", "usability", "Measure headset-to-adaptation and teacher-command latency on target devices; record measurements and acceptance threshold."),
]

def now():
    return datetime.now(timezone.utc).isoformat()

def root():
    path = Path(settings.BASE_DIR) / ".runtime" / "validation"
    path.mkdir(parents=True, exist_ok=True)
    return path

def save(path, value):
    temporary = path.with_suffix(f".{uuid.uuid4().hex}.tmp")
    temporary.write_text(json.dumps(value), encoding="utf-8")
    os.replace(temporary, path)

def history():
    records = []
    for path in root().glob("*.json"):
        try:
            record = json.loads(path.read_text(encoding="utf-8"))
            if record['status'] == 'running' and (datetime.now(timezone.utc) - datetime.fromisoformat(record['started_at'])).total_seconds() > 1800:
                record.update(status='error', finished_at=now(), detail='This run was interrupted or exceeded its 30-minute limit. Run the tests again.')
                record['tests'].append({'id': 'infrastructure.interrupted', 'name': 'Interrupted run', 'category': 'regression', 'status': 'error',
                                        'expected': 'The full validation run completes.', 'actual': record['detail'], 'duration_ms': 0})
                save(path, record)
                (root() / 'run.lock').unlink(missing_ok=True)
            records.append(record)
        except (OSError, ValueError, KeyError, TypeError):
            continue
    return sorted(records, key=lambda record: record["started_at"], reverse=True)[:20]

@require_http_methods(["GET", "POST"])
def validation_runs(request):
    profile, error = _require_profile(request, [Profile.Role.ADMIN])
    if error:
        return error
    if not profile.is_super_admin:
        return JsonResponse({"detail": "Super administrator access required."}, status=403)
    if request.method == "GET":
        response = JsonResponse({"categories": CATEGORIES, "manual_checks": MANUAL, "runs": history()})
        response["Cache-Control"] = "no-store"
        return response
    lock = root() / "run.lock"
    try:
        descriptor = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        os.close(descriptor)
    except FileExistsError:
        # Recover locks left by a stopped server after the total execution limit.
        if datetime.now().timestamp() - lock.stat().st_mtime > 1800:
            lock.unlink(missing_ok=True)
            return JsonResponse({"detail": "An interrupted run was cleared. Please run again."}, status=409)
        return JsonResponse({"detail": "A validation run is already in progress."}, status=409)
    run_id = uuid.uuid4().hex
    record = {"id": run_id, "started_at": now(), "status": "running", "tests": [], "manual": {}, "requested_by": profile.pk}
    path = root() / f"{run_id}.json"
    try:
        save(path, record)
        environment = os.environ.copy()
        for key in list(environment):
            if key.startswith(("DB_", "SUPABASE_", "AWS_")) or key in ("DATABASE_URL", "CORTEX_TEST_POSTGRES"):
                environment.pop(key, None)
        environment.update({"DJANGO_SETTINGS_MODULE": "web.validation_settings", "CORTEX_TEMPLATE_ONLY": "true", "CORTEX_OFFLINE_SYNC": "false"})
        subprocess.Popen([sys.executable, "-m", "web.validation_worker", run_id], cwd=settings.BASE_DIR,
                         env=environment, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                         stderr=subprocess.DEVNULL, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
    except Exception:
        lock.unlink(missing_ok=True)
        record.update(status="error", detail="Could not start the validation worker. Check the backend Python installation.")
        save(path, record)
        return JsonResponse(record, status=503)
    return JsonResponse(record, status=202)

@require_http_methods(["POST"])
def validation_manual(request, run_id):
    profile, error = _require_profile(request, [Profile.Role.ADMIN])
    if error:
        return error
    if not profile.is_super_admin:
        return JsonResponse({"detail": "Super administrator access required."}, status=403)
    edit_lock = None
    try:
        run_id = uuid.UUID(str(run_id)).hex
        path = root() / f"{run_id}.json"
        lock = root() / f'{run_id}.edit.lock'
        try:
            with lock.open('x'):
                pass
            edit_lock = lock
        except FileExistsError:
            return JsonResponse({'detail': 'Another evidence update is in progress. Please retry.'}, status=409)
        record = json.loads(path.read_text(encoding="utf-8"))
        data = json.loads(request.body)
        if record["status"] == "running":
            return JsonResponse({"detail": "Wait for the automated run to finish."}, status=409)
        if data.get("check") not in {item[0] for item in MANUAL} or data.get("status") not in ("passed", "failed", "blocked"):
            raise ValueError
        evidence = data.get("actual", "")
        expected = data.get("expected", "")
        if not isinstance(evidence, str) or not isinstance(expected, str) or not evidence.strip() or not expected.strip() or max(len(evidence), len(expected)) > 2000:
            raise ValueError
        previous = record['manual'].get(data['check'])
        entry = {"status": data["status"], "expected": expected, "actual": evidence, "checked_at": now(), "checked_by": profile.pk,
                 'retest': 'corrected' if previous and previous['status'] == 'failed' and data['status'] == 'passed' else 'still failing' if previous and previous['status'] == 'failed' and data['status'] == 'failed' else '',
                 'history': ([{key: value for key, value in previous.items() if key != 'history'}] + previous.get('history', [])) if previous else []}
        record["manual"][data["check"]] = entry
        save(path, record)
        return JsonResponse(record)
    except FileNotFoundError:
        return JsonResponse({"detail": "Run not found."}, status=404)
    except (ValueError, TypeError, AttributeError):
        return JsonResponse({"detail": "Provide a valid check, status, expected result and actual evidence (up to 2,000 characters each)."}, status=400)
    finally:
        if edit_lock is not None:
            edit_lock.unlink(missing_ok=True)
