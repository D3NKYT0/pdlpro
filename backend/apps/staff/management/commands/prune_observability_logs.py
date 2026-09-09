from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.staff.application.observability import (
    PruneObservabilityLogsInput,
    PruneObservabilityLogsUseCase,
)
from common.architecture.exceptions import ValidationDomainError
from common.di.bootstrap import DependencyInjection


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
        scope = DependencyInjection.root().create_scope()
        use_case = scope.resolve(PruneObservabilityLogsUseCase)
        try:
            result = use_case.execute(
                PruneObservabilityLogsInput(
                    apply=bool(options["apply"]),
                    audit_days=settings.AUDIT_LOG_RETENTION_DAYS,
                    webhook_days=settings.WEBHOOK_LOG_RETENTION_DAYS,
                )
            )
        except ValidationDomainError as exc:
            raise CommandError(str(exc)) from exc
        mode = "apply" if result.applied else "preview"
        self.stdout.write(
            f"mode={mode} audit={result.counts.audit} webhook={result.counts.webhook} "
            f"audit_days={result.audit_days} webhook_days={result.webhook_days}"
        )
