from django.contrib import admin

from apps.content.infrastructure.models import DownloadLink, Faq, News


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
