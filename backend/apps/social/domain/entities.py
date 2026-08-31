from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True, slots=True)
class PostEntity:
    id: UUID
    author_id: UUID
    author_username: str
    body: str
    created_at: str
