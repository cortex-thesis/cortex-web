from django.urls import path
from .views import (
    assign_teacher,
    class_detail,
    classes,
    consent,
    end_session,
    health,
    login_view,
    logout_view,
    me,
    register,
    start_session,
    enrollment,
)

urlpatterns = [
    path("health/", health, name="health"),
    path("auth/register/", register, name="register"),
    path("auth/login/", login_view, name="login"),
    path("auth/logout/", logout_view, name="logout"),
    path("auth/me/", me, name="me"),
    path("auth/consent/", consent, name="consent"),
    path("classes/", classes, name="classes"),
    path("classes/<int:class_id>/", class_detail, name="class-detail"),
    path("classes/<int:class_id>/teacher/", assign_teacher, name="assign-teacher"),
    path("classes/<int:class_id>/students/<int:student_id>/", enrollment, name="enrollment"),
    path("sessions/start/", start_session, name="start-session"),
    path("sessions/<uuid:session_id>/end/", end_session, name="end-session"),
]
