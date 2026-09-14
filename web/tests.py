import json
from datetime import timedelta

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone

from .models import Activity, AuditLog, BaselineEpoch, BaselineRecording, ConsentRecord, ContentAssignment, CurriculumPackage, DataLifecycleRequest, Enrollment, Intervention, JournalEntry, LearningSession, Lesson, Notification, Profile, ResearchAnalysisRecord, School, SchoolClass, SessionAnalytics, SessionEEGSample, SessionSlideExposure, Slide, UserPreference


class WorkflowTests(TestCase):
    def setUp(self):
        self.teacher = self._account("teacher", "Teacher", Profile.Role.TEACHER)
        self.admin = self._account("admin", "Administrator", Profile.Role.ADMIN)
        self.student = self._account("student", "Student", Profile.Role.STUDENT)
        self.other_student = self._account("other", "Other Student", Profile.Role.STUDENT)

    def _account(self, username, name, role):
        user = User.objects.create_user(username=username, password="a-very-long-test-password")
        return Profile.objects.create(user=user, display_name=name, role=role)

    def _login(self, profile):
        self.client.force_login(profile.user)

    def test_teacher_creates_class_and_enrolls_student(self):
        self._login(self.teacher)
        response = self.client.post("/api/classes/", data=json.dumps({"name": "Life Skills", "code": "LIFE1"}), content_type="application/json")
        self.assertEqual(response.status_code, 201)
        class_id = response.json()["id"]
        enroll = self.client.post(f"/api/classes/{class_id}/students/{self.student.pk}/")
        self.assertEqual(enroll.status_code, 201)
        self.assertTrue(Enrollment.objects.filter(student=self.student, removed_at__isnull=True).exists())

    def test_teacher_records_epoch_level_baseline(self):
        self._login(self.teacher)
        started = self.client.post("/api/baseline/", data=json.dumps({
            "participant_code": "P001", "condition": "neutral_baseline", "consent_confirmed": True,
            "planned_duration_seconds": 30, "epoch_length_seconds": 2,
            "selected_variables": ["raw_channels", "absolute_bands", "relative_bands", "theta_beta_ratio"],
        }), content_type="application/json")
        self.assertEqual(started.status_code, 201)
        recording_id = started.json()["id"]
        channels = {name: [float(index) for index in range(512)] for name in ("TP9", "AF7", "AF8", "TP10")}
        epoch = self.client.post(f"/api/baseline/{recording_id}/", data=json.dumps({
            "action": "epoch", "epoch_number": 1, "start_offset_ms": 0, "end_offset_ms": 2000,
            "raw_channels": channels, "absolute_band_powers": {"delta": 1, "theta": 4, "alpha": 3, "beta": 2, "gamma": 1},
            "relative_band_powers": {"delta": .1, "theta": .4, "alpha": .3, "beta": .2, "gamma": .1},
            "signal_quality": [2, 2, 2, 2], "accepted_channels": 4, "battery_level": 80,
        }), content_type="application/json")
        self.assertEqual(epoch.status_code, 201)
        saved = BaselineEpoch.objects.get(recording_id=recording_id)
        self.assertEqual(saved.sample_count, 512)
        self.assertEqual(saved.theta_beta_ratio, 2)
        detail = self.client.get(f"/api/baseline/{recording_id}/")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.json()["epochs"][0]["raw_channels"]["TP9"][511], 511.0)
        self.assertEqual(detail.json()["epochs"][0]["absolute_band_powers"]["theta"], 4.0)
        finished = self.client.post(f"/api/baseline/{recording_id}/", data=json.dumps({"action": "complete"}), content_type="application/json")
        self.assertEqual(finished.status_code, 200)
        self.assertEqual(BaselineRecording.objects.get(pk=recording_id).status, BaselineRecording.Status.COMPLETED)

    def test_admin_stores_structured_research_analysis(self):
        self.admin.admin_scope = Profile.AdminScope.SUPER
        self.admin.save(update_fields=["admin_scope"])
        self._login(self.admin)
        response = self.client.post("/api/admin/research-analyses/", data=json.dumps({
            "phase": "phase_2", "analysis_key": "filter_effectiveness",
            "scope_label": "Participant P01 - Session 1", "source_reference": "recording-001",
            "values": {"noise_attenuation_percent": 94.2, "alpha_retained_percent": 89.1},
            "result": "passed", "notes": "Validated preprocessing output.",
        }), content_type="application/json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(ResearchAnalysisRecord.objects.get().analysis_name, "Filter Effectiveness Check")
        self.assertEqual(self.client.get("/api/admin/research-analyses/").json()["records"][0]["values"]["noise_attenuation_percent"], 94.2)

    def test_super_admin_can_create_school_with_database_fields(self):
        self.admin.admin_scope = Profile.AdminScope.SUPER
        self.admin.save(update_fields=["admin_scope"])
        self._login(self.admin)
        response = self.client.post("/api/admin/schools/", data=json.dumps({
            "name": "Cortex Learning Center", "address": "Manila, Philippines",
            "contact_email": "office@cortex.test", "contact_number": "+63 900 000 0000",
        }), content_type="application/json")
        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload["address"], "Manila, Philippines")
        self.assertEqual(payload["contact_email"], "office@cortex.test")
        self.assertEqual(self.client.get("/api/admin/schools/").json()["schools"][0]["contact_number"], "+63 900 000 0000")

    def test_super_admin_can_add_active_teacher_to_selected_school(self):
        self.admin.admin_scope = Profile.AdminScope.SUPER
        self.admin.save(update_fields=["admin_scope"])
        school = School.objects.create(name="Teacher Assignment School")
        self._login(self.admin)
        response = self.client.post("/api/admin/accounts/", data=json.dumps({
            "username": "assigned-teacher", "name": "Assigned Teacher",
            "email": "teacher@assigned.test", "temporary_password": "strong-test-password-2026",
            "role": "teacher", "school_id": str(school.pk),
        }), content_type="application/json")
        self.assertEqual(response.status_code, 201)
        teacher = Profile.objects.get(user__username="assigned-teacher")
        self.assertEqual(teacher.school, school)
        self.assertEqual(teacher.account_status, Profile.AccountStatus.ACTIVE)
        accounts = self.client.get(f"/api/admin/accounts/?school_id={school.pk}").json()["accounts"]
        self.assertEqual([item["name"] for item in accounts], ["Assigned Teacher"])

    def test_super_admin_creates_school_admin_and_school_admin_manages_only_own_users(self):
        self.admin.admin_scope = Profile.AdminScope.SUPER
        self.admin.save(update_fields=["admin_scope"])
        school = School.objects.create(name="Managed School")
        other_school = School.objects.create(name="Other School")
        self._login(self.admin)
        created = self.client.post("/api/admin/accounts/", data=json.dumps({
            "username": "managed-admin", "name": "Managed Administrator",
            "email": "admin@managed.test", "temporary_password": "strong-school-admin-2026",
            "role": "admin", "school_id": str(school.pk),
        }), content_type="application/json")
        self.assertEqual(created.status_code, 201)
        school_admin = Profile.objects.get(user__username="managed-admin")
        self.assertTrue(school_admin.is_school_admin)
        self.assertEqual(school_admin.school, school)

        self._login(school_admin)
        teacher = self.client.post("/api/admin/accounts/", data=json.dumps({
            "username": "managed-teacher", "name": "Managed Teacher",
            "email": "teacher@managed.test", "temporary_password": "strong-managed-teacher-2026",
            "role": "teacher", "school_id": str(other_school.pk),
        }), content_type="application/json")
        self.assertEqual(teacher.status_code, 403)
        teacher = self.client.post("/api/admin/accounts/", data=json.dumps({
            "username": "managed-teacher", "name": "Managed Teacher",
            "email": "teacher@managed.test", "temporary_password": "strong-managed-teacher-2026",
            "role": "teacher",
        }), content_type="application/json")
        self.assertEqual(teacher.status_code, 201)
        managed_teacher = Profile.objects.get(user__username="managed-teacher")
        self.assertEqual(managed_teacher.school, school)
        self.assertEqual(managed_teacher.account_status, Profile.AccountStatus.ACTIVE)
        self.assertEqual(self.client.delete(f"/api/admin/accounts/{managed_teacher.pk}/status/").status_code, 200)
        managed_teacher.refresh_from_db()
        self.assertEqual(managed_teacher.account_status, Profile.AccountStatus.DISABLED)
        self.assertFalse(managed_teacher.user.is_active)

        forbidden_admin = self.client.post("/api/admin/accounts/", data=json.dumps({
            "username": "second-admin", "name": "Second Admin",
            "email": "second@managed.test", "temporary_password": "strong-second-admin-2026",
            "role": "admin",
        }), content_type="application/json")
        self.assertEqual(forbidden_admin.status_code, 403)

    def test_teacher_report_uses_owned_completed_session_analytics(self):
        school_class = SchoolClass.objects.create(name="Report Class", code="RPRT1", teacher=self.teacher, school_year="2026-2027")
        session = LearningSession.objects.create(school_class=school_class, student=self.student)
        LearningSession.objects.filter(pk=session.pk).update(
            started_at=timezone.now() - timedelta(minutes=20), ended_at=timezone.now(),
            status=LearningSession.Status.COMPLETED,
        )
        SessionAnalytics.objects.create(
            session=session, total_duration_seconds=1200, focused_seconds=900,
            focused_percentage=75, relaxed_percentage=15,
            distracted_percentage=10, overstimulated_percentage=0,
        )
        self._login(self.teacher)

        response = self.client.get(f"/api/teacher/reports/?class_id={school_class.pk}&range=month")

        self.assertEqual(response.status_code, 200)
        report = response.json()
        self.assertEqual(report["class_name"], "Report Class")
        self.assertEqual(report["summary"]["sessions"], 1)
        self.assertEqual(report["summary"]["average_focus_percentage"], 75)
        self.assertEqual(report["summary"]["focused_duration_seconds"], 900)

    def test_teacher_cannot_report_on_another_teachers_class(self):
        other_teacher = self._account("report-other", "Other Teacher", Profile.Role.TEACHER)
        other_class = SchoolClass.objects.create(name="Other Report", code="RPRT2", teacher=other_teacher)
        self._login(self.teacher)
        self.assertEqual(self.client.get(f"/api/teacher/reports/?class_id={other_class.pk}").status_code, 404)

    def test_teacher_can_filter_report_to_an_enrolled_student(self):
        school_class = SchoolClass.objects.create(name="Filtered Report", code="FLTR1", teacher=self.teacher)
        Enrollment.objects.create(school_class=school_class, student=self.student, enrolled_by=self.teacher)
        Enrollment.objects.create(school_class=school_class, student=self.other_student, enrolled_by=self.teacher)
        for student in (self.student, self.other_student):
            session = LearningSession.objects.create(school_class=school_class, student=student)
            LearningSession.objects.filter(pk=session.pk).update(ended_at=timezone.now(), status=LearningSession.Status.COMPLETED)
        self._login(self.teacher)

        response = self.client.get(f"/api/teacher/reports/?class_id={school_class.pk}&range=term&student_id={self.student.pk}")

        self.assertEqual(response.status_code, 200)
        report = response.json()
        self.assertEqual(report["selected_student_id"], self.student.pk)
        self.assertEqual(report["summary"]["sessions"], 1)
        self.assertEqual(report["sessions"][0]["student"]["name"], self.student.display_name)
        self.assertEqual(len(report["students"]), 2)

    def test_session_slide_timeline_feeds_advanced_teacher_report(self):
        school_class = SchoolClass.objects.create(name="Advanced Report", code="RPRT3", teacher=self.teacher)
        package = CurriculumPackage.objects.filter(is_active=True).first()
        lesson = Lesson.objects.create(package=package, title="Measured Lesson", status=Lesson.Status.APPROVED, created_by=self.admin)
        activity = Activity.objects.create(type=Activity.ActivityType.INTERACTIVE, title="Measured Content")
        slide = Slide.objects.create(lesson=lesson, activity=activity, position=1, title="Measured Slide")
        session = LearningSession.objects.create(school_class=school_class, student=self.student, lesson=lesson)
        self._login(self.student)

        entered = self.client.post(f"/api/sessions/{session.pk}/slides/{slide.pk}/", data=json.dumps({"action": "enter"}), content_type="application/json")
        self.assertEqual(entered.status_code, 201)
        self.assertEqual(SessionSlideExposure.objects.filter(session=session, exited_at__isnull=True).count(), 1)
        self.assertEqual(self.client.post(f"/api/sessions/{session.pk}/end/").status_code, 200)
        self.assertFalse(SessionSlideExposure.objects.filter(session=session, exited_at__isnull=True).exists())

        self._login(self.teacher)
        report = self.client.get(f"/api/teacher/reports/advanced/?class_id={school_class.pk}&range=term")
        self.assertEqual(report.status_code, 200)
        payload = report.json()
        self.assertEqual(payload["lessons"][0]["title"], "Measured Lesson")
        self.assertEqual(payload["lessons"][0]["slides"][0]["title"], "Measured Slide")
        self.assertEqual(payload["students"][0]["sessions"][0]["slides"][0]["content_title"], "Measured Content")

    def test_muse_values_are_stored_live_for_teacher_and_summarized_when_session_ends(self):
        school_class = SchoolClass.objects.create(name="Live Muse Class", code="MUSE1", teacher=self.teacher)
        Enrollment.objects.create(school_class=school_class, student=self.student, enrolled_by=self.teacher)
        package = CurriculumPackage.objects.filter(is_active=True).first()
        lesson = Lesson.objects.create(package=package, title="Live lesson", status=Lesson.Status.APPROVED, created_by=self.admin)
        activity = Activity.objects.create(type=Activity.ActivityType.INTERACTIVE, title="Live content")
        slide = Slide.objects.create(lesson=lesson, activity=activity, position=1, title="Live slide")
        session = LearningSession.objects.create(school_class=school_class, student=self.student, lesson=lesson)
        self._login(self.student)
        response = self.client.post(f"/api/sessions/{session.pk}/eeg/", data=json.dumps({
            "slide_id": slide.pk,
            "bands": {"delta": 0.8, "theta": 0.9, "alpha": 1.0, "beta": 1.4, "gamma": 0.7},
            "absolute_bands": {"delta": 2, "theta": 2, "alpha": 2, "beta": 3, "gamma": 1},
            "relative_bands": {"delta": .2, "theta": .2, "alpha": .2, "beta": .3, "gamma": .1},
            "signal_quality": [2, 2, 2, 2], "accepted_channels": 4, "battery_level": 80,
        }), content_type="application/json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["state"], "focused")
        self.assertEqual(SessionEEGSample.objects.filter(session=session, slide=slide).count(), 1)

        self._login(self.teacher)
        live = self.client.get(f"/api/teacher/classes/{school_class.pk}/live/")
        self.assertEqual(live.status_code, 200)
        self.assertEqual(live.json()["active_sessions"][0]["latest"]["bands"]["beta"], 1.4)
        dashboard = self.client.get("/api/teacher/dashboard/")
        self.assertEqual(dashboard.json()["active_sessions"], 1)
        self.assertEqual(dashboard.json()["live_sessions"][0]["class_name"], "Live Muse Class")

        self._login(self.student)
        self.client.post(f"/api/sessions/{session.pk}/slides/{slide.pk}/", data=json.dumps({"action": "enter"}), content_type="application/json")
        self.assertEqual(self.client.post(f"/api/sessions/{session.pk}/end/").status_code, 200)
        session.refresh_from_db()
        self.assertEqual(float(session.completion_percentage), 100)
        self.assertEqual(float(session.analytics.focused_percentage), 100)

    def test_teacher_dashboard_hides_stale_unfinished_muse_session(self):
        school_class = SchoolClass.objects.create(name="Stale Class", code="STALE", teacher=self.teacher)
        session = LearningSession.objects.create(school_class=school_class, student=self.student)
        sample = SessionEEGSample.objects.create(
            session=session, bands={"delta": 1, "theta": 1, "alpha": 1, "beta": 1, "gamma": 1},
            signal_quality=[2, 2, 2, 2], accepted_channels=4, state="focused",
        )
        SessionEEGSample.objects.filter(pk=sample.pk).update(recorded_at=timezone.now() - timedelta(minutes=2))
        self._login(self.teacher)
        dashboard = self.client.get("/api/teacher/dashboard/").json()
        self.assertEqual(dashboard["active_sessions"], 0)
        self.assertEqual(dashboard["live_sessions"], [])

    def test_student_can_start_only_an_enrolled_session_and_owner_can_end(self):
        school_class = SchoolClass.objects.create(name="Life Skills", code="LIFE2", teacher=self.teacher)
        Enrollment.objects.create(school_class=school_class, student=self.student, enrolled_by=self.teacher)
        ConsentRecord.objects.create(profile=self.student, consent_type="eeg_processing", version="1", granted=True)
        self._login(self.student)
        response = self.client.post("/api/sessions/start/", data=json.dumps({"class_id": school_class.pk}), content_type="application/json")
        self.assertEqual(response.status_code, 201)
        session = LearningSession.objects.get(pk=response.json()["id"])
        self.assertEqual(session.student, self.student)
        self.assertNotEqual(response.json()["student_pseudonym"], str(self.student.pk))
        self.assertEqual(AuditLog.objects.filter(action="session_started").count(), 1)
        self.assertEqual(self.client.post(f"/api/sessions/{session.pk}/end/").status_code, 200)
        session.refresh_from_db()
        self.assertEqual(session.status, LearningSession.Status.COMPLETED)

    def test_student_cannot_start_without_active_eeg_consent(self):
        school_class = SchoolClass.objects.create(name="Consent class", code="CNSNT", teacher=self.teacher)
        Enrollment.objects.create(school_class=school_class, student=self.student, enrolled_by=self.teacher)
        self._login(self.student)
        response = self.client.post("/api/sessions/start/", data=json.dumps({"class_id": school_class.pk}), content_type="application/json")
        self.assertEqual(response.status_code, 403)

    def test_package_progress_counts_unique_slides_and_sorts_recent_activity(self):
        from .models import LessonPracticeProgress
        packages = [CurriculumPackage.objects.get_or_create(slug=slug, defaults={"name": slug})[0]
                    for slug in ("care", "life", "pre_vocational", "livelihood", "functional_academics", "career", "enrichment")]
        school_class = SchoolClass.objects.create(name="Progress", code="PROG1", teacher=self.teacher)
        lessons = [Lesson.objects.create(package=package, title=package.name, created_by=self.teacher, status=Lesson.Status.APPROVED) for package in packages[:2]]
        slides = [Slide.objects.create(lesson=lessons[0], position=i, title=str(i), activity=Activity.objects.create(type=Activity.ActivityType.INTERACTIVE, title=str(i))) for i in range(2)]
        old = timezone.now() - timedelta(days=1)
        progress = LessonPracticeProgress.objects.create(student=self.student, school_class=school_class, lesson=lessons[0], completed_slide_ids=[slides[0].pk, 999999])
        LessonPracticeProgress.objects.filter(pk=progress.pk).update(updated_at=old)
        session = LearningSession.objects.create(student=self.student, school_class=school_class, lesson=lessons[0])
        LearningSession.objects.filter(pk=session.pk).update(started_at=old, ended_at=old)
        SessionSlideExposure.objects.create(session=session, slide=slides[0], entered_at=old, exited_at=old)
        LessonPracticeProgress.objects.create(student=self.other_student, school_class=school_class, lesson=lessons[0], completed_slide_ids=[slides[1].pk])
        LearningSession.objects.create(student=self.student, school_class=school_class, lesson=lessons[1])
        self._login(self.student)
        response = self.client.get("/api/student/package-progress/")
        self.assertEqual(response.status_code, 200)
        items = response.json()["packages"]
        self.assertEqual(len(items), 7)
        self.assertEqual([item["slug"] for item in items[:2]], ["life", "care"])
        self.assertEqual(response.json()["completed_lessons"], 0)
        self.assertFalse(items[1]["is_completed"])
        progress.completed_slide_ids = [slide.pk for slide in slides]
        progress.save()
        earned = self.client.get("/api/student/package-progress/").json()
        self.assertEqual(earned["completed_lessons"], 1)
        self.assertIn("lessons-1", earned["badge_unlocks"])
        self.assertIn("care", earned["badge_unlocks"])
        self.assertNotIn("lessons-3", earned["badge_unlocks"])
        progress.save()
        refreshed = self.client.get("/api/student/package-progress/").json()
        self.assertEqual(refreshed["badge_unlocks"], earned["badge_unlocks"])
        self.assertTrue(next(item for item in earned["packages"] if item["slug"] == "care")["is_completed"])
        self.assertEqual(items[1]["percentage"], 50)
        self.assertEqual(items[0]["percentage"], 0)
        self.assertIsNone(items[-1]["last_interacted_at"])

    def test_student_sessions_returns_only_owned_history_and_summary(self):
        school_class = SchoolClass.objects.create(name="Life Skills", code="HIST1", teacher=self.teacher)
        other_class = SchoolClass.objects.create(name="Other Class", code="HIST2", teacher=self.teacher)
        completed = LearningSession.objects.create(school_class=school_class, student=self.student)
        started_at = timezone.now() - timedelta(minutes=30)
        ended_at = timezone.now()
        LearningSession.objects.filter(pk=completed.pk).update(started_at=started_at, ended_at=ended_at, status=LearningSession.Status.COMPLETED)
        LearningSession.objects.create(school_class=other_class, student=self.other_student)
        self._login(self.student)

        response = self.client.get("/api/student/sessions/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["summary"]["completed_sessions"], 1)
        self.assertEqual(len(payload["sessions"]), 1)
        self.assertEqual(payload["sessions"][0]["class_name"], "Life Skills")
        self.assertEqual(payload["sessions"][0]["status"], "completed")
        self.assertGreaterEqual(payload["summary"]["total_duration_seconds"], 1799)

    def test_student_can_create_and_update_completed_session_journal(self):
        school_class = SchoolClass.objects.create(name="Journal Class", code="JRNL1", teacher=self.teacher)
        session = LearningSession.objects.create(school_class=school_class, student=self.student)
        LearningSession.objects.filter(pk=session.pk).update(ended_at=timezone.now(), status=LearningSession.Status.COMPLETED)
        self._login(self.student)
        payload = {"session_id": str(session.pk), "prompt": "What did you learn?", "response_type": "text", "text_response": "I learned a routine.", "mood": "proud", "shared_with_teacher": True}

        created = self.client.post("/api/student/journals/", data=json.dumps(payload), content_type="application/json")
        self.assertEqual(created.status_code, 201)
        payload["text_response"] = "I learned my morning routine."
        updated = self.client.post("/api/student/journals/", data=json.dumps(payload), content_type="application/json")
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(JournalEntry.objects.filter(session=session, student=self.student).count(), 1)
        self.assertEqual(self.client.get(f"/api/student/journals/?session_id={session.pk}").json()["entry"]["text_response"], payload["text_response"])

    def test_student_cannot_write_journal_for_another_students_session(self):
        school_class = SchoolClass.objects.create(name="Private Journal", code="JRNL2", teacher=self.teacher)
        session = LearningSession.objects.create(school_class=school_class, student=self.other_student)
        LearningSession.objects.filter(pk=session.pk).update(ended_at=timezone.now(), status=LearningSession.Status.COMPLETED)
        self._login(self.student)
        response = self.client.get(f"/api/student/journals/?session_id={session.pk}")
        self.assertEqual(response.status_code, 404)

    def test_student_journal_defaults_to_latest_completed_session(self):
        school_class = SchoolClass.objects.create(name="Latest Journal", code="JRNL3", teacher=self.teacher)
        older = LearningSession.objects.create(school_class=school_class, student=self.student)
        LearningSession.objects.filter(pk=older.pk).update(ended_at=timezone.now() - timedelta(hours=1), status=LearningSession.Status.COMPLETED)
        latest = LearningSession.objects.create(school_class=school_class, student=self.student)
        LearningSession.objects.filter(pk=latest.pk).update(ended_at=timezone.now(), status=LearningSession.Status.COMPLETED)
        self._login(self.student)

        response = self.client.get("/api/student/journals/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["session"]["id"], str(latest.pk))

    def test_student_can_save_a_drawing_journal(self):
        school_class = SchoolClass.objects.create(name="Drawing Journal", code="JRNL4", teacher=self.teacher)
        session = LearningSession.objects.create(school_class=school_class, student=self.student)
        LearningSession.objects.filter(pk=session.pk).update(ended_at=timezone.now(), status=LearningSession.Status.COMPLETED)
        self._login(self.student)
        drawing = SimpleUploadedFile("reflection.png", b"\x89PNG\r\n\x1a\n" + b"drawing-data", content_type="image/png")

        response = self.client.post("/api/student/journals/", {
            "session_id": str(session.pk), "prompt": "Draw what you learned",
            "response_type": "drawing", "mood": "happy",
            "shared_with_teacher": "true", "file": drawing,
        })

        self.assertEqual(response.status_code, 201)
        entry = JournalEntry.objects.get(session=session)
        self.assertEqual(entry.response_type, JournalEntry.ResponseType.DRAWING)
        self.assertEqual(entry.asset.mime_type, "image/png")
        self.assertEqual(self.client.get(f"/api/content/assets/{entry.asset_id}/preview/").status_code, 200)

    def test_student_can_save_a_browser_audio_journal(self):
        school_class = SchoolClass.objects.create(name="Audio Journal", code="JRNL5", teacher=self.teacher)
        session = LearningSession.objects.create(school_class=school_class, student=self.student)
        LearningSession.objects.filter(pk=session.pk).update(ended_at=timezone.now(), status=LearningSession.Status.COMPLETED)
        self._login(self.student)
        recording = SimpleUploadedFile("reflection.webm", b"\x1aE\xdf\xa3" + b"audio-data", content_type="audio/webm")

        response = self.client.post("/api/student/journals/", {
            "session_id": str(session.pk), "prompt": "Tell me what you learned",
            "response_type": "audio", "mood": "okay",
            "shared_with_teacher": "true", "file": recording,
        })

        self.assertEqual(response.status_code, 201)
        entry = JournalEntry.objects.get(session=session)
        self.assertEqual(entry.response_type, JournalEntry.ResponseType.AUDIO)
        self.assertEqual(entry.asset.mime_type, "audio/webm")

    def test_student_cannot_access_unenrolled_class(self):
        school_class = SchoolClass.objects.create(name="Private Class", code="PRIV1", teacher=self.teacher)
        self._login(self.student)
        self.assertEqual(self.client.get(f"/api/classes/{school_class.pk}/").status_code, 403)

    def test_remove_enrollment_is_audited_and_hides_class(self):
        school_class = SchoolClass.objects.create(name="Life Skills", code="LIFE3", teacher=self.teacher)
        Enrollment.objects.create(school_class=school_class, student=self.student, enrolled_by=self.teacher)
        self._login(self.teacher)
        response = self.client.delete(f"/api/classes/{school_class.pk}/students/{self.student.pk}/")
        self.assertEqual(response.status_code, 200)
        self._login(self.student)
        self.assertEqual(self.client.get("/api/classes/").json()["classes"], [])
        self.assertTrue(AuditLog.objects.filter(action="student_removed").exists())

    def test_consent_is_recorded(self):
        self._login(self.student)
        response = self.client.post("/api/auth/consent/", data=json.dumps({"consent_type": "eeg_processing", "version": "1", "granted": True}), content_type="application/json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(self.client.get("/api/auth/consent/").json()["consents"][0]["consent_type"], "eeg_processing")

    def test_email_login_and_student_dashboard(self):
        self.student.user.email = "student@example.test"
        self.student.user.save(update_fields=["email"])
        response = self.client.post("/api/auth/login/", data=json.dumps({"email": "student@example.test", "password": "a-very-long-test-password"}), content_type="application/json")
        self.assertEqual(response.status_code, 200)
        dashboard = self.client.get("/api/student/dashboard/")
        self.assertEqual(dashboard.status_code, 200)
        self.assertEqual(dashboard.json()["student"]["name"], "Student")
        self.assertIsNone(dashboard.json()["active_session"])

    def test_prepared_demo_credentials_are_created_and_can_log_in(self):
        response = self.client.post(
            "/api/auth/login/",
            data=json.dumps({"email": "student@example-school.test", "password": "student-demo-2026!"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["role"], Profile.Role.STUDENT)
        self.assertTrue(User.objects.filter(email="student@example-school.test").exists())

    def test_logout_ends_active_session(self):
        school_class = SchoolClass.objects.create(name="Session class", code="SESS1", teacher=self.teacher)
        Enrollment.objects.create(school_class=school_class, student=self.student, enrolled_by=self.teacher)
        ConsentRecord.objects.create(profile=self.student, consent_type="eeg_processing", version="1", granted=True)
        self._login(self.student)
        start = self.client.post("/api/sessions/start/", data=json.dumps({"class_id": school_class.pk}), content_type="application/json")
        session_id = start.json()["id"]
        self.client.post("/api/auth/logout/", content_type="application/json")
        session = LearningSession.objects.get(pk=session_id)
        self.assertIsNotNone(session.ended_at)
        self.assertEqual(session.status, LearningSession.Status.COMPLETED)

    def test_student_profile_edit_requires_current_password(self):
        self._login(self.student)
        wrong = self.client.post(
            "/api/student/profile/verify-password/",
            data=json.dumps({"password": "wrong-password"}),
            content_type="application/json",
        )
        self.assertEqual(wrong.status_code, 403)
        correct = self.client.post(
            "/api/student/profile/verify-password/",
            data=json.dumps({"password": "a-very-long-test-password"}),
            content_type="application/json",
        )
        self.assertEqual(correct.status_code, 200)
        self.assertEqual(correct.json(), {"verified": True})

    def test_student_profile_update_persists_auth_user_fields(self):
        self._login(self.student)
        response = self.client.patch(
            "/api/student/profile/",
            data=json.dumps({
                "name": "Updated Student",
                "username": "updated-student",
                "email": "updated.student@example.test",
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.student.user.refresh_from_db()
        self.assertEqual(self.student.user.username, "updated-student")
        self.assertEqual(self.student.user.email, "updated.student@example.test")
        self.assertEqual(self.student.user.first_name, "Updated")
        self.assertEqual(self.student.user.last_name, "Student")

    def test_registration_lists_all_schools_without_contact_details(self):
        school = School.objects.create(name="Registered School", contact_email="office@example.test")
        inactive = School.objects.create(name="Inactive School", is_active=False)
        response = self.client.get("/api/auth/schools/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["schools"], [
            {"id": str(inactive.pk), "name": inactive.name},
            {"id": str(school.pk), "name": school.name},
        ])

    def test_registration_rejects_missing_or_invalid_school(self):
        for school_id in (None, "invalid", "00000000-0000-0000-0000-000000000000"):
            response = self.client.post("/api/auth/register/", data=json.dumps({
                "username": "invalid-school", "school_id": school_id,
                "password": "a-very-long-test-password", "confirm_password": "a-very-long-test-password",
                "name": "Student",
            }), content_type="application/json")
            self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(username="invalid-school").exists())

    def test_public_registration_is_available_without_authentication(self):
        school = School.objects.create(name="Registration School", contact_email="office@example.test")
        response = self.client.post(
            "/api/auth/register/",
            data=json.dumps({
                "username": "newstudent",
                "school_id": str(school.pk),
                "email": "newstudent@example.test",
                "password": "a-very-long-test-password",
                "name": "New Student",
                "role": Profile.Role.STUDENT,
                "first_name": "New",
                "last_name": "Student",
                "confirm_password": "a-very-long-test-password",
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(User.objects.filter(username="newstudent", email="office@example.test").exists())
        self.assertTrue(Profile.objects.filter(user__username="newstudent", role=Profile.Role.STUDENT, school=school).exists())
        login = self.client.post("/api/auth/login/", data=json.dumps({"username": "newstudent", "password": "a-very-long-test-password"}), content_type="application/json")
        self.assertEqual(login.status_code, 200)

    def test_student_joins_class_and_receives_notification(self):
        CurriculumPackage.objects.get_or_create(slug="life", defaults={"name": "Life"})
        school_class = SchoolClass.objects.create(name="Joinable", code="JOIN1", teacher=self.teacher)
        self._login(self.student)
        response = self.client.post("/api/student/classes/join/", data=json.dumps({"code": "join1"}), content_type="application/json")
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Enrollment.objects.filter(school_class=school_class, student=self.student, removed_at__isnull=True).exists())
        self.assertTrue(Notification.objects.filter(recipient=self.student, kind=Notification.Kind.CLASS).exists())

    def test_student_preferences_are_persisted(self):
        self._login(self.student)
        response = self.client.patch("/api/student/preferences/", data=json.dumps({"sound_enabled": False}), content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(UserPreference.objects.get(profile=self.student).sound_enabled)

    def test_content_repository_covers_packages_slides_upload_archive_and_assignment(self):
        school_class = SchoolClass.objects.create(name="Transition", code="CONT1", teacher=self.teacher)
        Enrollment.objects.create(school_class=school_class, student=self.student, enrolled_by=self.teacher)
        self._login(self.admin)

        packages = self.client.get("/api/content/packages/")
        self.assertEqual(packages.status_code, 200)
        self.assertEqual(len(packages.json()["packages"]), 7)

        lesson = self.client.post("/api/content/lessons/", data=json.dumps({"package": "life", "title": "Morning routine"}), content_type="application/json")
        self.assertEqual(lesson.status_code, 201)
        lesson_id = lesson.json()["id"]
        template_catalog = self.client.get("/api/content/activity-templates/")
        self.assertEqual(template_catalog.status_code, 200)
        self.assertEqual(len(template_catalog.json()["presentation_templates"]), 7)
        self.assertEqual(len(template_catalog.json()["task_templates"]), 13)
        self.assertEqual(template_catalog.json()["layout_options"]["sizes"], ["compact", "standard", "wide", "immersive"])
        slide = self.client.post(f"/api/content/lessons/{lesson_id}/slides/", data=json.dumps({
            "type": "interactive", "title": "Choose the first step", "position": 0,
            "configuration": {"task_template": "multiple_choice", "question": "What comes first?", "choices": ["Wake up", "Pack"], "answer": "Wake up"},
        }), content_type="application/json")
        self.assertEqual(slide.status_code, 201)
        self.assertEqual(slide.json()["slides"][0]["position"], 0)
        invalid_slide = self.client.post(f"/api/content/lessons/{lesson_id}/slides/", data=json.dumps({
            "type": "audio", "title": "Invalid", "configuration": {"task_template": "multiple_choice"},
        }), content_type="application/json")
        self.assertEqual(invalid_slide.status_code, 400)
        invalid_layout = self.client.post(f"/api/content/lessons/{lesson_id}/slides/", data=json.dumps({
            "type": "interactive", "title": "Invalid layout", "configuration": {
                "task_template": "multiple_choice", "question": "Choose", "choices": ["A", "B"], "answer": "A",
                "layout": {"preferred_columns": 99},
            },
        }), content_type="application/json")
        self.assertEqual(invalid_layout.status_code, 400)

        image = SimpleUploadedFile("step.png", b"\x89PNG\r\n\x1a\nsynthetic", content_type="image/png")
        uploaded = self.client.post("/api/content/assets/upload/", data={"file": image})
        self.assertEqual(uploaded.status_code, 201)
        asset_id = uploaded.json()["id"]
        self.assertEqual(self.client.get(f"/api/content/assets/{asset_id}/preview/").status_code, 200)
        self.assertEqual(self.client.put(f"/api/content/assets/{asset_id}/", data=json.dumps({"name": "first-step.png"}), content_type="application/json").json()["name"], "first-step.png")

        assigned = self.client.post(f"/api/content/lessons/{lesson_id}/assign/", data=json.dumps({"class_id": school_class.pk, "student_id": self.student.pk}), content_type="application/json")
        self.assertEqual(assigned.status_code, 201)
        self.assertTrue(ContentAssignment.objects.filter(lesson_id=lesson_id, school_class=school_class, student=self.student).exists())
        self.assertEqual(self.client.delete(f"/api/content/lessons/{lesson_id}/").status_code, 200)

    def test_content_upload_rejects_unsupported_type(self):
        self._login(self.admin)
        bad_file = SimpleUploadedFile("script.exe", b"not allowed", content_type="application/x-msdownload")
        response = self.client.post("/api/content/assets/upload/", data={"file": bad_file})
        self.assertEqual(response.status_code, 400)

    def test_teacher_cannot_manage_content(self):
        CurriculumPackage.objects.get_or_create(slug="life", defaults={"name": "Life"})
        self._login(self.teacher)
        response = self.client.post(
            "/api/content/lessons/",
            data=json.dumps({"package": "life", "title": "Teacher content"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)

    def test_every_class_exposes_all_global_packages(self):
        for slug in ("care", "life", "pre_vocational", "livelihood", "functional_academics", "career", "enrichment"):
            CurriculumPackage.objects.get_or_create(slug=slug, defaults={"name": slug.replace("_", " ").title()})
        school_class = SchoolClass.objects.create(name="Section A", code="SECA", teacher=self.teacher)
        self._login(self.teacher)
        payload = self.client.get(f"/api/classes/{school_class.pk}/").json()
        self.assertEqual(payload["package_count"], 7)
        self.assertEqual(len(payload["packages"]), 7)

    def test_teacher_journals_are_filtered_by_owned_class(self):
        first_class = SchoolClass.objects.create(name="Section A", code="JRNA", teacher=self.teacher)
        second_class = SchoolClass.objects.create(name="Section B", code="JRNB", teacher=self.teacher)
        Enrollment.objects.create(school_class=first_class, student=self.student, enrolled_by=self.teacher)
        Enrollment.objects.create(school_class=second_class, student=self.other_student, enrolled_by=self.teacher)
        first_session = LearningSession.objects.create(school_class=first_class, student=self.student)
        second_session = LearningSession.objects.create(school_class=second_class, student=self.other_student)
        JournalEntry.objects.create(session=first_session, student=self.student, prompt="First", response_type="text", text_response="A", mood="Proud")
        JournalEntry.objects.create(session=second_session, student=self.other_student, prompt="Second", response_type="text", text_response="B", mood="Happy")
        self._login(self.teacher)
        payload = self.client.get(f"/api/teacher/journals/?class_id={first_class.pk}").json()
        self.assertEqual(payload["selected_class_id"], first_class.pk)
        self.assertEqual(len(payload["entries"]), 1)
        self.assertEqual(payload["entries"][0]["prompt"], "First")

    def test_teacher_intervention_is_delivered_acknowledged_and_audited(self):
        school_class = SchoolClass.objects.create(name="Live class", code="LIVE1", teacher=self.teacher)
        Enrollment.objects.create(school_class=school_class, student=self.student, enrolled_by=self.teacher)
        session = LearningSession.objects.create(school_class=school_class, student=self.student)
        self._login(self.teacher)
        command = self.client.post(f"/api/sessions/{session.pk}/interventions/", data=json.dumps({"action": "set_mode", "mode": "focus", "state": "focused", "priority": "urgent", "duration_seconds": 90}), content_type="application/json")
        self.assertEqual(command.status_code, 201)
        self.assertEqual(command.json()["priority"], "urgent")
        intervention_id = command.json()["id"]
        self.assertEqual(self.client.get("/api/intervention-alerts/").json()["alerts"][0]["priority"], "urgent")

        self._login(self.student)
        delivery = self.client.get(f"/api/sessions/{session.pk}/interventions/delivery/")
        self.assertEqual(delivery.status_code, 200)
        self.assertEqual(delivery.json()["commands"][0]["action"], "set_mode")
        applied = self.client.post(f"/api/sessions/{session.pk}/interventions/delivery/", data=json.dumps({"intervention_id": intervention_id, "status": "applied"}), content_type="application/json")
        self.assertEqual(applied.status_code, 200)
        self.assertEqual(applied.json()["status"], "applied")
        self.assertTrue(AuditLog.objects.filter(action="intervention_applied").exists())

    def test_student_cannot_issue_interventions(self):
        school_class = SchoolClass.objects.create(name="Live class", code="LIVE2", teacher=self.teacher)
        session = LearningSession.objects.create(school_class=school_class, student=self.student)
        self._login(self.student)
        response = self.client.post(f"/api/sessions/{session.pk}/interventions/", data=json.dumps({"action": "pause"}), content_type="application/json")
        self.assertEqual(response.status_code, 403)

    def test_public_teacher_registration_requires_school_admin_approval(self):
        school = School.objects.create(name="Teacher School", contact_email="office@example.test")
        response = self.client.post(
            "/api/auth/register/",
            data=json.dumps({
                "username": "pending-teacher", "school_id": str(school.pk),
                "password": "a-very-long-test-password", "confirm_password": "a-very-long-test-password",
                "name": "Pending Teacher", "role": Profile.Role.TEACHER,
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        pending = Profile.objects.get(user__username="pending-teacher")
        self.assertEqual(pending.account_status, Profile.AccountStatus.PENDING)
        denied = self.client.post(
            "/api/auth/login/",
            data=json.dumps({"username": "pending-teacher", "password": "a-very-long-test-password"}),
            content_type="application/json",
        )
        self.assertEqual(denied.status_code, 403)

    def test_school_admin_approves_only_same_school_teacher(self):
        school = School.objects.create(name="North School")
        other_school = School.objects.create(name="South School")
        school_admin = self._account("school-admin", "School Admin", Profile.Role.ADMIN)
        school_admin.school = school
        school_admin.admin_scope = Profile.AdminScope.SCHOOL
        school_admin.save(update_fields=["school", "admin_scope"])
        pending = self._account("pending", "Pending", Profile.Role.TEACHER)
        pending.school = school
        pending.account_status = Profile.AccountStatus.PENDING
        pending.save(update_fields=["school", "account_status"])
        outsider = self._account("outsider", "Outsider", Profile.Role.TEACHER)
        outsider.school = other_school
        outsider.account_status = Profile.AccountStatus.PENDING
        outsider.save(update_fields=["school", "account_status"])
        self._login(school_admin)
        approved = self.client.patch(
            f"/api/admin/accounts/{pending.pk}/status/",
            data=json.dumps({"status": Profile.AccountStatus.ACTIVE}), content_type="application/json",
        )
        self.assertEqual(approved.status_code, 200)
        rejected = self.client.patch(
            f"/api/admin/accounts/{outsider.pk}/status/",
            data=json.dumps({"status": Profile.AccountStatus.ACTIVE}), content_type="application/json",
        )
        self.assertEqual(rejected.status_code, 403)

    def test_consent_requires_boolean_and_can_be_withdrawn(self):
        self._login(self.student)
        invalid = self.client.post(
            "/api/auth/consent/",
            data=json.dumps({"consent_type": "eeg_processing", "version": "1", "granted": "false"}),
            content_type="application/json",
        )
        self.assertEqual(invalid.status_code, 400)
        self.client.post(
            "/api/auth/consent/",
            data=json.dumps({"consent_type": "eeg_processing", "version": "1", "granted": True}),
            content_type="application/json",
        )
        withdrawn = self.client.delete(
            "/api/auth/consent/",
            data=json.dumps({"consent_type": "eeg_processing", "version": "1"}),
            content_type="application/json",
        )
        self.assertEqual(withdrawn.status_code, 200)
        self.assertIsNotNone(ConsentRecord.objects.latest("recorded_at").withdrawn_at)

    def test_student_can_submit_privacy_request(self):
        self._login(self.student)
        response = self.client.post(
            "/api/privacy/requests/",
            data=json.dumps({"request_type": DataLifecycleRequest.RequestType.EXPORT}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(DataLifecycleRequest.objects.filter(profile=self.student).exists())


class RoutingTests(TestCase):
    def setUp(self):
        self.teacher = self._account("teacher", "Teacher", Profile.Role.TEACHER)
        self.admin = self._account("admin", "Administrator", Profile.Role.ADMIN)
        self.student = self._account("student", "Student", Profile.Role.STUDENT)

    def _account(self, username, name, role):
        user = User.objects.create_user(username=username, password="a-very-long-test-password")
        return Profile.objects.create(user=user, display_name=name, role=role)

    def test_site_routes_are_not_served_by_backend(self):
        for path in ("/", "/student/home", "/teacher/dashboard", "/admin/dashboard", "/django-admin/"):
            response = self.client.get(path)
            self.assertEqual(response.status_code, 404)

    def test_health_endpoint(self):
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok", "service": "cortex"})
