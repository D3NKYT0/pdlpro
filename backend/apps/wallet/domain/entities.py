from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID

from common.architecture.exceptions import DomainError, EntityNotFoundError, ValidationDomainError


@dataclass(frozen=True, slots=True)
class WalletEntity:
    id: UUID
    user_id: UUID
    balance: Decimal
    bonus_balance: Decimal


class WalletNotFoundError(EntityNotFoundError):
    message = "Carteira não encontrada."


class InsufficientBalanceError(DomainError):
    error_code = "INSUFFICIENT_BALANCE"
    status_code = 400
    message = "Saldo insuficiente."


class InvalidTransferError(ValidationDomainError):
    error_code = "INVALID_TRANSFER"
    message = "Transferência inválida."
