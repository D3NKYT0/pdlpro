from django.urls import path

from apps.accounts.presentation.views.auth import (
    ConfirmPasswordResetView,
    CsrfView,
    LoginView,
    LogoutView,
    RefreshView,
    RegisterView,
    RequestEmailVerificationView,
    RequestPasswordResetView,
    VerifyEmailView,
    VerifyTwoFactorLoginView,
    AuthCapabilitiesView,
    OAuthBeginView,
    OAuthCompleteView,
)
from apps.accounts.presentation.views.passkeys import (
    PasskeyDeleteView,
    PasskeyListView,
    PasskeyLoginBeginView,
    PasskeyLoginCompleteView,
    PasskeyRegisterBeginView,
    PasskeyRegisterCompleteView,
)

urlpatterns = [
    path("csrf/", CsrfView.as_view(), name="auth-csrf"),
    path("capabilities/", AuthCapabilitiesView.as_view(), name="auth-capabilities"),
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("oauth/begin/", OAuthBeginView.as_view(), name="auth-oauth-begin"),
    path("oauth/complete/", OAuthCompleteView.as_view(), name="auth-oauth-complete"),
    path("2fa/verify/", VerifyTwoFactorLoginView.as_view(), name="auth-2fa-verify"),
    path("email/verify/request/", RequestEmailVerificationView.as_view(), name="auth-email-verify-request"),
    path("email/verify/", VerifyEmailView.as_view(), name="auth-email-verify"),
    path("password-reset/", RequestPasswordResetView.as_view(), name="auth-password-reset"),
    path("password-reset/confirm/", ConfirmPasswordResetView.as_view(), name="auth-password-reset-confirm"),
    path("refresh/", RefreshView.as_view(), name="auth-refresh"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("passkeys/", PasskeyListView.as_view(), name="auth-passkeys"),
    path("passkeys/register/begin/", PasskeyRegisterBeginView.as_view(), name="auth-passkey-register-begin"),
    path("passkeys/register/complete/", PasskeyRegisterCompleteView.as_view(), name="auth-passkey-register-complete"),
    path("passkeys/login/begin/", PasskeyLoginBeginView.as_view(), name="auth-passkey-login-begin"),
    path("passkeys/login/complete/", PasskeyLoginCompleteView.as_view(), name="auth-passkey-login-complete"),
    path("passkeys/<uuid:credential_id>/", PasskeyDeleteView.as_view(), name="auth-passkey-delete"),
]
