from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from django.db.models import F

from apps.wallet.domain.entities import InsufficientBalanceError, WalletEntity
from apps.wallet.domain.repositories import IWalletRepository
from apps.wallet.infrastructure.models import Wallet, WalletTransaction


class DjangoWalletRepository(IWalletRepository):
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

    def list_transactions(self, wallet_id: UUID, *, limit: int = 50) -> list[dict]:
        rows = WalletTransaction.objects.filter(wallet__id=wallet_id).order_by("-created_at")[:limit]
        return [
            {
                "id": str(row.id),
                "kind": row.kind,
                "amount": str(row.amount),
                "description": row.description,
                "origin": row.origin,
                "destination": row.destination,
                "created_at": row.created_at.isoformat(),
            }
            for row in rows
        ]
