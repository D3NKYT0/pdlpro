from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True, slots=True)
class ClanEntity:
    id: UUID
    name: str
    description: str
    recruiting: bool
    owner_id: UUID
    owner_username: str
    motd: str
    focus: str
    min_level: int
    clan_id: int | None


@dataclass(frozen=True, slots=True)
class ClanApplicationEntity:
    id: UUID
    clan_id: UUID
    clan_name: str
    user_id: UUID
    username: str
    char_name: str
    message: str
    status: str
