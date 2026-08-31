from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True, slots=True)
class BonusPreview:
    amount: Decimal
    bonus: Decimal
    percent: Decimal
    description: str
    total: Decimal


class IPurchaseBonusPolicy(ABC):
    @abstractmethod
    def preview(self, amount: Decimal) -> BonusPreview:
        raise NotImplementedError
