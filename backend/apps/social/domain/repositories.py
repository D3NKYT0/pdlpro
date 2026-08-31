from __future__ import annotations

from abc import ABC, abstractmethod
from uuid import UUID

from apps.social.domain.entities import PostEntity


class IPostRepository(ABC):
    @abstractmethod
    def list_published(self, *, limit: int = 50) -> list[PostEntity]:
        raise NotImplementedError

    @abstractmethod
    def create(self, *, author_id: UUID, body: str) -> PostEntity:
        raise NotImplementedError
