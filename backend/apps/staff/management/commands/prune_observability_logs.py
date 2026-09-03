from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.payment.infrastructure.models import WebhookLog
from apps.staff.infrastructure.models import AuditLog


class Command(BaseCommand):
    """Remove expired audit and webhook records according to the configured retention policy."""

    help = "Preview or apply the configured observability-log retention policy."

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Delete expired records. Without this flag, only report what would be deleted.",
        )

    def handle(self, *args, **options):
        audit_days = settings.AUDIT_LOG_RETENTION_DAYS
        webhook_days = settings.WEBHOOK_LOG_RETENTION_DAYS
        if audit_days < 1 or webhook_days < 1:
            raise CommandError("Retention periods must be at least one day.")

        now = timezone.now()
        querysets = {
            "audit": AuditLog.objects.filter(created_at__lt=now - timedelta(days=audit_days)),
            "webhook": WebhookLog.objects.filter(created_at__lt=now - timedelta(days=webhook_days)),
        }
        counts = {name: queryset.count() for name, queryset in querysets.items()}
        mode = "apply" if options["apply"] else "preview"
        self.stdout.write(
            f"mode={mode} audit={counts['audit']} webhook={counts['webhook']} "
            f"audit_days={audit_days} webhook_days={webhook_days}"
        )
        if options["apply"]:
            for queryset in querysets.values():
                queryset.delete()
