from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any
from uuid import UUID


class ITicketRepository(ABC):
    """Porta de chamados, mensagens, atribuição e notificações de atendimento.

    Injete esta interface nos serviços de aplicação e registre o adaptador no provider. As
    assinaturas abaixo definem entradas e retornos; resultados opcionais usam None para
    ausência. Validação de negócio e autorização devem ocorrer no caso de uso que chama a porta.
    Métodos de escrita podem criar notificações como efeito colateral da operação.
    """

    @abstractmethod
    def list_for_user(self, user_id: UUID) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def summarize_for_user(self, user_id: UUID) -> dict[str, int]:
        raise NotImplementedError

    @abstractmethod
    def create(
        self,
        user_id: UUID,
        *,
        subject: str,
        description: str,
        category: str,
        priority: str,
        context: dict,
    ) -> Any:
        raise NotImplementedError

    @abstractmethod
    def get_for_user(self, ticket_id: UUID, user_id: UUID) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, ticket_id: UUID) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def dump_ticket(self, ticket: Any, *, detail: bool = False, staff: bool = False) -> dict:
        """Serializa chamado (e mensagens quando detail) sem expor relações ORM à application."""

        raise NotImplementedError

    @abstractmethod
    def add_customer_reply(self, ticket_id: UUID, author_id: UUID, body: str) -> Any:
        raise NotImplementedError

    @abstractmethod
    def apply_customer_action(self, ticket_id: UUID, author_id: UUID, action: str) -> Any:
        raise NotImplementedError

    @abstractmethod
    def list_for_staff(
        self,
        *,
        status: str = "",
        category: str = "",
        query: str = "",
        limit: int = 200,
    ) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def summarize_for_staff(self) -> dict[str, int]:
        raise NotImplementedError

    @abstractmethod
    def add_staff_reply(
        self,
        ticket_id: UUID,
        author_id: UUID,
        body: str,
        *,
        is_internal: bool,
    ) -> Any:
        raise NotImplementedError

    @abstractmethod
    def resolve_staff_assignee(self, assignee: Any, actor_id: UUID) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def update_staff_ticket(
        self,
        ticket_id: UUID,
        actor_id: UUID,
        *,
        status: str | None = None,
        update_status: bool = False,
        priority: str | None = None,
        update_priority: bool = False,
        assignee: Any = None,
        update_assignee: bool = False,
    ) -> Any:
        raise NotImplementedError
