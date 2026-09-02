from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.server.domain.gateways import ILineageGateway
from common.di.bootstrap import DependencyInjection


class Command(BaseCommand):
    """Comando Django ``prepare_game_exchange``.

    Cria a tabela de recibos idempotentes no banco do jogo; não modifica personagens ou itens.
    Execute ``python manage.py prepare_game_exchange --help`` para consultar opções antes de
    rodar a rotina no ambiente desejado.
    """

    help = "Cria a tabela de recibos idempotentes no banco do jogo; não modifica personagens ou itens."

    def handle(self, *args, **options):
        if not settings.LINEAGE_DB_ENABLED:
            raise CommandError(
                "Ative LINEAGE_DB_ENABLED e configure o banco do jogo antes de preparar recibos."
            )
        gateway = DependencyInjection.root().resolve(ILineageGateway)
        gateway._execute("exchange_create_receipts")
        try:
            gateway.assert_exchange_ready()
        except Exception as exc:
            raise CommandError(
                "Recibos criados, mas characters, items, items_delayed e recibos precisam usar InnoDB. Verifique as tabelas com o administrador do servidor."
            ) from exc
        self.stdout.write(self.style.SUCCESS("Tabela pdl_exchange_receipts preparada."))
