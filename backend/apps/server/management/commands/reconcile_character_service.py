from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError

from apps.server.application.paid_services import settle_service
from apps.server.infrastructure.service_models import CharacterServiceOperation


class Command(BaseCommand):
    """Concilia uma operação incerta somente após conferência manual no servidor do jogo."""

    help = "Após conferir o jogo, confirme ou estorne uma reserva de serviço pelo UUID."

    def add_arguments(self, parser):
        parser.add_argument("operation_id")
        parser.add_argument(
            "--result", choices=["completed", "rejected"], required=True
        )
        parser.add_argument(
            "--note",
            required=True,
            help="Responsável e evidência da conferência no jogo.",
        )

    def handle(self, *args, **options):
        if not options["note"].strip():
            raise CommandError("Registre o responsável e a evidência da conferência.")
        try:
            settle_service(
                options["operation_id"],
                completed=options["result"] == "completed",
                note=options["note"],
            )
        except (
            CharacterServiceOperation.DoesNotExist,
            ValueError,
            ValidationError,
        ) as exc:
            raise CommandError("Operação não encontrada.") from exc
        self.stdout.write(
            "Conciliação registrada; operações já encerradas não são reaplicadas."
        )
