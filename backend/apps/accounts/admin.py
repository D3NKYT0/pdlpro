from django.contrib import admin
from django.contrib.auth.admin import GroupAdmin
from django.contrib.auth.models import Group
from django.utils.translation import gettext_lazy as _

from apps.accounts.forms import PDLUserChangeForm, PDLUserCreationForm
from apps.accounts.infrastructure.models import (
    Achievement,
    GamerProfile,
    RewardClaim,
    RewardDefinition,
    User,
    UserAchievement,
)
from common.admin import PDLModelAdmin

admin.site.unregister(Group)


@admin.register(Group)
class AccessGroupAdmin(GroupAdmin):
    """Somente superadministradores administram papéis e concessões de acesso.

    Protege GET, POST, exclusão em massa e associações M2M contra escalada por
    quem recebeu permissões nativas de edição de grupos por engano.
    """

    readonly_fields = ("role_capabilities",)

    def get_form(self, request, obj=None, change=False, **kwargs):
        """Localiza os nomes das capacidades no seletor nativo de permissões."""
        form = super().get_form(request, obj, change=change, **kwargs)
        if "permissions" in form.base_fields:
            form.base_fields["permissions"].label_from_instance = lambda permission: f"{permission.content_type.app_label} | {_(permission.name)}"
        return form

    @admin.display(description=_("Permissões do papel"))
    def role_capabilities(self, obj):
        """Expõe os grants do template, que não aparecem no seletor de exceções."""
        from apps.accounts.domain.access import ROLE_GROUP_PREFIX, role_permissions
        role = obj.name.removeprefix(ROLE_GROUP_PREFIX) if obj and obj.name.startswith(ROLE_GROUP_PREFIX) else ""
        return ", ".join(sorted(role_permissions([role]))) or "—"

    def has_module_permission(self, request):
        return bool(request.user.is_active and request.user.is_superuser)

    def has_view_permission(self, request, obj=None):
        return self.has_module_permission(request)

    def has_add_permission(self, request):
        return self.has_module_permission(request)

    def has_change_permission(self, request, obj=None):
        return self.has_module_permission(request)

    def has_delete_permission(self, request, obj=None):
        return self.has_module_permission(request)


@admin.register(User)
class UserAdmin(PDLModelAdmin):
    """Configura a administração Django de ``User``.

    A listagem exibe ``username``, ``email``, ``role``, ``is_active``, ``created_at``. Ajuste
    filtros, busca e campos nesta classe para mudar a experiência da equipe no admin; regras
    reutilizáveis ficam na aplicação.
    """

    form = PDLUserChangeForm
    add_form = PDLUserCreationForm
    list_display = ("username", "email", "role", "is_active", "created_at")
    search_fields = ("username", "email")
    list_filter = ("role", "is_active", "is_email_verified")
    readonly_fields = ("id", "last_login", "created_at", "updated_at")
    fieldsets = (
        (_("Acesso"), {"fields": ("username", "password", "email")}),
        (_("Perfil"), {"fields": ("display_name", "bio", "avatar", "role")}),
        (
            _("Status e permissões"),
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        (
            _("Segurança"),
            {
                "fields": ("is_email_verified", "is_2fa_enabled", "last_login"),
                "description": _(
                    "O segredo TOTP não é exibido nem editável. Desmarcar a autenticação em "
                    "dois fatores apaga o segredo e os códigos de recuperação; o usuário "
                    "precisa cadastrar o 2FA novamente."
                ),
            },
        ),
        (_("Economia"), {"fields": ("fichas",)}),
        (_("Termos"), {"fields": ("terms_accepted_at", "terms_and_privacy_version", "terms_accepted_ip", "terms_accepted_user_agent")}),
        (_("Metadados"), {"fields": ("id", "created_at", "updated_at"), "classes": ("collapse",)}),
    )
    add_fieldsets = (
        (
            _("Nova conta"),
            {
                "fields": (
                    "username",
                    "email",
                    "display_name",
                    "role",
                    "password1",
                    "password2",
                )
            },
        ),
    )

    def has_add_permission(self, request):
        """Criação de identidades administrativas fica reservada ao superadministrador."""
        return bool(request.user.is_active and request.user.is_superuser)

    def has_change_permission(self, request, obj=None):
        """Impede promoção, troca de credenciais e alteração de saldo por editores de usuários."""
        return bool(request.user.is_active and request.user.is_superuser)

    def has_delete_permission(self, request, obj=None):
        """Exclusão de identidades exige superadministrador."""
        return bool(request.user.is_active and request.user.is_superuser)

    def get_fieldsets(self, request, obj=None):
        if obj is None:
            return self.add_fieldsets
        return super().get_fieldsets(request, obj)

    def get_form(self, request, obj=None, change=False, **kwargs):
        kwargs["form"] = self.add_form if obj is None else self.form
        return super().get_form(request, obj, change=change, **kwargs)


@admin.register(GamerProfile)
class GamerProfileAdmin(PDLModelAdmin):
    """Configura a administração Django de ``GamerProfile``.

    A listagem exibe ``user``, ``level``, ``xp``. Ajuste filtros, busca e campos nesta classe
    para mudar a experiência da equipe no admin; regras reutilizáveis ficam na aplicação.
    """

    list_display = ("user", "level", "xp")


@admin.register(Achievement)
class AchievementAdmin(PDLModelAdmin):
    """Configura a administração Django de ``Achievement``.

    A listagem exibe ``code``, ``name``. Ajuste filtros, busca e campos nesta classe para mudar
    a experiência da equipe no admin; regras reutilizáveis ficam na aplicação.
    """

    list_display = ("code", "name")


@admin.register(UserAchievement)
class UserAchievementAdmin(PDLModelAdmin):
    """Configura a administração Django de ``UserAchievement``.

    A listagem exibe ``user``, ``achievement``, ``created_at``. Ajuste filtros, busca e campos
    nesta classe para mudar a experiência da equipe no admin; regras reutilizáveis ficam na
    aplicação.
    """

    list_display = ("user", "achievement", "created_at")


@admin.register(RewardDefinition)
class RewardDefinitionAdmin(PDLModelAdmin):
    """Configura a administração Django de ``RewardDefinition``.

    A listagem exibe ``kind``, ``reference``, ``item_name``, ``quantity``. Ajuste filtros, busca
    e campos nesta classe para mudar a experiência da equipe no admin; regras reutilizáveis
    ficam na aplicação.
    """

    list_display = ("kind", "reference", "item_name", "quantity")


@admin.register(RewardClaim)
class RewardClaimAdmin(PDLModelAdmin):
    """Configura a administração Django de ``RewardClaim``.

    A listagem exibe ``user``, ``reward``, ``created_at``. Ajuste filtros, busca e campos nesta
    classe para mudar a experiência da equipe no admin; regras reutilizáveis ficam na aplicação.
    """

    list_display = ("user", "reward", "created_at")
