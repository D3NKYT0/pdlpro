from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from django.db.models import F

from apps.wallet.application.exchange import exchange_dump
from apps.wallet.domain.entities import InsufficientBalanceError, WalletEntity
from apps.wallet.domain.repositories import ICoinAdminRepository, IWalletRepository
from apps.wallet.infrastructure.exchange_models import GameExchange
from apps.wallet.infrastructure.models import CoinConfig, CoinPurchasePromo, Wallet, WalletTransaction


class DjangoWalletRepository(IWalletRepository):
    """Persiste carteiras e extratos usando o ORM do Django.

    Converte modelos em WalletEntity. Atualiza saldos com expressões F e usa um débito
    condicional para impedir saldo principal ou de bônus negativo. Não valida valores
    positivos aqui; essa validação pertence ao caso de uso. Use dentro de UnitOfWork para que
    alteração do saldo e gravação do extrato revertam juntas em caso de erro. ``debit`` não
    consome saldo de bônus; ``debit_bonus`` não consome saldo principal.
    """

    def _to_entity(self, wallet: Wallet) -> WalletEntity:
        return WalletEntity(
            id=wallet.id,
            user_id=wallet.user.id,
            balance=wallet.balance,
            bonus_balance=wallet.bonus_balance,
        )

    def get_by_user_id(self, user_id: UUID) -> WalletEntity | None:
        wallet = Wallet.objects.select_related("user").filter(user__id=user_id).first()
        return self._to_entity(wallet) if wallet else None

    def get_or_create(self, user_id: UUID) -> WalletEntity:
        from django.contrib.auth import get_user_model

        user = get_user_model().objects.get(id=user_id)
        wallet, _ = Wallet.objects.get_or_create(user=user)
        return self._to_entity(wallet)

    def credit(self, wallet_id: UUID, amount: Decimal, *, origin: str, description: str) -> WalletEntity:
        Wallet.objects.filter(id=wallet_id).update(balance=F("balance") + amount)
        wallet = Wallet.objects.select_related("user").get(id=wallet_id)
        WalletTransaction.objects.create(
            wallet=wallet,
            kind=WalletTransaction.Kind.CREDIT,
            amount=amount,
            origin=origin,
            description=description,
        )
        return self._to_entity(wallet)

    def credit_bonus(self, wallet_id: UUID, amount: Decimal, *, origin: str, description: str) -> WalletEntity:
        Wallet.objects.filter(id=wallet_id).update(bonus_balance=F("bonus_balance") + amount)
        wallet = Wallet.objects.select_related("user").get(id=wallet_id)
        WalletTransaction.objects.create(
            wallet=wallet,
            kind=WalletTransaction.Kind.CREDIT,
            amount=amount,
            origin=origin,
            description=description,
        )
        return self._to_entity(wallet)

    def debit(self, wallet_id: UUID, amount: Decimal, *, destination: str, description: str) -> WalletEntity:
        # A condição de saldo e o débito ficam no mesmo UPDATE para evitar uma corrida
        # entre a consulta de saldo feita pelo caso de uso e outra movimentação.
        updated = Wallet.objects.filter(id=wallet_id, balance__gte=amount).update(balance=F("balance") - amount)
        if not updated:
            raise InsufficientBalanceError()
        wallet = Wallet.objects.select_related("user").get(id=wallet_id)
        WalletTransaction.objects.create(
            wallet=wallet,
            kind=WalletTransaction.Kind.DEBIT,
            amount=amount,
            destination=destination,
            description=description,
        )
        return self._to_entity(wallet)

    def debit_bonus(
        self, wallet_id: UUID, amount: Decimal, *, destination: str, description: str
    ) -> WalletEntity:
        updated = Wallet.objects.filter(id=wallet_id, bonus_balance__gte=amount).update(
            bonus_balance=F("bonus_balance") - amount
        )
        if not updated:
            raise InsufficientBalanceError()
        wallet = Wallet.objects.select_related("user").get(id=wallet_id)
        WalletTransaction.objects.create(
            wallet=wallet,
            kind=WalletTransaction.Kind.DEBIT,
            amount=amount,
            destination=destination,
            description=description,
        )
        return self._to_entity(wallet)

    def list_transactions(self, wallet_id: UUID, *, limit: int = 50) -> list[dict]:
        rows = self.transaction_rows(wallet_id)[:limit]
        return [self.serialize_transaction(row) for row in rows]

    def transaction_rows(self, wallet_id: UUID):
        """QuerySet do extrato da carteira ordenado do mais recente ao mais antigo."""

        return WalletTransaction.objects.filter(wallet__id=wallet_id).order_by("-created_at")

    def serialize_transaction(self, row: WalletTransaction) -> dict:
        return {
            "id": str(row.id),
            "kind": row.kind,
            "amount": str(row.amount),
            "description": row.description,
            "origin": row.origin,
            "destination": row.destination,
            "created_at": row.created_at.isoformat(),
        }

    def get_active_coin_config(self) -> dict | None:
        config = CoinConfig.objects.filter(active=True).first()
        if config is None:
            return None
        return {
            "name": config.name,
            "item_id": config.coin_id,
            "multiplier": str(config.multiplier),
            "withdraw_fee_percent": str(config.withdraw_fee_percent),
        }

    def list_game_exchanges(self, user_id: UUID, *, limit: int = 100) -> list[dict]:
        rows = GameExchange.objects.filter(user__id=user_id).order_by("-created_at")[:limit]
        return [
            dict(exchange_dump(row), login=row.login, character_id=row.character_id)
            for row in rows
        ]


class DjangoCoinAdminRepository(ICoinAdminRepository):
    """Adaptador Django de ``ICoinAdminRepository`` para configuração de moeda e promoção.

    Concentra consultas e escritas ORM da porta administrativa. Prefira resolver a interface
    pelo container; o ``save`` dos modelos desativa outros registros ativos quando aplicável.
    """

    def get_coin_config(self) -> CoinConfig | None:
        return CoinConfig.objects.filter(active=True).first() or CoinConfig.objects.order_by("-updated_at").first()

    def save_coin_config(self, row: CoinConfig) -> CoinConfig:
        row.save()
        return row

    def new_coin_config(self, *, name: str = "Adena") -> CoinConfig:
        return CoinConfig(name=name)

    def get_promo(self) -> CoinPurchasePromo | None:
        return (
            CoinPurchasePromo.objects.filter(active=True).first()
            or CoinPurchasePromo.objects.order_by("-updated_at").first()
        )

    def save_promo(self, row: CoinPurchasePromo) -> CoinPurchasePromo:
        row.save()
        return row

    def new_promo(
        self,
        *,
        title: str = "Promoção de recarga",
        percent: Decimal = Decimal("10.00"),
        active: bool = False,
    ) -> CoinPurchasePromo:
        return CoinPurchasePromo(title=title, percent=percent, active=active)
