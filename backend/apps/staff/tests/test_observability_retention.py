from datetime import timedelta

import pytest
from django.core.management import CommandError, call_command
from django.utils import timezone

from apps.payment.infrastructure.models import WebhookLog
from apps.staff.infrastructure.models import AuditLog


@pytest.mark.django_db
def test_retention_is_preview_only_until_apply(settings, capsys):
    settings.AUDIT_LOG_RETENTION_DAYS = 30
    settings.WEBHOOK_LOG_RETENTION_DAYS = 7
    audit = AuditLog.objects.create(action="old-event")
    webhook = WebhookLog.objects.create(kind="old-event", data_id="evt-1", payload={})
    old_date = timezone.now() - timedelta(days=31)
    AuditLog.objects.filter(pk=audit.pk).update(created_at=old_date)
    WebhookLog.objects.filter(pk=webhook.pk).update(created_at=old_date)

    call_command("prune_observability_logs")

    assert AuditLog.objects.filter(pk=audit.pk).exists()
    assert WebhookLog.objects.filter(pk=webhook.pk).exists()
    assert "mode=preview audit=1 webhook=1" in capsys.readouterr().out

    call_command("prune_observability_logs", apply=True)

    assert not AuditLog.objects.filter(pk=audit.pk).exists()
    assert not WebhookLog.objects.filter(pk=webhook.pk).exists()


@pytest.mark.django_db
def test_retention_preserves_recent_records(settings):
    settings.AUDIT_LOG_RETENTION_DAYS = 30
    settings.WEBHOOK_LOG_RETENTION_DAYS = 7
    audit = AuditLog.objects.create(action="recent-event")
    webhook = WebhookLog.objects.create(kind="recent-event", data_id="evt-2", payload={})

    call_command("prune_observability_logs", apply=True)

    assert AuditLog.objects.filter(pk=audit.pk).exists()
    assert WebhookLog.objects.filter(pk=webhook.pk).exists()


@pytest.mark.django_db
def test_retention_rejects_zero_day_configuration(settings):
    settings.AUDIT_LOG_RETENTION_DAYS = 0
    settings.WEBHOOK_LOG_RETENTION_DAYS = 7

    with pytest.raises(CommandError, match="at least one day"):
        call_command("prune_observability_logs", apply=True)
