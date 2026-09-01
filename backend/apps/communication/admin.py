from django.contrib import admin

from apps.communication.infrastructure.models import Notification, PushSubscription
from common.admin import PDLModelAdmin


@admin.register(Notification)
class NotificationAdmin(PDLModelAdmin):
    list_display = ("title", "user", "kind", "is_read", "created_at")
    list_filter = ("kind", "is_read")
    search_fields = ("title", "user__username")


@admin.register(PushSubscription)
class PushSubscriptionAdmin(PDLModelAdmin):
    list_display = ("user", "endpoint", "created_at")
    search_fields = ("user__username", "endpoint")
