from django.urls import path

from apps.accounts.presentation.views.auth import MeView

urlpatterns = [
    path("me/", MeView.as_view(), name="shared-me"),
]
