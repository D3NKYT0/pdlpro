from django.contrib.admin.widgets import FilteredSelectMultiple
from django.contrib.auth.forms import UserChangeForm, UserCreationForm
from django.utils.translation import gettext_lazy as _

from apps.accounts.infrastructure.models import User
from common.forms import PDLAdminFormMixin


class PDLUserLabelsMixin:
    """Localiza os campos de usuário e configura seletores de grupos e permissões.

    Combine com os formulários de autenticação do Django. Altera apenas campos presentes no
    formulário e preserva as escolhas do seletor original.
    """

    field_labels = {
        "username": _("Usuário"),
        "password": _("Senha"),
        "password1": _("Senha"),
        "password2": _("Confirmação da senha"),
        "email": _("E-mail"),
        "display_name": _("Nome de exibição"),
        "bio": _("Biografia"),
        "avatar": _("Avatar"),
        "role": _("Função"),
        "is_active": _("Conta ativa"),
        "is_staff": _("Acesso administrativo"),
        "is_superuser": _("Superadministrador"),
        "groups": _("Grupos"),
        "user_permissions": _("Permissões específicas"),
        "is_email_verified": _("E-mail verificado"),
        "is_2fa_enabled": _("Autenticação em dois fatores"),
        "totp_secret": _("Segredo TOTP"),
        "last_login": _("Último acesso"),
        "fichas": _("Fichas"),
        "terms_accepted_at": _("Aceite dos termos"),
        "terms_and_privacy_version": _("Versão dos termos e privacidade"),
        "id": _("Identificador"),
        "created_at": _("Criado em"),
        "updated_at": _("Atualizado em"),
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field_name, label in self.field_labels.items():
            if field_name in self.fields:
                self.fields[field_name].label = label

        transfer_fields = {
            "groups": (
                _("grupos"),
                _("Pesquise os grupos disponíveis e use as setas para atribuir ou remover."),
            ),
            "user_permissions": (
                _("permissões"),
                _("Pesquise as permissões disponíveis e use as setas para atribuir ou remover."),
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
    """Edita usuários com os rótulos e widgets administrativos do PDL.

    Preserva o tratamento de senha de UserChangeForm, exibindo o resumo seguro em vez de
    oferecer o hash como campo de texto editável. Usado por UserAdmin.
    """

    class Meta(UserChangeForm.Meta):
        model = User
        fields = "__all__"


class PDLUserCreationForm(PDLAdminFormMixin, PDLUserLabelsMixin, UserCreationForm):
    """Cria usuários no admin com validação de senha do Django e estilo PDL.

    Declara os campos do modelo customizado em Meta. Para cadastro público, use
    RegisterUserUseCase, que também trata termos e verificação de e-mail.
    """

    class Meta(UserCreationForm.Meta):
        model = User
        fields = ("username", "email", "display_name", "role")
