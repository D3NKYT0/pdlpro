from decimal import Decimal, ROUND_DOWN

from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.server.domain.access import IAccountAccessService
from apps.server.domain.gateways import ILineageGateway
from apps.wallet.infrastructure.exchange_models import GameExchange
from apps.wallet.infrastructure.models import CoinConfig, Wallet, WalletTransaction
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

    def __init__(self, lineage: ILineageGateway, access: IAccountAccessService):
        self.lineage, self.access = lineage, access

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
                    raise ValidationError(
                        "Esta chave já pertence a outra transferência."
                    )
            else:
                if GameExchange.objects.filter(user=user, status="pending").exists():
                    raise ValidationError(
                        "Retome a transferência pendente no histórico antes de iniciar outra."
                    )
                try:
                    self.lineage.assert_exchange_ready()
                except Exception:
                    raise ValidationError(
                        "Integração de moedas indisponível. A equipe precisa verificar a conexão, os recibos e as tabelas transacionais."
                    )
                if not self.access.can_access(user.id, user.username, data["login"]):
                    raise ValidationError("Conta não vinculada ao seu usuário.")
                char = self.lineage.get_character(data["login"], data["character_id"])
                if not char or char.online:
                    raise ValidationError(
                        "Selecione um personagem seu que esteja offline."
                    )
                config = CoinConfig.objects.filter(active=True).first()
                if (
                    not config
                    or config.multiplier <= 0
                    or not 0 <= config.withdraw_fee_percent < 100
                ):
                    raise ValidationError("Conversão de moedas não configurada.")
                gross = Decimal(data["quantity"]) / config.multiplier
                if gross != gross.quantize(Decimal("0.01")):
                    raise ValidationError(
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
                    raise ValidationError("Valor de conversão inválido.")
                wallet, _ = Wallet.objects.get_or_create(user=user)
                wallet = Wallet.objects.select_for_update().get(pk=wallet.pk)
                if data["direction"] == "to_game":
                    if wallet.balance < amount:
                        raise ValidationError(
                            "Saldo insuficiente. Bônus não pode ser enviado ao jogo."
                        )
                    wallet.balance -= amount
                    wallet.save(update_fields=["balance", "updated_at"])
                row = GameExchange.objects.create(
                    user=user,
                    **data,
                    character_name=char.name,
                    item_id=config.coin_id,
                    amount=amount,
                    fee=fee,
                )
                if row.direction == "to_game":
                    WalletTransaction.objects.create(
                        wallet=wallet,
                        kind="SAIDA",
                        amount=amount,
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
                        wallet = Wallet.objects.select_for_update().get(user=user)
                        wallet.balance += row.amount
                        wallet.save(update_fields=["balance", "updated_at"])
                        WalletTransaction.objects.create(
                            wallet=wallet,
                            kind="ENTRADA",
                            amount=row.amount,
                            origin="game_exchange_refund",
                            description=f"Estorno · {row.id}",
                        )
                    row.status, row.error = "rejected", str(exc)[:300]
                    row.save()
            return exchange_dump(row)
        except Exception:
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
                    wallet = Wallet.objects.select_for_update().get(user=user)
                    wallet.balance += row.amount
                    wallet.save(update_fields=["balance", "updated_at"])
                    WalletTransaction.objects.create(
                        wallet=wallet,
                        kind="ENTRADA",
                        amount=row.amount,
                        origin="game_exchange",
                        description=f"Moedas retiradas do jogo · {row.id}",
                    )
                row.status, row.error = "completed", ""
                row.save()
        return exchange_dump(row)
