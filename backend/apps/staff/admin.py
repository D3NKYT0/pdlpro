from django.contrib import admin

from apps.staff.infrastructure.models import AuditLog
from common.admin import PDLModelAdmin


@admin.register(AuditLog)
class AuditLogAdmin(PDLModelAdmin):
    """Read-only operational view of staff audit events."""

    list_display = ("created_at", "actor", "action", "status_code", "request_id")
    list_filter = ("method", "status_code", "created_at")
    search_fields = ("actor__username", "action", "request_id", "path", "target_id")
    readonly_fields = (
        "actor",
        "action",
        "request_id",
        "ip_address",
        "method",
        "path",
        "status_code",
        "target_type",
        "target_id",
        "payload",
        "created_at",
        "updated_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
