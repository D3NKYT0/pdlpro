from django.urls import path

from apps.accounts.presentation.views.auth import CsrfView, LoginView, LogoutView, RefreshView, RegisterView

urlpatterns = [
    path("csrf/", CsrfView.as_view(), name="auth-csrf"),
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("refresh/", RefreshView.as_view(), name="auth-refresh"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
]
