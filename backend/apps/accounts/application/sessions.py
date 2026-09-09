"""Casos de uso de rotação, listagem e revogação de JWTs."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID

from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.domain.repositories import ISessionStore, SessionRecord
from common.architecture.base import UseCase


def refresh_jti(raw: str | None) -> str | None:
    """Extrai o ``jti`` de um refresh bruto, ou ``None`` se inválido/ausente."""
    if not raw:
        return None
    try:
        return str(RefreshToken(raw)["jti"])
    except (TokenError, KeyError):
        return None


@dataclass(frozen=True, slots=True)
class RotateRefreshInput:
    """Dados de entrada de ``RotateRefreshUseCase.execute``."""

    raw: str


class RotateRefreshUseCase(UseCase[RotateRefreshInput, Any]):
    """Consome um refresh válido uma vez e emite seu sucessor após validar a senha atual.

    Uso: resolva pelo container e chame ``execute(data)`` com ``RotateRefreshInput``.
    """

    def __init__(self, sessions: ISessionStore) -> None:
        self._sessions = sessions

    def execute(self, data: RotateRefreshInput) -> Any:
        return self._sessions.rotate_refresh(data.raw)


@dataclass(frozen=True, slots=True)
class RevokeRefreshInput:
    """Dados de entrada de ``RevokeRefreshUseCase.execute``."""

    raw: str | None
    user_id: UUID


class RevokeRefreshUseCase(UseCase[RevokeRefreshInput, None]):
    """Revoga somente o refresh do usuário autenticado, sem aceitar tokens de terceiros.

    Uso: resolva pelo container e chame ``execute(data)`` com ``RevokeRefreshInput``.
    """

    def __init__(self, sessions: ISessionStore) -> None:
        self._sessions = sessions

    def execute(self, data: RevokeRefreshInput) -> None:
        self._sessions.revoke_refresh(data.raw or "", data.user_id)


@dataclass(frozen=True, slots=True)
class ListSessionsInput:
    """Dados de entrada de ``ListSessionsUseCase.execute``."""

    user_id: UUID
    current_jti: str | None = None


class ListSessionsUseCase(UseCase[ListSessionsInput, list[SessionRecord]]):
    """Lista refresh tokens ativos do usuário, marcando a sessão corrente quando conhecida.

    Uso: resolva pelo container e chame ``execute(data)`` com ``ListSessionsInput``.
    """

    def __init__(self, sessions: ISessionStore) -> None:
        self._sessions = sessions

    def execute(self, data: ListSessionsInput) -> list[SessionRecord]:
        return self._sessions.list_sessions(data.user_id, current_jti=data.current_jti)


@dataclass(frozen=True, slots=True)
class RevokeSessionInput:
    """Dados de entrada de ``RevokeSessionUseCase.execute``."""

    user_id: UUID
    jti: str
    current_jti: str | None = None


class RevokeSessionUseCase(UseCase[RevokeSessionInput, bool]):
    """Revoga uma sessão ativa do usuário. Retorna se a sessão corrente foi encerrada.

    Uso: resolva pelo container e chame ``execute(data)`` com ``RevokeSessionInput``.
    """

    def __init__(self, sessions: ISessionStore) -> None:
        self._sessions = sessions

    def execute(self, data: RevokeSessionInput) -> bool:
        return self._sessions.revoke_session(data.user_id, data.jti, current_jti=data.current_jti)


@dataclass(frozen=True, slots=True)
class RevokeOtherSessionsInput:
    """Dados de entrada de ``RevokeOtherSessionsUseCase.execute``."""

    user_id: UUID
    current_jti: str | None


class RevokeOtherSessionsUseCase(UseCase[RevokeOtherSessionsInput, int]):
    """Revoga todas as sessões ativas exceto a corrente. Exige ``current_jti`` conhecido.

    Uso: resolva pelo container e chame ``execute(data)`` com ``RevokeOtherSessionsInput``.
    """

    def __init__(self, sessions: ISessionStore) -> None:
        self._sessions = sessions

    def execute(self, data: RevokeOtherSessionsInput) -> int:
        return self._sessions.revoke_other_sessions(data.user_id, current_jti=data.current_jti or "")
