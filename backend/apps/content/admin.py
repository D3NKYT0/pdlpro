from django.contrib import admin

from apps.content.infrastructure.models import CalendarEvent, DownloadLink, Faq, News, WikiPage


@admin.register(News)
class NewsAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "is_published", "published_at")
    prepopulated_fields = {"slug": ("title",)}
    list_filter = ("is_published",)


@admin.register(Faq)
class FaqAdmin(admin.ModelAdmin):
    list_display = ("question", "order", "is_published")


@admin.register(DownloadLink)
class DownloadLinkAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "is_published")


@admin.register(WikiPage)
class WikiPageAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "category", "is_published", "is_menu_item", "order")
    prepopulated_fields = {"slug": ("title",)}
    list_filter = ("category", "is_published")


@admin.register(CalendarEvent)
class CalendarEventAdmin(admin.ModelAdmin):
    list_display = ("title", "starts_at", "ends_at", "is_published")
    list_filter = ("is_published",)
