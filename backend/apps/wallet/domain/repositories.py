from __future__ import annotations

from abc import ABC, abstractmethod
from decimal import Decimal
from typing import Any
from uuid import UUID

from apps.wallet.domain.entities import WalletEntity


class IWalletRepository(ABC):
    """Porta de consulta e movimentação da carteira do painel.

    Recebe UUIDs públicos e valores Decimal em moedas do painel. ``credit`` altera o saldo
    principal; ``credit_bonus`` altera somente o saldo de bônus; ``debit`` usa somente o saldo
    principal e pode lançar InsufficientBalanceError; ``debit_bonus`` usa somente o saldo de
    bônus e pode lançar InsufficientBalanceError. As movimentações registram origem/destino e
    descrição no extrato. ``transaction_rows`` devolve um iterável ordenado do mais recente ao
    mais antigo para paginação; o adaptador Django retorna um QuerySet de ``WalletTransaction``.
    Valide valores positivos na aplicação e envolva operações relacionadas em UnitOfWork: a porta
    não promete uma transação por chamada.
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
    def debit_bonus(
        self, wallet_id: UUID, amount: Decimal, *, destination: str, description: str
    ) -> WalletEntity:
        """Desconta saldo de bônus ou lança InsufficientBalanceError; registra a saída."""

        raise NotImplementedError

    @abstractmethod
    def transaction_rows(self, wallet_id: UUID):
        """Iterável ordenado do extrato para paginação na apresentação.

        O adaptador Django retorna um QuerySet; serialize cada linha com
        ``serialize_transaction`` após fatiar a página.
        """

        raise NotImplementedError

    @abstractmethod
    def serialize_transaction(self, row) -> dict:
        """Serializa uma linha de ``transaction_rows`` no formato do extrato da API."""

        raise NotImplementedError

    @abstractmethod
    def list_transactions(self, wallet_id: UUID, *, limit: int = 50) -> list[dict]:
        """Lista as movimentações mais recentes da carteira, respeitando limit."""

        raise NotImplementedError

    @abstractmethod
    def get_active_coin_config(self) -> dict | None:
        """Retorna a configuração ativa da moeda de câmbio, ou None se ausente."""

        raise NotImplementedError

    @abstractmethod
    def list_game_exchanges(self, user_id: UUID, *, limit: int = 100) -> list[dict]:
        """Lista os câmbios mais recentes do usuário no formato da API de histórico."""

        raise NotImplementedError


class ICoinAdminRepository(ABC):
    """Porta administrativa de configuração de moeda e promoção de recarga.

    Injete esta interface nos casos de uso staff e registre o adaptador no WalletProvider.
    Retornos opcionais usam None quando não há registro; ``save_*`` persistem o modelo ORM
    (incluindo regras de unicidade de ativo no ``save`` do modelo).
    """

    @abstractmethod
    def get_coin_config(self) -> Any | None:
        """Retorna a configuração ativa ou a mais recente; None se inexistente."""

        raise NotImplementedError

    @abstractmethod
    def save_coin_config(self, row: Any) -> Any:
        """Persiste a configuração de moeda e devolve a linha salva."""

        raise NotImplementedError

    @abstractmethod
    def new_coin_config(self, *, name: str = "Adena") -> Any:
        """Instancia uma configuração ainda não persistida."""

        raise NotImplementedError

    @abstractmethod
    def get_promo(self) -> Any | None:
        """Retorna a promoção ativa ou a mais recente; None se inexistente."""

        raise NotImplementedError

    @abstractmethod
    def save_promo(self, row: Any) -> Any:
        """Persiste a promoção de recarga e devolve a linha salva."""

        raise NotImplementedError

    @abstractmethod
    def new_promo(
        self,
        *,
        title: str = "Promoção de recarga",
        percent: Decimal = Decimal("10.00"),
        active: bool = False,
    ) -> Any:
        """Instancia uma promoção ainda não persistida."""

        raise NotImplementedError
