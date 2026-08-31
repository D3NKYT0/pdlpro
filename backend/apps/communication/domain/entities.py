from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True, slots=True)
class NotificationEntity:
    id: UUID
    title: str
    body: str
    kind: str
    link: str
    is_read: bool
    created_at: str
