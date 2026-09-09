from __future__ import annotations

from abc import ABC, abstractmethod
from decimal import Decimal
from typing import Any
from uuid import UUID


class ISupporterRepository(ABC):
    """Porta de apoiadores, comissões, cupons e pedidos de repasse.

    Injete nos casos de uso de programs e registre o adaptador no ProgramsProvider.
    """

    @abstractmethod
    def find_by_user_id(self, user_id: UUID) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def lock_user(self, user_id: UUID) -> Any:
        """Usuário sob ``select_for_update``; propaga DoesNotExist se ausente."""

        raise NotImplementedError

    @abstractmethod
    def find_by_user(self, user: Any) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def save_supporter(self, row: Any) -> Any:
        raise NotImplementedError

    @abstractmethod
    def new_supporter(self, user: Any) -> Any:
        raise NotImplementedError

    @abstractmethod
    def list_available_commission_total(self, supporter: Any) -> Decimal:
        raise NotImplementedError

    @abstractmethod
    def list_coupons(self, supporter: Any) -> list[dict]:
        raise NotImplementedError

    @abstractmethod
    def list_commissions_with_payout(self, supporter: Any, *, limit: int = 100) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def list_payouts(self, supporter: Any, *, limit: int = 100) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def lock_approved_by_user_id(self, user_id: UUID) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def available_commissions(self, supporter: Any) -> Any:
        """QuerySet ou coleção de comissões sem payout."""

        raise NotImplementedError

    @abstractmethod
    def create_payout(self, supporter: Any, amount: Decimal) -> Any:
        raise NotImplementedError

    @abstractmethod
    def assign_commissions_to_payout(self, commissions: Any, payout: Any) -> None:
        raise NotImplementedError

    @abstractmethod
    def list_all_with_user(self) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def list_recent_payouts(self, *, limit: int = 200) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def lock_by_id(self, entry_id: UUID) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def update_user_role(self, user: Any, *, from_role: str, to_role: str) -> None:
        raise NotImplementedError

    @abstractmethod
    def lock_payout(self, payout_id: UUID) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def clear_payout_commissions(self, payout: Any) -> None:
        raise NotImplementedError

    @abstractmethod
    def save_payout(self, payout: Any) -> Any:
        raise NotImplementedError


class IRoadmapRepository(ABC):
    """Porta das entradas do roadmap público e administrativo."""

    @abstractmethod
    def list_published(self) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def get_published(self, entry_id: UUID) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def list_all(self) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def create(self, **fields) -> Any:
        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, entry_id: UUID) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def save(self, row: Any) -> Any:
        raise NotImplementedError

    @abstractmethod
    def delete_by_id(self, entry_id: UUID) -> bool:
        """Remove a entrada; devolve False se não existia."""

        raise NotImplementedError


class ISystemResourceRepository(ABC):
    """Porta dos recursos do sistema e seu estado de ativação."""

    @abstractmethod
    def list_all(self) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, entry_id: UUID) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def save(self, row: Any) -> Any:
        raise NotImplementedError

    @abstractmethod
    def any_disabled(self, codes: list[str]) -> bool:
        """True se algum código em ``codes`` existir com ``enabled=False``."""

        raise NotImplementedError
