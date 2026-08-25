from django.contrib import admin
from django.urls import include, path, re_path

from web.views import frontend

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("web.urls")),
    re_path(r"^(?!admin/|api/|static/).*$", frontend, name="frontend"),
]
