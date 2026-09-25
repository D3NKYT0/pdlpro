from django.core.management.base import BaseCommand, CommandError

from apps.staff.application.secrets import (
    ApplySecretRotationJobInput,
    ApplySecretRotationJobUseCase,
    AutoSecretMaintenanceInput,
    AutoSecretMaintenanceUseCase,
)
from apps.staff.domain.secrets import ISecretRotationJobStore
from common.architecture.exceptions import ValidationDomainError
from common.di.bootstrap import DependencyInjection


class Command(BaseCommand):
    """Aplica jobs pendentes de rotação ou executa a manutenção automática."""

    help = (
        "Apply pending secret-rotation jobs, or run the scheduled maintenance "
        "(prune stale fallbacks / auto-rotate SECRET_KEY)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--maintenance",
            action="store_true",
            help="Run AutoSecretMaintenanceUseCase instead of applying every pending job.",
        )
        parser.add_argument(
            "--job-id",
            type=str,
            default="",
            help="Apply a single job UUID.",
        )

    def handle(self, *args, **options):
        scope = DependencyInjection.root().create_scope()
        if options["maintenance"]:
            result = scope.resolve(AutoSecretMaintenanceUseCase).execute(
                AutoSecretMaintenanceInput(source="management")
            )
            self.stdout.write(f"maintenance actions={result.get('actions')}")
            return
        apply = scope.resolve(ApplySecretRotationJobUseCase)
        jobs = scope.resolve(ISecretRotationJobStore)
        if options["job_id"]:
            targets = [options["job_id"]]
        else:
            targets = [item["id"] for item in jobs.list_pending()]
        if not targets:
            self.stdout.write("no pending secret rotation jobs")
            return
        from uuid import UUID

        for raw_id in targets:
            try:
                result = apply.execute(ApplySecretRotationJobInput(job_id=UUID(str(raw_id))))
            except ValidationDomainError as exc:
                raise CommandError(str(exc)) from exc
            self.stdout.write(
                f"job={result.job_id} status={result.status} restart={result.restart_required} "
                f"ok={result.ok} message={result.message}"
            )
