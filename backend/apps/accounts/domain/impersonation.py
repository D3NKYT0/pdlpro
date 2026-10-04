"""Porta para listagem administrativa e persistência de acessos como usuário."""

from abc import ABC, abstractmethod
from typing import Any
from uuid import UUID


class IImpersonationStore(ABC):
    """Persiste o vínculo entre administrador e usuário e encerra sessões uma única vez."""

    @abstractmethod
    def list_users(self, search: str, page: int) -> dict[str, Any]: ...

    @abstractmethod
    def start(self, actor_id: UUID, target_id: UUID, original_jti: str) -> str: ...

    @abstractmethod
    def status(self, session_id: str) -> dict[str, str]: ...

    @abstractmethod
    def finish(self, session_id: str) -> UUID: ...
