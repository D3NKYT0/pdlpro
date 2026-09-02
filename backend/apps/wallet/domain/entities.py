from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID

from common.architecture.exceptions import DomainError, EntityNotFoundError, ValidationDomainError


@dataclass(frozen=True, slots=True)
class WalletEntity:
    """Retrato da carteira: saldo principal e saldo de bônus em moedas do painel.

    É um objeto de dados; não carrega métodos de persistência do ORM. Consulte os campos tipados
    abaixo ao montar ou consumir o resultado.
    """

    id: UUID
    user_id: UUID
    balance: Decimal
    bonus_balance: Decimal


class WalletNotFoundError(EntityNotFoundError):
    """Falha de domínio: Carteira não encontrada."""

    message = "Carteira não encontrada."


class InsufficientBalanceError(DomainError):
    """Falha de domínio: Saldo insuficiente.

    A apresentação expõe o código ``INSUFFICIENT_BALANCE`` com status HTTP 400. Lance esta
    exceção quando a condição ocorrer na regra de negócio.
    """

    error_code = "INSUFFICIENT_BALANCE"
    status_code = 400
    message = "Saldo insuficiente."


class InvalidTransferError(ValidationDomainError):
    """Falha de domínio: Transferência inválida.

    A apresentação expõe o código ``INVALID_TRANSFER``. Lance esta exceção quando a condição
    ocorrer na regra de negócio.
    """

    error_code = "INVALID_TRANSFER"
    message = "Transferência inválida."
