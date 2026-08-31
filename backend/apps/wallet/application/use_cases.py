from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID

from apps.wallet.domain.entities import InsufficientBalanceError, InvalidTransferError, WalletEntity, WalletNotFoundError
from apps.wallet.domain.repositories import IWalletRepository
from common.architecture.base import UnitOfWork, UseCase


@dataclass(frozen=True, slots=True)
class GetWalletInput:
    user_id: UUID


class GetWalletUseCase(UseCase[GetWalletInput, WalletEntity]):
    def __init__(self, wallets: IWalletRepository) -> None:
        self._wallets = wallets

    def execute(self, data: GetWalletInput) -> WalletEntity:
        return self._wallets.get_or_create(data.user_id)


@dataclass(frozen=True, slots=True)
class TransferToPlayerInput:
    sender_id: UUID
    recipient_username: str
    amount: Decimal
    description: str = ""


class TransferToPlayerUseCase(UseCase[TransferToPlayerInput, WalletEntity]):
    def __init__(self, wallets: IWalletRepository, unit_of_work: UnitOfWork) -> None:
        self._wallets = wallets
        self._unit_of_work = unit_of_work

    def execute(self, data: TransferToPlayerInput) -> WalletEntity:
        if data.amount <= 0:
            raise InvalidTransferError("O valor deve ser maior que zero.")
        from django.contrib.auth import get_user_model

        recipient = get_user_model().objects.filter(username__iexact=data.recipient_username).first()
        if recipient is None:
            raise InvalidTransferError("Destinatário não encontrado.")
        if recipient.id == data.sender_id:
            raise InvalidTransferError("Não é possível transferir para si mesmo.")

        with self._unit_of_work:
            sender = self._wallets.get_or_create(data.sender_id)
            if sender.balance < data.amount:
                raise InsufficientBalanceError()
            recipient_wallet = self._wallets.get_or_create(recipient.id)
            self._wallets.debit(
                sender.id,
                data.amount,
                destination=recipient.username,
                description=data.description or f"Transferência para {recipient.username}",
            )
            self._wallets.credit(
                recipient_wallet.id,
                data.amount,
                origin=str(data.sender_id),
                description=data.description or "Transferência recebida",
            )
            updated = self._wallets.get_by_user_id(data.sender_id)
            if updated is None:
                raise WalletNotFoundError()
            return updated
