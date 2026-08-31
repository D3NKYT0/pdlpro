from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from uuid import UUID


@dataclass(frozen=True, slots=True)
class PaymentOrderEntity:
    id: UUID
    user_id: UUID
    amount: Decimal
    coins: Decimal
    currency: str
    package_code: str
    method: str
    status: str
    external_id: str
    checkout_url: str
    client_secret: str
    bonus_applied: Decimal
    total_credited: Decimal
    gateway_data: dict = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class CheckoutSession:
    external_id: str
    checkout_url: str
    client_secret: str = ""
    public_key: str = ""


@dataclass(frozen=True, slots=True)
class ProcessResult:
    status: str
    external_id: str = ""
    pix_qr_code: str = ""
    pix_qr_code_base64: str = ""
    pix_ticket_url: str = ""
    boleto_url: str = ""
    boleto_barcode: str = ""
    message: str = ""
    raw: dict = field(default_factory=dict)
