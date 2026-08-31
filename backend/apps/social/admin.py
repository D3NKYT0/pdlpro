from django.contrib import admin

from apps.social.infrastructure.models import Post


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ("id", "created_at")
