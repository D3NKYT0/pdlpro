import re
from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID

from django.conf import settings
from sqlalchemy.exc import SQLAlchemyError

from apps.server.domain.access import IAccountAccessService
from apps.server.domain.gateways import ILineageGateway
from apps.wallet.domain.coins import floor_coins, is_whole_coins
from apps.wallet.domain.entities import InsufficientBalanceError
from apps.wallet.domain.repositories import IGameExchangeRepository, IWalletRepository
from common.architecture.base import UnitOfWork, UseCase
from common.architecture.exceptions import ValidationDomainError
from common.currency_identity import coin_display_name


def exchange_dump(row):
    # Resposta do próprio jogador: o ID do item da moeda fica só nas telas da equipe.
    return {
        "id": str(row.id),
        "request_key": str(row.request_key),
        "direction": row.direction,
        "login": row.login,
        "character_id": row.character_id,
        "character_name": row.character_name,
        "quantity": row.quantity,
        "amount": str(row.amount),
        "fee": str(row.fee),
        "status": row.status,
        "message": row.error,
        "created_at": row.created_at,
    }


@dataclass(frozen=True, slots=True)
class ExchangeStateInput:
    """Consulta do câmbio: ``staff`` revela o ID do item da moeda, oculto para jogadores."""

    user_id: UUID
    staff: bool = False


_GENERIC_ITEM_NAME = re.compile(r"^\s*item\s+#?\d+\s*$", re.IGNORECASE)


def player_coin(coin: dict | None, *, staff: bool) -> dict | None:
    """Recorta a moeda ativa para a tela do jogador: sem ID do item e sem nome genérico."""

    if coin is None or staff:
        return coin
    visible = {key: value for key, value in coin.items() if key != "item_id"}
    if not visible.get("name") or _GENERIC_ITEM_NAME.match(str(visible["name"])):
        visible["name"] = coin_display_name(title=True)
    return visible


class GetExchangeStateUseCase(UseCase[ExchangeStateInput, dict]):
    """Consulta disponibilidade do câmbio, moeda ativa e histórico recente do usuário.

    Uso: resolva pelo container e chame ``execute(ExchangeStateInput(...))``. Lê configuração e
    histórico via ``IWalletRepository`` e verifica a prontidão do gateway do jogo quando
    habilitado. Jogadores não recebem o ID do item da moeda.
    """

    def __init__(self, lineage: ILineageGateway, wallets: IWalletRepository) -> None:
        self._lineage = lineage
        self._wallets = wallets

    def execute(self, data: ExchangeStateInput) -> dict:
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
            "allow_withdraw": bool(getattr(settings, "WALLET_GAME_WITHDRAW_ENABLED", True)),
            "allow_online_delivery": self._lineage.allows_online_delivery(),
            "unavailable_reason": unavailable_reason,
            "coin": player_coin(self._wallets.get_active_coin_config(), staff=data.staff),
            "history": self._wallets.list_game_exchanges(data.user_id, limit=100),
        }


class ExchangeCoinsUseCase:
    """Coordena o câmbio de saldo entre o painel e o jogo com retomada por recibo.

    Chame ``execute(user, data)`` com usuário autenticado e dados validados por
    ExchangeSerializer. ``request_key`` identifica a mesma operação e deve ser reutilizada com
    os mesmos parâmetros em uma retomada. Valida vínculo, política de envio online (retirada exige offline), configuração e
    se a quantidade corresponde a um número inteiro de moedas do saldo.

    Na ida ao jogo, reserva o saldo principal antes da chamada externa. Uma rejeição de domínio
    estorna a reserva; uma falha de conexão mantém o registro pending para consultar/reaplicar o
    mesmo recibo. Na volta, credita o painel após confirmação do gateway. O recibo durável no
    jogo evita aplicar duas vezes; não há uma transação única entre os dois bancos.

    Dual-DB: cada ``with self._unit_of_work`` delimita um atomic do Django; a saída normal do
    contexto confirma (commit) igual a ``transaction.atomic``, então a reserva fica persistida
    antes da chamada externa e os blocos de estorno/conclusão são novas fronteiras.
    """

    def __init__(
        self,
        lineage: ILineageGateway,
        access: IAccountAccessService,
        wallets: IWalletRepository,
        exchanges: IGameExchangeRepository,
        unit_of_work: UnitOfWork,
    ):
        self.lineage = lineage
        self.access = access
        self.wallets = wallets
        self.exchanges = exchanges
        self._unit_of_work = unit_of_work

    def execute(self, user, data):
        # Commit the reservation before contacting the second database. A durable
        # game-side receipt makes retries safe even after an ambiguous network error.
        # UnitOfWork context exit commits (same semantics as transaction.atomic).
        with self._unit_of_work:
            self.exchanges.lock_user(user.id)
            row = self.exchanges.find_by_request_key(user.id, data["request_key"])
            resumed = row is not None
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
                # Retomadas de operações já criadas seguem; só novas retiradas são recusadas.
                if data["direction"] == "from_game" and not getattr(settings, "WALLET_GAME_WITHDRAW_ENABLED", True):
                    raise ValidationDomainError("Trazer moedas do jogo está desativado.")
                if self.exchanges.has_pending(user.id):
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
                if not char or (char.online and not (data["direction"] == "to_game" and self.lineage.allows_online_delivery())):
                    raise ValidationDomainError(
                        "Selecione um personagem seu que esteja offline."
                    )
                config = self.wallets.get_active_coin_config()
                game_rate = Decimal(config["game_units_per_coin"]) if config else Decimal(0)
                fee_percent = (
                    Decimal(config["withdraw_fee_percent"]) if config else Decimal(0)
                )
                if (
                    not config
                    or game_rate <= 0
                    or not 0 <= fee_percent < 100
                ):
                    raise ValidationDomainError("Conversão de moedas não configurada.")
                gross = Decimal(data["quantity"]) / game_rate
                if not is_whole_coins(gross):
                    raise ValidationDomainError(
                        "A quantidade deve corresponder a um número inteiro de moedas do saldo."
                    )
                gross = floor_coins(gross)
                fee = (
                    floor_coins(gross * fee_percent / 100)
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
                row = self.exchanges.create(
                    user=user,
                    **data,
                    character_name=char.name,
                    item_id=config["item_id"],
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
            # Uma retomada revalida o vínculo atual: se a conta mudou de dono, o recibo ainda
            # não aplicado vira terminal no jogo; um recibo já aplicado segue para conciliação.
            if resumed and not self.access.can_access(user.id, user.username, row.login):
                if self.lineage.cancel_exchange(str(row.id), "Conta não vinculada ao seu usuário.") != "completed":
                    raise ValidationDomainError("Conta não vinculada ao seu usuário.")
            else:
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
            with self._unit_of_work:
                row = self.exchanges.get_locked(row.pk)
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
                    self.exchanges.save(row)
            return exchange_dump(row)
        except (OSError, TimeoutError, RuntimeError, SQLAlchemyError):
            row = self.exchanges.mark_connection_uncertain(row.pk)
            return exchange_dump(row)
        with self._unit_of_work:
            row = self.exchanges.get_locked(row.pk)
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
                self.exchanges.save(row)
        return exchange_dump(row)
