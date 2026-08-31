from django.contrib import admin

from apps.accounts.infrastructure.models import User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("username", "email", "role", "is_active", "created_at")
    search_fields = ("username", "email")
    list_filter = ("role", "is_active", "is_email_verified")
    readonly_fields = ("id", "created_at", "updated_at")
