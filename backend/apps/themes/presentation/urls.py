from django.urls import path

from apps.themes.presentation.views import (
    ActiveThemeView,
    StaffThemeActivateView,
    StaffThemeDetailView,
    StaffThemeListInstallView,
)

public_urlpatterns = [
    path("theme/", ActiveThemeView.as_view(), name="active-theme"),
]

staff_urlpatterns = [
    path("themes/", StaffThemeListInstallView.as_view(), name="staff-themes"),
    path("themes/default/activate/", StaffThemeActivateView.as_view(), name="staff-theme-default"),
    path("themes/<uuid:package_id>/activate/", StaffThemeActivateView.as_view(), name="staff-theme-activate"),
    path("themes/<uuid:package_id>/", StaffThemeDetailView.as_view(), name="staff-theme-detail"),
]
