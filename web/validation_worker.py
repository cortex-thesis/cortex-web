"""Run fixed local suites with timeouts and retain sanitized per-check results."""
import json
import os
import shutil
import socket
import re
import signal
import subprocess
import sys
import tempfile
import uuid
import xml.etree.ElementTree as ET
from pathlib import Path

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "web.validation_settings")
import django
django.setup()

from .validation import history, now, root, save

NODE_CATEGORY = {"api": "security", "eeg-transitions": "adaptive", "focus-templates": "adaptive",
                 "focus-performance": "reports", "lesson-player-regressions": "usability",
                 "mini-games": "lessons", "calm-activities": "adaptive", "bgm-fade": "regression",
                 "youtube-lifecycle": "regression", "validation-ui": "usability"}

def infrastructure(suite, actual):
    return {"id": f"infrastructure.{suite}", "name": f"{suite} runner", "category": "regression",
            "status": "error", "expected": "The test suite starts and returns individual test results.", "actual": actual, "duration_ms": 0}

def run_process(command, cwd, env=None, timeout=30):
    """Terminate the owned process tree if a suite times out (including Vite/Chromium)."""
    process = subprocess.Popen(command, cwd=cwd, env=env, stdin=subprocess.DEVNULL,
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                               start_new_session=os.name != 'nt',
                               creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
    try:
        stdout, stderr = process.communicate(timeout=timeout)
        return subprocess.CompletedProcess(command, process.returncode, stdout, stderr)
    except subprocess.TimeoutExpired:
        if os.name == 'nt':
            subprocess.run(['taskkill', '/PID', str(process.pid), '/T', '/F'], capture_output=True,
                           creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
        else:
            os.killpg(process.pid, signal.SIGKILL)
        process.communicate()
        raise

def browser_results(suite, prefix=""):
    checks = []
    for child in suite.get('suites', []):
        checks.extend(browser_results(child, prefix + child.get('title', '') + ' / '))
    for spec in suite.get('specs', []):
        title = spec['title']
        category = re.search(r'\[(\w+)\]', title)
        for test in spec.get('tests', []):
            result = test.get('results', [{}])[-1]
            status = result.get('status', 'failed')
            actual = '\n'.join(error.get('message', 'Browser assertion failed') for error in result.get('errors', []))
            checks.append({'id': 'browser.' + prefix + title, 'name': title,
                           'category': category.group(1) if category else 'usability',
                           'status': 'passed' if status == 'passed' else 'skipped' if status == 'skipped' else 'failed',
                           'expected': 'Browser actions, layout and accessibility assertions pass using synthetic API fixtures.',
                           'actual': re.sub(r'\x1b\[[0-9;]*m', '', actual)[:4000] or ('All browser assertions passed.' if status == 'passed' else status),
                           'duration_ms': result.get('duration', 0)})
    return checks

def main(run_id):
    run_id = uuid.UUID(run_id).hex
    path = root() / f"{run_id}.json"
    record = json.loads(path.read_text(encoding="utf-8"))
    previous = next((run for run in history() if run["id"] != run_id and run["status"] == "complete"), None)
    try:
        with tempfile.TemporaryDirectory(prefix="cortex-validation-") as temporary:
            results = Path(temporary) / "backend.json"
            environment = os.environ.copy()
            environment.update({"CORTEX_VALIDATION_RESULTS": str(results), "CORTEX_VALIDATION_EEG_ROOT": str(Path(temporary) / "eeg"),
                                "DJANGO_SETTINGS_MODULE": "web.validation_settings", "CORTEX_TEMPLATE_ONLY": "true"})
            try:
                completed = run_process([sys.executable, "manage.py", "test", "web", "--settings=web.validation_settings",
                                            "--testrunner=web.validation_runner.Runner", "--noinput", "--verbosity=0"],
                                           cwd=Path(__file__).resolve().parents[1], env=environment, timeout=600)
                if results.exists():
                    record["tests"].extend(json.loads(results.read_text(encoding="utf-8")))
                if not results.exists() or (completed.returncode and not any(test["status"] in ("failed", "error") for test in record["tests"])):
                    record["tests"].append(infrastructure("Backend", "Backend setup or teardown failed. Run the documented CLI command for local diagnostics."))
            except subprocess.TimeoutExpired:
                record["tests"].append(infrastructure("Backend", "Backend exceeded its 10-minute execution limit."))
            save(path, record)
            frontend = Path(__file__).resolve().parents[1] / "frontend"
            files = sorted((frontend / "tests").glob("*.test.mjs"))
            node = shutil.which("node")
            if not node:
                record["tests"].append(infrastructure("Frontend", "Node.js is not installed or is not available to the backend process."))
            else:
                # Separate files preserve their source/category and stable test identities.
                for file in files:
                    try:
                        completed = run_process([node, "--test", "--test-reporter=junit", str(file)], cwd=frontend, timeout=30)
                        document = ET.fromstring(completed.stdout)
                        cases = list(document.iter("testcase"))
                        for case in cases:
                            failure = case.find("failure")
                            error = case.find("error")
                            issue = failure if failure is not None else error
                            status = "failed" if issue is not None else "skipped" if case.find("skipped") is not None else "passed"
                            record["tests"].append({"id": f"frontend.{file.stem}.{case.get('name')}", "name": case.get("name"),
                                "category": NODE_CATEGORY.get(file.name.replace(".test.mjs", ""), "regression"), "status": status,
                                "expected": "All assertions in this automated test pass.",
                                "actual": (issue.get("message", "Assertion failed")[:4000] if issue is not None else "All assertions passed." if status == "passed" else "Test skipped."),
                                "duration_ms": round(float(case.get("time", 0)) * 1000, 2)})
                        if not cases:
                            raise ValueError("No cases")
                    except (subprocess.TimeoutExpired, ET.ParseError, ValueError):
                        record["tests"].append(infrastructure(file.name, "Suite timed out or did not return valid test results."))
                    save(path, record)
                browser_file = Path(temporary) / 'browser.json'
                with socket.socket() as reservation:
                    reservation.bind(('127.0.0.1', 0))
                    port = reservation.getsockname()[1]
                environment.update({'CORTEX_BROWSER_RESULTS': str(browser_file), 'CORTEX_BROWSER_TEST_PORT': str(port),
                                    'CORTEX_BROWSER_ARTIFACTS': str(Path(temporary) / 'browser-artifacts'),
                                    'PLAYWRIGHT_BROWSERS_PATH': str(root().parent / 'playwright-browsers')})
                try:
                    run_process([node, str(frontend / 'node_modules' / '@playwright' / 'test' / 'cli.js'),
                                    'test', '--config=playwright.config.mjs'], cwd=frontend, env=environment,
                                   timeout=300)
                    document = json.loads(browser_file.read_text(encoding='utf-8'))
                    browser_checks = browser_results(document)
                    if not browser_checks:
                        raise ValueError('No browser checks')
                    record['tests'].extend(browser_checks)
                except (subprocess.TimeoutExpired, ValueError, OSError):
                    record['tests'].append(infrastructure('Browser', 'Browser suite could not complete. Install frontend dependencies and Chromium using the validation setup guide.'))
        old = {test["id"]: test for test in (previous or {}).get("tests", [])}
        for test in record["tests"]:
            prior = old.get(test["id"])
            test["retest"] = "corrected" if prior and prior["status"] in ("failed", "error") and test["status"] == "passed" else "still failing" if prior and prior["status"] in ("failed", "error") and test["status"] in ("failed", "error") else ""
        record.update(status="complete", finished_at=now())
    except Exception:
        record.update(status="error", finished_at=now(), detail="Validation worker failed. Check backend installation and local runtime directory permissions.")
        record['tests'].append(infrastructure('Worker', record['detail']))
    finally:
        save(path, record)
        (root() / "run.lock").unlink(missing_ok=True)

if __name__ == "__main__":
    main(sys.argv[1])
