"""Admin Django com segundo fator aplicado tanto ao login quanto às sessões existentes."""

from django import forms
from django.contrib.admin import AdminSite
from django.contrib.admin.forms import AdminAuthenticationForm
from django.utils.crypto import constant_time_compare, salted_hmac

from apps.accounts.application.twofa import _verify


def mfa_session_proof(user):
    """Vincula a prova MFA à senha e ao segredo TOTP atuais, sem guardar o segredo na sessão."""
    return salted_hmac(
        "pdl-admin-mfa", user.get_session_auth_hash() + user.totp_secret
    ).hexdigest()


class MFAAdminAuthenticationForm(AdminAuthenticationForm):
    """Exige TOTP para contas que o ativaram e registra a prova na sessão validada."""

    otp = forms.CharField(
        label="Código do autenticador",
        required=False,
        max_length=6,
        widget=forms.TextInput(
            attrs={"autocomplete": "one-time-code", "inputmode": "numeric"}
        ),
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields.values():
            field.widget.attrs["class"] = "form-control"

    def clean(self):
        cleaned = super().clean()
        user = self.get_user()
        if user is not None and user.is_2fa_enabled:
            if not _verify(user.totp_secret, cleaned.get("otp", "")):
                raise forms.ValidationError("Informe um código válido do autenticador.")
            self.request.session["admin_mfa"] = mfa_session_proof(user)
        return cleaned


class MFAAdminSite(AdminSite):
    """Preserva as permissões do admin e rejeita sessões sem a prova do segundo fator atual."""

    login_form = MFAAdminAuthenticationForm
    login_template = "admin/mfa_login.html"

    def has_permission(self, request):
        if not super().has_permission(request):
            return False
        return not request.user.is_2fa_enabled or constant_time_compare(
            request.session.get("admin_mfa", ""),
            mfa_session_proof(request.user),
        )
