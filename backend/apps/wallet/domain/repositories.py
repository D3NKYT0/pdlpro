from __future__ import annotations

from abc import ABC, abstractmethod
from decimal import Decimal
from uuid import UUID

from apps.wallet.domain.entities import WalletEntity


class IWalletRepository(ABC):
    """Porta de consulta e movimentação da carteira do painel.

    Recebe UUIDs públicos e valores Decimal em moedas do painel. ``credit`` altera o saldo
    principal; ``credit_bonus`` altera somente o saldo de bônus; ``debit`` usa somente o saldo
    principal e pode lançar InsufficientBalanceError. As movimentações registram origem/destino
    e descrição no extrato. Valide valores positivos na aplicação e envolva operações
    relacionadas em UnitOfWork: a porta não promete uma transação por chamada.
    """

    @abstractmethod
    def get_by_user_id(self, user_id: UUID) -> WalletEntity | None:
        """Consulta pelo UUID público do usuário; retorna None se não há carteira."""

        raise NotImplementedError

    @abstractmethod
    def get_or_create(self, user_id: UUID) -> WalletEntity:
        """Obtém a carteira do usuário ou cria os saldos iniciais quando ausente."""

        raise NotImplementedError

    @abstractmethod
    def credit(self, wallet_id: UUID, amount: Decimal, *, origin: str, description: str) -> WalletEntity:
        """Acrescenta moedas ao saldo principal e registra a entrada no extrato."""

        raise NotImplementedError

    @abstractmethod
    def credit_bonus(self, wallet_id: UUID, amount: Decimal, *, origin: str, description: str) -> WalletEntity:
        """Acrescenta moedas somente ao saldo de bônus e registra a entrada."""

        raise NotImplementedError

    @abstractmethod
    def debit(self, wallet_id: UUID, amount: Decimal, *, destination: str, description: str) -> WalletEntity:
        """Desconta saldo principal ou lança InsufficientBalanceError; registra a saída."""

        raise NotImplementedError

    @abstractmethod
    def list_transactions(self, wallet_id: UUID, *, limit: int = 50) -> list[dict]:
        """Lista as movimentações mais recentes da carteira, respeitando limit."""

        raise NotImplementedError
