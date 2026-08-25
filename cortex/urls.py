from django.contrib import admin
from django.urls import include, path, re_path

from web.views import frontend

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/", include("web.urls")),
    re_path(r"^(?!django-admin/|api/|static/).*$", frontend, name="frontend"),
]
