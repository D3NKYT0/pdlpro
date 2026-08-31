from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID


@dataclass(frozen=True, slots=True)
class PaymentOrderEntity:
    id: UUID
    user_id: UUID
    amount: Decimal
    coins: Decimal
    method: str
    status: str
    external_id: str
    checkout_url: str
    bonus_applied: Decimal
    total_credited: Decimal


@dataclass(frozen=True, slots=True)
class CheckoutSession:
    external_id: str
    checkout_url: str
