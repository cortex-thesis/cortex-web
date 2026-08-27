import json

from django.contrib.auth.models import User
from django.test import TestCase

from .models import AuditLog, Enrollment, LearningSession, Profile, SchoolClass


class WorkflowTests(TestCase):
    def setUp(self):
        self.teacher = self._account("teacher", "Teacher", Profile.Role.TEACHER)
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
        self._login(self.student)
        response = self.client.post("/api/sessions/start/", data=json.dumps({"class_id": school_class.pk}), content_type="application/json")
        self.assertEqual(response.status_code, 201)
        session = LearningSession.objects.get(pk=response.json()["id"])
        self.assertEqual(session.student, self.student)
        self.assertNotEqual(response.json()["student_pseudonym"], str(self.student.pk))
        self.assertEqual(AuditLog.objects.filter(action="session_started").count(), 1)
        self.assertEqual(self.client.post(f"/api/sessions/{session.pk}/end/").status_code, 200)

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


class RoutingTests(TestCase):
    def test_frontend_routes_render_react_shell(self):
        for route in (
            "/",
            "/student/home",
            "/teacher/dashboard",
            "/admin/dashboard",
            "/admin/accounts",
        ):
            response = self.client.get(route)
            self.assertEqual(response.status_code, 200)
            self.assertContains(response, '<div id="root"></div>', html=True)

    def test_health_endpoint(self):
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok", "service": "cortex"})
