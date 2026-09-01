import json
from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

from .models import AuditLog, ConsentRecord, ContentAssignment, CurriculumPackage, Enrollment, Intervention, JournalEntry, LearningSession, Notification, Profile, SchoolClass, UserPreference


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
            data=json.dumps({"email": "student@cortex.edu", "password": "studenttest"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["role"], Profile.Role.STUDENT)
        self.assertTrue(User.objects.filter(email="student@cortex.edu").exists())

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

    def test_teacher_profile_update_syncs_public_user_by_current_or_previous_username(self):
        cursor = type("Cursor", (), {"rowcount": 1, "execute": lambda self, query, params: setattr(self, "call", (query, params))})()
        with patch("web.views.connection.cursor") as cursor_factory:
            cursor_factory.return_value.__enter__.return_value = cursor
            from .views import _update_public_user_record
            _update_public_user_record(
                SimpleNamespace(user=SimpleNamespace(pk=7, username="updated-teacher")),
                {
                    "name": "Updated Teacher",
                    "email": "updated.teacher@example.test",
                    "first_name": "Updated",
                    "middle_name": None,
                    "last_name": "Teacher",
                },
                previous_username="teacher",
            )

        query, params = cursor.call
        self.assertIn("auth_user_id = %s", query)
        self.assertIn("WHERE auth_user_id = %s OR username = %s OR username = %s", query)
        self.assertEqual(query.count("first_name = %s"), 1)
        self.assertEqual(query.count("last_name = %s"), 1)
        self.assertEqual(params[-3:], [7, "updated-teacher", "teacher"])

    def test_public_registration_is_available_without_authentication(self):
        response = self.client.post(
            "/api/auth/register/",
            data=json.dumps({
                "username": "newstudent",
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
        self.assertTrue(User.objects.filter(username="newstudent", email="newstudent@example.test").exists())
        self.assertTrue(Profile.objects.filter(user__username="newstudent", role=Profile.Role.STUDENT).exists())
        login = self.client.post("/api/auth/login/", data=json.dumps({"email": "newstudent@example.test", "password": "a-very-long-test-password"}), content_type="application/json")
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
        slide = self.client.post(f"/api/content/lessons/{lesson_id}/slides/", data=json.dumps({"type": "interactive", "title": "Order the steps", "position": 0}), content_type="application/json")
        self.assertEqual(slide.status_code, 201)
        self.assertEqual(slide.json()["slides"][0]["position"], 0)

        image = SimpleUploadedFile("step.png", b"png-data", content_type="image/png")
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
