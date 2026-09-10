from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from apps.programs.models import RoadmapEntry, Supporter, SystemResource
from common.admin import PDLModelAdmin


@admin.register(RoadmapEntry)
class RoadmapEntryAdmin(PDLModelAdmin):
    """Administração editorial do roadmap público com camadas PT/EN/ES."""

    list_display = ("title", "category", "status", "progress", "published", "order")
    list_filter = ("status", "published", "category")
    search_fields = ("title", "title_en", "title_es", "description")
    fieldsets = (
        (_("Publicação"), {"fields": ("published", "category", "status", "progress", "target_date", "order")}),
        (_("Português"), {"fields": ("title", "description")}),
        (_("English"), {"fields": ("title_en", "description_en")}),
        (_("Español"), {"fields": ("title_es", "description_es")}),
    )


@admin.register(Supporter)
class SupporterAdmin(PDLModelAdmin):
    list_display = ("name", "user", "status", "commission_percent")
    list_filter = ("status",)
    search_fields = ("name", "user__username", "user__email")


@admin.register(SystemResource)
class SystemResourceAdmin(PDLModelAdmin):
    list_display = ("code", "name", "category", "enabled")
    list_filter = ("category", "enabled")
    search_fields = ("code", "name")
