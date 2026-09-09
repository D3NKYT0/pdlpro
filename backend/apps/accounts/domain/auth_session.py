from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any
from uuid import UUID


class IAuthSessionService(ABC):
    """Porta de montagem da resposta de autenticação com cookies JWT."""

    @abstractmethod
    def build_auth_response(self, request: Any, user_id: UUID) -> Any:
        raise NotImplementedError
