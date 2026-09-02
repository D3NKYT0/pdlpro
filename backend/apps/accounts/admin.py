from django.contrib import admin

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
        ("Acesso", {"fields": ("username", "password", "email")}),
        ("Perfil", {"fields": ("display_name", "bio", "avatar", "role")}),
        (
            "Status e permissões",
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
            "Segurança",
            {"fields": ("is_email_verified", "is_2fa_enabled", "totp_secret", "last_login")},
        ),
        ("Economia", {"fields": ("fichas",)}),
        ("Termos", {"fields": ("terms_accepted_at", "terms_and_privacy_version")}),
        ("Metadados", {"fields": ("id", "created_at", "updated_at"), "classes": ("collapse",)}),
    )
    add_fieldsets = (
        (
            "Nova conta",
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
