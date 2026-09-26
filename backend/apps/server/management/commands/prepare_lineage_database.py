from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.server.domain.gateways import ILineageGateway
from common.di.bootstrap import DependencyInjection


class Command(BaseCommand):
    """Comando Django ``prepare_lineage_database``.

    Verifica e adiciona na tabela accounts do jogo as colunas exigidas pelo PDL PRO:
    email, created_time e linked_uuid.
    Opcionalmente também prepara a tabela pdl_exchange_receipts com a flag --with-exchange.
    """

    help = "Verifica e prepara as colunas do PDL na tabela accounts do Lineage 2 (email, created_time, linked_uuid)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--with-exchange",
            action="store_true",
            default=False,
            help="Também prepara a tabela pdl_exchange_receipts para o câmbio de moedas.",
        )

    def handle(self, *args, **options):
        if not getattr(settings, "LINEAGE_DB_ENABLED", False):
            raise CommandError(
                "Ative LINEAGE_DB_ENABLED e configure o banco do jogo antes de preparar as colunas."
            )
        gateway = DependencyInjection.root().resolve(ILineageGateway)
        added = gateway.ensure_columns()
        if added:
            self.stdout.write(
                self.style.SUCCESS(f"Colunas adicionadas à tabela accounts com sucesso: {', '.join(added)}")
            )
        else:
            self.stdout.write(
                self.style.SUCCESS("Tabela accounts verificada: todas as colunas necessárias (email, created_time, linked_uuid) já existem.")
            )

        if options.get("with_exchange"):
            execute = getattr(gateway, "_execute", None)
            assert_ready = getattr(gateway, "assert_exchange_ready", None)
            if callable(execute) and callable(assert_ready):
                try:
                    execute("exchange_create_receipts")
                    assert_ready()
                    self.stdout.write(self.style.SUCCESS("Tabela pdl_exchange_receipts preparada."))
                except Exception as exc:
                    raise CommandError(
                        "Falha ao preparar tabela pdl_exchange_receipts. Verifique se o MySQL suporta InnoDB."
                    ) from exc
