from django.contrib import admin

from apps.content.infrastructure.models import CalendarEvent, DownloadLink, Faq, News, WikiPage
from common.admin import PDLModelAdmin


@admin.register(News)
class NewsAdmin(PDLModelAdmin):
    list_display = ("title", "slug", "is_published", "published_at")
    prepopulated_fields = {"slug": ("title",)}
    list_filter = ("is_published",)


@admin.register(Faq)
class FaqAdmin(PDLModelAdmin):
    list_display = ("question", "order", "is_published")


@admin.register(DownloadLink)
class DownloadLinkAdmin(PDLModelAdmin):
    list_display = ("title", "category", "is_published")


@admin.register(WikiPage)
class WikiPageAdmin(PDLModelAdmin):
    list_display = ("title", "slug", "category", "is_published", "is_menu_item", "order")
    prepopulated_fields = {"slug": ("title",)}
    list_filter = ("category", "is_published")


@admin.register(CalendarEvent)
class CalendarEventAdmin(PDLModelAdmin):
    list_display = ("title", "starts_at", "ends_at", "is_published")
    list_filter = ("is_published",)
