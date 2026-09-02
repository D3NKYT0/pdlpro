from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True, slots=True)
class AccessibleAccount:
    """Conta disponível ao usuário segundo a política de vínculos do painel.

    É um objeto de dados; não carrega métodos de persistência do ORM. Consulte os campos tipados
    abaixo ao montar ou consumir o resultado.
    """

    login: str
    is_primary: bool
    linked: bool


@dataclass(frozen=True, slots=True)
class PrimaryLoginState:
    """Resultado da inspeção do login preferido para orientar criação ou vínculo da conta
    principal.

    É um objeto de dados; não carrega métodos de persistência do ORM. Consulte os campos tipados
    abaixo ao montar ou consumir o resultado.
    """

    login: str
    status: str


def same_linked_user(linked_user_id: str | None, user_id: UUID | str) -> bool:
    if not linked_user_id:
        return False
    linked = str(linked_user_id).replace("-", "").strip().lower()
    return linked == str(user_id).replace("-", "").lower()


class IAccountAccessService(ABC):
    """Porta de consulta de contas acessíveis e capacidade de novos vínculos.

    Use user_id do painel e username para avaliar a conta principal e as secundárias. Antes de
    operar um login informado pelo cliente, consulte ``can_access``; a listagem de contas na UI
    não substitui essa verificação.
    """

    @abstractmethod
    def can_access(self, user_id: UUID, username: str, login: str) -> bool:
        raise NotImplementedError

    @abstractmethod
    def list_accounts(self, user_id: UUID, username: str) -> list[AccessibleAccount]:
        raise NotImplementedError

    @abstractmethod
    def can_link_more(self, user_id: UUID, username: str) -> bool:
        raise NotImplementedError

    @abstractmethod
    def slot_usage(self, user_id: UUID, username: str) -> tuple[int, int]:
        """Retorna (usados, total)."""
        raise NotImplementedError
