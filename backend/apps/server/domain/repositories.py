from __future__ import annotations

from abc import ABC, abstractmethod
from decimal import Decimal
from typing import Any
from uuid import UUID


class IServicePriceRepository(ABC):
    """Porta de preços e disponibilidade dos serviços de personagem.

    Injete esta interface nos serviços de aplicação e registre o adaptador no provider. As
    assinaturas abaixo definem entradas e retornos; resultados opcionais usam None para
    ausência. Validação de negócio e autorização devem ocorrer no caso de uso que chama a porta.
    """

    @abstractmethod
    def get_price(self, code: str):
        raise NotImplementedError

    @abstractmethod
    def list_all(self) -> list[Any]:
        """Lista todos os preços cadastrados, inclusive inativos."""

        raise NotImplementedError

    @abstractmethod
    def upsert(
        self,
        *,
        code: str,
        name: str,
        price: Decimal,
        active: bool,
    ) -> Any:
        """Cria ou atualiza o preço pelo código e devolve a linha persistida."""

        raise NotImplementedError


class ILinkSlotRepository(ABC):
    """Porta de limites adicionais para vincular contas Lineage.

    Injete esta interface nos serviços de aplicação e registre o adaptador no provider. As
    assinaturas abaixo definem entradas e retornos; resultados opcionais usam None para
    ausência. Validação de negócio e autorização devem ocorrer no caso de uso que chama a porta.
    """

    @abstractmethod
    def extra_slots(self, user_id: UUID) -> int:
        raise NotImplementedError

    @abstractmethod
    def add_slots(self, user_id: UUID, quantity: int) -> int:
        raise NotImplementedError


class IIndexConfigRepository(ABC):
    """Porta da configuração ativa do painel (IndexConfig).

    Injete nos casos de uso de painel/staff e registre o adaptador no ServerProvider.
    """

    @abstractmethod
    def get_active(self) -> Any | None:
        """Retorna a configuração ativa mais recente, ou None."""

        raise NotImplementedError

    @abstractmethod
    def new(self) -> Any:
        """Instancia uma configuração ainda não persistida."""

        raise NotImplementedError

    @abstractmethod
    def save(self, row: Any) -> Any:
        """Persiste a configuração do painel e devolve a linha salva."""

        raise NotImplementedError
