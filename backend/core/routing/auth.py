from django.urls import include, path

urlpatterns = [
    path("", include("apps.accounts.presentation.urls.auth")),
]
