from __future__ import annotations

from abc import ABC, abstractmethod
from uuid import UUID


class IPushSender(ABC):
    @abstractmethod
    def is_configured(self) -> bool:
        raise NotImplementedError

    @abstractmethod
    def public_key(self) -> str:
        raise NotImplementedError

    @abstractmethod
    def send(self, user_id: UUID, *, title: str, body: str, url: str = "") -> int:
        raise NotImplementedError
