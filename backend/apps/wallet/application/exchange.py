from decimal import ROUND_DOWN, Decimal
from uuid import UUID

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from sqlalchemy.exc import SQLAlchemyError

from apps.server.domain.access import IAccountAccessService
from apps.server.domain.gateways import ILineageGateway
from apps.wallet.domain.entities import InsufficientBalanceError
from apps.wallet.domain.repositories import IWalletRepository
from apps.wallet.infrastructure.exchange_models import GameExchange
from apps.wallet.infrastructure.models import CoinConfig
from common.architecture.base import UseCase
from common.architecture.exceptions import ValidationDomainError


def exchange_dump(row):
    return {
        "id": str(row.id),
        "request_key": str(row.request_key),
        "direction": row.direction,
        "login": row.login,
        "character_id": row.character_id,
        "character_name": row.character_name,
        "item_id": row.item_id,
        "quantity": row.quantity,
        "amount": str(row.amount),
        "fee": str(row.fee),
        "status": row.status,
        "message": row.error,
        "created_at": row.created_at,
    }


class GetExchangeStateUseCase(UseCase[UUID, dict]):
    """Consulta disponibilidade do câmbio, moeda ativa e histórico recente do usuário.

    Uso: resolva pelo container e chame ``execute(user_id)``. Lê configuração e histórico
    via ``IWalletRepository`` e verifica a prontidão do gateway do jogo quando habilitado.
    """

    def __init__(self, lineage: ILineageGateway, wallets: IWalletRepository) -> None:
        self._lineage = lineage
        self._wallets = wallets

    def execute(self, data: UUID) -> dict:
        enabled = False
        unavailable_reason = "O banco do jogo está desconectado."
        if settings.LINEAGE_DB_ENABLED:
            try:
                self._lineage.assert_exchange_ready()
                enabled, unavailable_reason = True, ""
            except (RuntimeError, OSError, TimeoutError, SQLAlchemyError):
                unavailable_reason = (
                    "A equipe precisa preparar os recibos de transferência e verificar "
                    "a conexão e as tabelas InnoDB do jogo."
                )
        return {
            "enabled": enabled,
            "unavailable_reason": unavailable_reason,
            "coin": self._wallets.get_active_coin_config(),
            "history": self._wallets.list_game_exchanges(data, limit=100),
        }


class ExchangeCoinsUseCase:
    """Coordena o câmbio de saldo entre o painel e o jogo com retomada por recibo.

    Chame ``execute(user, data)`` com usuário autenticado e dados validados por
    ExchangeSerializer. ``request_key`` identifica a mesma operação e deve ser reutilizada com
    os mesmos parâmetros em uma retomada. Valida vínculo, personagem offline, configuração e
    precisão de duas casas do saldo.

    Na ida ao jogo, reserva o saldo principal antes da chamada externa. Uma rejeição de domínio
    estorna a reserva; uma falha de conexão mantém o registro pending para consultar/reaplicar o
    mesmo recibo. Na volta, credita o painel após confirmação do gateway. O recibo durável no
    jogo evita aplicar duas vezes; não há uma transação única entre os dois bancos.
    """

    def __init__(
        self,
        lineage: ILineageGateway,
        access: IAccountAccessService,
        wallets: IWalletRepository,
    ):
        self.lineage, self.access, self.wallets = lineage, access, wallets

    def execute(self, user, data):
        # Commit the reservation before contacting the second database. A durable
        # game-side receipt makes retries safe even after an ambiguous network error.
        with transaction.atomic():
            get_user_model().objects.select_for_update().get(pk=user.pk)
            row = GameExchange.objects.filter(
                user=user, request_key=data["request_key"]
            ).first()
            if row:
                if (row.direction, row.login, row.character_id, row.quantity) != (
                    data["direction"],
                    data["login"],
                    data["character_id"],
                    data["quantity"],
                ):
                    raise ValidationDomainError(
                        "Esta chave já pertence a outra transferência."
                    )
            else:
                if GameExchange.objects.filter(user=user, status="pending").exists():
                    raise ValidationDomainError(
                        "Retome a transferência pendente no histórico antes de iniciar outra."
                    )
                try:
                    self.lineage.assert_exchange_ready()
                except (RuntimeError, OSError, TimeoutError, SQLAlchemyError):
                    raise ValidationDomainError(
                        "Integração de moedas indisponível. A equipe precisa verificar a conexão, os recibos e as tabelas transacionais."
                    ) from None
                if not self.access.can_access(user.id, user.username, data["login"]):
                    raise ValidationDomainError("Conta não vinculada ao seu usuário.")
                char = self.lineage.get_character(data["login"], data["character_id"])
                if not char or char.online:
                    raise ValidationDomainError(
                        "Selecione um personagem seu que esteja offline."
                    )
                config = CoinConfig.objects.filter(active=True).first()
                if (
                    not config
                    or config.multiplier <= 0
                    or not 0 <= config.withdraw_fee_percent < 100
                ):
                    raise ValidationDomainError("Conversão de moedas não configurada.")
                gross = Decimal(data["quantity"]) / config.multiplier
                if gross != gross.quantize(Decimal("0.01")):
                    raise ValidationDomainError(
                        "A quantidade deve corresponder a um valor exato de saldo (duas casas decimais)."
                    )
                fee = (
                    (gross * config.withdraw_fee_percent / 100).quantize(
                        Decimal("0.01"), rounding=ROUND_DOWN
                    )
                    if data["direction"] == "from_game"
                    else Decimal(0)
                )
                amount = gross - fee
                if amount <= 0 or amount > Decimal("9999999999.99"):
                    raise ValidationDomainError("Valor de conversão inválido.")
                wallet = self.wallets.get_or_create(user.id)
                if data["direction"] == "to_game" and wallet.balance < amount:
                    raise InsufficientBalanceError(
                        "Saldo insuficiente. Bônus não pode ser enviado ao jogo."
                    )
                row = GameExchange.objects.create(
                    user=user,
                    **data,
                    character_name=char.name,
                    item_id=config.coin_id,
                    amount=amount,
                    fee=fee,
                )
                if row.direction == "to_game":
                    self.wallets.debit(
                        wallet.id,
                        amount,
                        destination="game_exchange",
                        description=f"Reserva para o jogo · {row.id}",
                    )
        if row.status in ("completed", "rejected"):
            return exchange_dump(row)
        try:
            self.lineage.exchange_coins(
                str(row.id),
                row.login,
                row.character_id,
                row.item_id,
                row.quantity,
                row.direction,
            )
        except ValidationDomainError as exc:
            # A business rejection is raised only after the game transaction rolls back.
            with transaction.atomic():
                row = GameExchange.objects.select_for_update().get(pk=row.pk)
                if row.status == "pending":
                    if row.direction == "to_game":
                        wallet = self.wallets.get_or_create(user.id)
                        self.wallets.credit(
                            wallet.id,
                            row.amount,
                            origin="game_exchange_refund",
                            description=f"Estorno · {row.id}",
                        )
                    row.status, row.error = "rejected", str(exc)[:300]
                    row.save()
            return exchange_dump(row)
        except (OSError, TimeoutError, RuntimeError, SQLAlchemyError):
            GameExchange.objects.filter(pk=row.pk, status="pending").update(
                # A conexão pode cair após o jogo aplicar o envio. Preserve pending
                # e retome pelo mesmo recibo, sem estornar uma operação incerta.
                error="Conexão não confirmada. Retome esta mesma transferência; não crie outra."
            )
            row.refresh_from_db()
            return exchange_dump(row)
        with transaction.atomic():
            row = GameExchange.objects.select_for_update().get(pk=row.pk)
            if row.status == "pending":
                if row.direction == "from_game":
                    wallet = self.wallets.get_or_create(user.id)
                    self.wallets.credit(
                        wallet.id,
                        row.amount,
                        origin="game_exchange",
                        description=f"Moedas retiradas do jogo · {row.id}",
                    )
                row.status, row.error = "completed", ""
                row.save()
        return exchange_dump(row)
