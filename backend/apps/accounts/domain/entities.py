from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True, slots=True)
class UserEntity:
    id: UUID
    username: str
    email: str
    display_name: str
    bio: str
    role: str
    is_email_verified: bool
    fichas: int
    avatar_url: str | None
    is_2fa_enabled: bool = False
    is_staff: bool = False
    is_superuser: bool = False
    is_staff_member: bool = False
