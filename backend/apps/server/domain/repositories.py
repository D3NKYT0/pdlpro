from __future__ import annotations

from abc import ABC, abstractmethod
from uuid import UUID


class IServicePriceRepository(ABC):
    @abstractmethod
    def get_price(self, code: str):
        raise NotImplementedError


class ILinkSlotRepository(ABC):
    @abstractmethod
    def extra_slots(self, user_id: UUID) -> int:
        raise NotImplementedError

    @abstractmethod
    def add_slots(self, user_id: UUID, quantity: int) -> int:
        raise NotImplementedError
