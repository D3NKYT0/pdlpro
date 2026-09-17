"""Constantes e DTOs da moderação de personagens no banco do jogo."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

BAN_ACCESS_LEVEL = -100
MAX_JAIL_MINUTES = 60 * 24 * 30
MODERATION_ACTIONS = ("kick", "jail", "unjail", "ban", "unban", "teleport")
JAIL_X = -114356
JAIL_Y = -249645
JAIL_Z = -2984
UNJAIL_TOWN = "giran"


@dataclass(frozen=True, slots=True)
class CharacterJail:
    """Estado de prisão persistido no painel, independente do gameserver em memória."""

    char_id: int
    login: str
    char_name: str
    jailed: bool
    jail_until: datetime | None
    jail_reason: str


@dataclass(frozen=True, slots=True)
class ModerationLogEntry:
    """Registro de uma ação de staff sobre personagem ou conta Lineage."""

    action: str
    actor_username: str
    char_id: int
    char_name: str
    login: str
    reason: str
    was_online: bool
    details: dict = field(default_factory=dict)
    created_at: str = ""
