from django.contrib import admin

from apps.social.infrastructure.models import Post


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ("author", "body", "is_published", "created_at")
    list_filter = ("is_published",)
    search_fields = ("body", "author__username")
