from django.contrib import admin

from apps.support.models import Ticket, TicketMessage
from common.admin import PDLModelAdmin


class TicketMessageInline(admin.TabularInline):
    model = TicketMessage
    extra = 0
    fields = ("author", "body", "is_staff_reply", "is_internal", "created_at")
    readonly_fields = ("created_at",)


@admin.register(Ticket)
class TicketAdmin(PDLModelAdmin):
    list_display = ("protocol", "subject", "user", "category", "priority", "status", "assigned_to", "last_activity_at")
    list_filter = ("status", "priority", "category")
    search_fields = ("protocol", "subject", "user__username", "user__email")
    readonly_fields = ("protocol", "first_response_at", "resolved_at", "closed_at")
    inlines = (TicketMessageInline,)


@admin.register(TicketMessage)
class TicketMessageAdmin(PDLModelAdmin):
    list_display = ("ticket", "author", "is_staff_reply", "is_internal", "created_at")
    list_filter = ("is_staff_reply", "is_internal")
    search_fields = ("ticket__protocol", "body", "author__username")

