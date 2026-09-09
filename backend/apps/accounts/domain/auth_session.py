from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any
from uuid import UUID


class IAuthSessionService(ABC):
    """Porta que materializa o usuário de sessão para cookies JWT (sem montar HTTP)."""

    @abstractmethod
    def require_user(self, user_id: UUID) -> Any:
        """Devolve o usuário ORM exigido por ``RefreshToken.for_user``."""

        raise NotImplementedError
