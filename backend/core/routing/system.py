from django.urls import path

from apps.staff.presentation.views.system import HealthView, VersionView

urlpatterns = [
    path("health/", HealthView.as_view(), name="system-health"),
    path("version/", VersionView.as_view(), name="system-version"),
]
