from __future__ import annotations

from abc import ABC, abstractmethod
from decimal import Decimal
from uuid import UUID

from apps.wallet.domain.entities import WalletEntity


class IWalletRepository(ABC):
    @abstractmethod
    def get_by_user_id(self, user_id: UUID) -> WalletEntity | None:
        raise NotImplementedError

    @abstractmethod
    def get_or_create(self, user_id: UUID) -> WalletEntity:
        raise NotImplementedError

    @abstractmethod
    def credit(self, wallet_id: UUID, amount: Decimal, *, origin: str, description: str) -> WalletEntity:
        raise NotImplementedError

    @abstractmethod
    def credit_bonus(self, wallet_id: UUID, amount: Decimal, *, origin: str, description: str) -> WalletEntity:
        raise NotImplementedError

    @abstractmethod
    def debit(self, wallet_id: UUID, amount: Decimal, *, destination: str, description: str) -> WalletEntity:
        raise NotImplementedError

    @abstractmethod
    def list_transactions(self, wallet_id: UUID, *, limit: int = 50) -> list[dict]:
        raise NotImplementedError
