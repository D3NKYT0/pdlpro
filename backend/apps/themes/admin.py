from django import forms
from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from apps.themes.application.template_catalog import TEMPLATE_SECTIONS
from apps.themes.infrastructure.models import ThemePackage
from common.admin import PDLModelAdmin
from common.forms import PDLAdminModelForm


class ThemePackageAdminForm(PDLAdminModelForm):
    """Só o template do catálogo é operacional no Jazzmin; o ZIP não é reescrito."""

    selected_template = forms.ChoiceField(
        label=_("Template do catálogo"),
        required=False,
        choices=(("", _("Usar o renderer do ZIP")), *((tid, tid) for tid in TEMPLATE_SECTIONS)),
        help_text=_("Layout público escolhido depois da instalação. Vazio usa o renderer do ZIP."),
    )

    class Meta:
        model = ThemePackage
        fields = "__all__"


@admin.register(ThemePackage)
class ThemePackageAdmin(PDLModelAdmin):
    """Exibe metadados dos pacotes; instalação e ativação permanecem na API segura."""

    form = ThemePackageAdminForm
    list_display = ("name", "slug", "version", "is_active", "selected_template", "author", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name", "slug", "author", "selected_template")
    readonly_fields = (
        "id", "slug", "name", "version", "author", "description", "manifest",
        "content_hash", "storage_path", "entrypoint", "installed_by", "created_at", "updated_at",
    )

