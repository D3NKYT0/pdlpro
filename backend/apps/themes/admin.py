from django.contrib import admin

from apps.themes.infrastructure.models import ThemePackage
from common.admin import PDLModelAdmin


@admin.register(ThemePackage)
class ThemePackageAdmin(PDLModelAdmin):
    """Exibe metadados dos pacotes; instalação e ativação permanecem na API segura."""

    list_display = ("name", "slug", "version", "is_active", "author", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name", "slug", "author")
    readonly_fields = (
        "id", "slug", "name", "version", "author", "description", "manifest",
        "content_hash", "storage_path", "entrypoint", "installed_by", "created_at", "updated_at",
    )

