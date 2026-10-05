import json
import os
import time
import unittest
from pathlib import Path

from django.test.runner import DiscoverRunner


def category(test_id):
    name = test_id.lower()
    if "validation_api" in name or "account_management" in name:
        return "security"
    if any(word in name for word in ("login", "logout", "role_access", "registration")):
        return "access"
    if any(word in name for word in ("pipeline", "numerical", "tbr", "muse_values")):
        return "eeg"
    if any(word in name for word in ("query_count", "latency")):
        return "usability"
    if any(word in name for word in ("report", "analytics", "percentage")):
        return "reports"
    if "end_to_end" in name:
        return "session"
    if any(word in name for word in ("control", "intervention", "reinvite", "override")):
        return "commands"
    if any(word in name for word in ("reject", "denies", "requires", "cannot", "private", "access", "stale", "upload", "storage")):
        return "security"
    if "class_sessions" in name:
        return "session"
    return "lessons"


class Result(unittest.TextTestResult):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.records = []
        self.started = {}

    def startTest(self, test):
        self.started[test.id()] = time.perf_counter()
        super().startTest(test)

    def record(self, test, status, actual):
        self.records.append({"id": test.id(), "name": test.id().split(".")[-1].replace("test_", "").replace("_", " "),
                             "category": category(test.id()), "status": status,
                             "expected": test.shortDescription() or "All assertions in this automated test pass.",
                             "actual": actual[:4000], "duration_ms": round((time.perf_counter() - self.started.get(test.id(), time.perf_counter())) * 1000, 2)})
        Path(os.environ["CORTEX_VALIDATION_RESULTS"]).write_text(json.dumps(self.records), encoding="utf-8")

    def addSuccess(self, test):
        super().addSuccess(test)
        self.record(test, "passed", "All assertions passed.")

    def addFailure(self, test, err):
        super().addFailure(test, err)
        self.record(test, "failed", f"{err[0].__name__}: {err[1]}")

    def addError(self, test, err):
        super().addError(test, err)
        self.record(test, "error", f"{err[0].__name__}: {err[1]}")

    def addSkip(self, test, reason):
        super().addSkip(test, reason)
        self.record(test, "skipped", reason)

    def addExpectedFailure(self, test, err):
        super().addExpectedFailure(test, err)
        self.record(test, "failed", f"Known failure: {err[1]}")

    def addUnexpectedSuccess(self, test):
        super().addUnexpectedSuccess(test)
        self.record(test, "failed", "A test marked as an expected failure unexpectedly passed; review its expectation.")

    def addSubTest(self, test, subtest, err):
        super().addSubTest(test, subtest, err)
        if err is not None:
            self.record(subtest, "failed", f"{err[0].__name__}: {err[1]}")


class Runner(DiscoverRunner):
    def get_resultclass(self):
        return Result
