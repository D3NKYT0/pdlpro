from __future__ import annotations

from datetime import datetime

from apps.payment.infrastructure.models import WebhookLog
from apps.staff.domain.observability import (
    IObservabilityLogRepository,
    ObservabilityPruneCounts,
)
from apps.staff.infrastructure.models import AuditLog


class DjangoObservabilityLogRepository(IObservabilityLogRepository):
    """Conta e remove ``AuditLog`` e ``WebhookLog`` expirados via ORM Django."""

    def count_expired(
        self, *, audit_before: datetime, webhook_before: datetime
    ) -> ObservabilityPruneCounts:
        return ObservabilityPruneCounts(
            audit=AuditLog.objects.filter(created_at__lt=audit_before).count(),
            webhook=WebhookLog.objects.filter(created_at__lt=webhook_before).count(),
        )

    def delete_expired(
        self, *, audit_before: datetime, webhook_before: datetime
    ) -> ObservabilityPruneCounts:
        audit_deleted, _ = AuditLog.objects.filter(created_at__lt=audit_before).delete()
        webhook_deleted, _ = WebhookLog.objects.filter(
            created_at__lt=webhook_before
        ).delete()
        return ObservabilityPruneCounts(audit=audit_deleted, webhook=webhook_deleted)
