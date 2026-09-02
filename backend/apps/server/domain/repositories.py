from __future__ import annotations

from abc import ABC, abstractmethod
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
