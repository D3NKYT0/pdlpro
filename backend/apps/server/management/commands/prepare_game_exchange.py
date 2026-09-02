from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.server.domain.gateways import ILineageGateway
from common.di.bootstrap import DependencyInjection


class Command(BaseCommand):
    help = "Cria a tabela de recibos idempotentes no banco do jogo; não modifica personagens ou itens."

    def handle(self, *args, **options):
        if not settings.LINEAGE_DB_ENABLED:
            raise CommandError("Ative LINEAGE_DB_ENABLED e configure o banco do jogo antes de preparar recibos.")
        gateway = DependencyInjection.root().resolve(ILineageGateway)
        gateway._execute("exchange_create_receipts")
        self.stdout.write(self.style.SUCCESS("Tabela pdl_exchange_receipts preparada."))
