from django.contrib import admin

from apps.communication.infrastructure.models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("id", "created_at")
