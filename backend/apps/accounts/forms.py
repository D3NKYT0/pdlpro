from django.contrib.auth.forms import UserChangeForm, UserCreationForm
from django.contrib.admin.widgets import FilteredSelectMultiple

from apps.accounts.infrastructure.models import User
from common.forms import PDLAdminFormMixin


class PDLUserLabelsMixin:
    field_labels = {
        "username": "Usuário",
        "password": "Senha",
        "password1": "Senha",
        "password2": "Confirmação da senha",
        "email": "E-mail",
        "display_name": "Nome de exibição",
        "bio": "Biografia",
        "avatar": "Avatar",
        "role": "Função",
        "is_active": "Conta ativa",
        "is_staff": "Acesso administrativo",
        "is_superuser": "Superadministrador",
        "groups": "Grupos",
        "user_permissions": "Permissões específicas",
        "is_email_verified": "E-mail verificado",
        "is_2fa_enabled": "Autenticação em dois fatores",
        "totp_secret": "Segredo TOTP",
        "last_login": "Último acesso",
        "fichas": "Fichas",
        "terms_accepted_at": "Aceite dos termos",
        "terms_and_privacy_version": "Versão dos termos e privacidade",
        "id": "Identificador",
        "created_at": "Criado em",
        "updated_at": "Atualizado em",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field_name, label in self.field_labels.items():
            if field_name in self.fields:
                self.fields[field_name].label = label

        transfer_fields = {
            "groups": (
                "grupos",
                "Pesquise os grupos disponíveis e use as setas para atribuir ou remover.",
            ),
            "user_permissions": (
                "permissões",
                "Pesquise as permissões disponíveis e use as setas para atribuir ou remover.",
            ),
        }
        for field_name, (verbose_name, help_text) in transfer_fields.items():
            if field_name not in self.fields:
                continue
            field = self.fields[field_name]
            field.widget = FilteredSelectMultiple(verbose_name, is_stacked=False)
            field.widget.choices = field.choices
            field.help_text = help_text


class PDLUserChangeForm(PDLAdminFormMixin, PDLUserLabelsMixin, UserChangeForm):
    """Safe user editor that never exposes the encoded password as a text input."""

    class Meta(UserChangeForm.Meta):
        model = User
        fields = "__all__"


class PDLUserCreationForm(PDLAdminFormMixin, PDLUserLabelsMixin, UserCreationForm):
    """User creation form with Django password validation and PDL styling."""

    class Meta(UserCreationForm.Meta):
        model = User
        fields = ("username", "email", "display_name", "role")
