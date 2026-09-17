from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from math import ceil
from uuid import UUID

from django.utils import timezone

from apps.accounts.domain.repositories import IUserRepository
from apps.server.domain.exceptions import (
    CharacterServiceUnavailableError,
    GameAccountNotFoundError,
)
from apps.server.domain.gateways import ILineageGateway, ModerationCharacter
from apps.server.domain.moderation import (
    BAN_ACCESS_LEVEL,
    JAIL_X,
    JAIL_Y,
    JAIL_Z,
    MAX_JAIL_MINUTES,
    MODERATION_ACTIONS,
    UNJAIL_TOWN,
    CharacterJail,
    ModerationLogEntry,
)
from apps.server.domain.repositories import IModerationStateRepository
from apps.server.domain.towns import get_town, town_catalog
from common.architecture.base import UseCase
from common.architecture.exceptions import ValidationDomainError


@dataclass(frozen=True, slots=True)
class SearchModerationInput:
    """Filtros da listagem administrativa de personagens."""

    query: str = ""
    status: str = "all"
    page: int = 1
    page_size: int = 20


@dataclass(frozen=True, slots=True)
class ModerationActionInput:
    """Pedido de kick, prisão, banimento ou teleporte sobre um personagem."""

    actor_id: UUID
    actor_username: str
    action: str
    char_id: int
    reason: str = ""
    minutes: int = 0
    town: str = ""


class SearchModerationCharactersUseCase(UseCase[SearchModerationInput, dict]):
    """Lista personagens do jogo para a equipe, com prisão e vínculo do painel.

    Uso: resolva pelo container e chame ``execute`` com ``SearchModerationInput``. Sem o
    catálogo SQL de moderação, devolve ``available=False``.
    """

    def __init__(
        self,
        lineage: ILineageGateway,
        state: IModerationStateRepository,
        users: IUserRepository,
    ) -> None:
        self._lineage = lineage
        self._state = state
        self._users = users

    def execute(self, data: SearchModerationInput) -> dict:
        if not self._lineage.supports("MODERATION"):
            return _unavailable_list()
        page = max(1, data.page)
        page_size = min(50, max(1, data.page_size))
        status = (data.status or "all").strip().lower()
        if status not in {"all", "online", "offline", "banned", "jailed"}:
            raise ValidationDomainError("Filtro de status inválido.")
        if status == "jailed":
            count = self._state.count_active_jails()
            pages = max(1, ceil(count / page_size) if count else 1)
            offset = (page - 1) * page_size
            jails = self._state.list_active_jails(offset=offset, limit=page_size)
            results = []
            for jail in jails:
                char = self._lineage.get_moderation_character(jail.char_id)
                if char is None:
                    continue
                results.append(_character_payload(char, jail, _panel_username(self._users, char.linked_user_id)))
            return {
                "available": True,
                "results": results,
                "count": count,
                "page": page,
                "pages": pages,
                "towns": town_catalog(),
            }
        like = _like_pattern(data.query)
        online_filter, banned_filter = _status_filters(status)
        count = self._lineage.count_moderation_characters(
            like=like, online_filter=online_filter, banned_filter=banned_filter
        )
        pages = max(1, ceil(count / page_size) if count else 1)
        offset = (page - 1) * page_size
        chars = self._lineage.search_moderation_characters(
            like=like,
            online_filter=online_filter,
            banned_filter=banned_filter,
            limit=page_size,
            offset=offset,
        )
        results = [
            _character_payload(
                char,
                self._state.get_jail(char.char_id),
                _panel_username(self._users, char.linked_user_id),
            )
            for char in chars
        ]
        return {
            "available": True,
            "results": results,
            "count": count,
            "page": page,
            "pages": pages,
            "towns": town_catalog(),
        }


class GetModerationCharacterUseCase(UseCase[int, dict]):
    """Consulta a ficha administrativa de um personagem, com histórico recente."""

    def __init__(
        self,
        lineage: ILineageGateway,
        state: IModerationStateRepository,
        users: IUserRepository,
    ) -> None:
        self._lineage = lineage
        self._state = state
        self._users = users

    def execute(self, data: int) -> dict:
        if not self._lineage.supports("MODERATION"):
            raise CharacterServiceUnavailableError()
        char = self._lineage.get_moderation_character(int(data))
        if char is None:
            raise GameAccountNotFoundError("Personagem não encontrado.")
        logs = [_log_payload(entry) for entry in self._state.list_logs(char.char_id)]
        payload = _character_payload(
            char,
            self._state.get_jail(char.char_id),
            _panel_username(self._users, char.linked_user_id),
        )
        payload["logs"] = logs
        payload["towns"] = town_catalog()
        return payload


class ApplyModerationActionUseCase(UseCase[ModerationActionInput, dict]):
    """Aplica kick, prisão, banimento ou teleporte e grava o histórico no painel.

    Escritas no banco do jogo não entram no UnitOfWork do Django. Personagem online só
    reflete posição e flag offline no próximo login; banimento impede o relogin.
    """

    def __init__(
        self,
        lineage: ILineageGateway,
        state: IModerationStateRepository,
        users: IUserRepository,
    ) -> None:
        self._lineage = lineage
        self._state = state
        self._users = users

    def execute(self, data: ModerationActionInput) -> dict:
        if not self._lineage.supports("MODERATION"):
            raise CharacterServiceUnavailableError()
        action = (data.action or "").strip().lower()
        if action not in MODERATION_ACTIONS:
            raise ValidationDomainError("Ação de moderação inválida.")
        char = self._lineage.get_moderation_character(int(data.char_id))
        if char is None:
            raise GameAccountNotFoundError("Personagem não encontrado.")
        was_online = bool(char.online)
        reason = _optional_reason(data.reason)
        details: dict = {}
        if action == "kick":
            self._lineage.kick_character(char.login, char.char_id)
        elif action == "jail":
            reason = _require_reason(data.reason)
            minutes = max(0, min(int(data.minutes or 0), MAX_JAIL_MINUTES))
            until = None if minutes == 0 else timezone.now() + timedelta(minutes=minutes)
            self._lineage.move_character(char.login, char.char_id, JAIL_X, JAIL_Y, JAIL_Z)
            self._lineage.kick_character(char.login, char.char_id)
            self._state.set_jail(
                char_id=char.char_id,
                login=char.login,
                char_name=char.name,
                jail_until=until,
                jail_reason=reason,
            )
            details = {"minutes": minutes, "x": JAIL_X, "y": JAIL_Y, "z": JAIL_Z}
        elif action == "unjail":
            if self._state.get_jail(char.char_id) is None:
                raise ValidationDomainError("Este personagem não está na prisão.")
            town = get_town(UNJAIL_TOWN)
            self._lineage.move_character(char.login, char.char_id, town.x, town.y, town.z)
            self._state.clear_jail(char.char_id)
            details = {"town": UNJAIL_TOWN}
        elif action == "ban":
            reason = _require_reason(data.reason)
            self._lineage.set_account_access_level(char.login, BAN_ACCESS_LEVEL)
            self._lineage.kick_character(char.login, char.char_id)
            details = {"access_level": BAN_ACCESS_LEVEL}
        elif action == "unban":
            if char.account_access >= 0:
                raise ValidationDomainError("Esta conta não está banida.")
            self._lineage.set_account_access_level(char.login, 0)
            details = {"access_level": 0}
        else:
            town = get_town(data.town)
            self._lineage.move_character(char.login, char.char_id, town.x, town.y, town.z)
            details = {"town": town.code, "x": town.x, "y": town.y, "z": town.z}
        self._state.add_log(
            actor_id=data.actor_id,
            actor_username=data.actor_username,
            action=action,
            char_id=char.char_id,
            char_name=char.name,
            login=char.login,
            reason=reason,
            was_online=was_online,
            details=details,
        )
        updated = self._lineage.get_moderation_character(char.char_id) or char
        payload = _character_payload(
            updated,
            self._state.get_jail(char.char_id),
            _panel_username(self._users, updated.linked_user_id),
        )
        payload["logs"] = [_log_payload(entry) for entry in self._state.list_logs(char.char_id)]
        payload["towns"] = town_catalog()
        return {
            "action": action,
            "was_online": was_online,
            "takes_effect": "next_login" if was_online else "applied",
            "character": payload,
        }


def _like_pattern(query: str) -> str:
    cleaned = "".join(ch for ch in (query or "").strip()[:45] if ch not in "%_")
    return f"%{cleaned}%" if cleaned else "%"


def _status_filters(status: str) -> tuple[int, int]:
    if status == "online":
        return 1, -1
    if status == "offline":
        return 0, -1
    if status == "banned":
        return -1, 1
    return -1, -1


def _require_reason(reason: str) -> str:
    value = (reason or "").strip()
    if len(value) < 3:
        raise ValidationDomainError("Informe o motivo (mínimo 3 caracteres).")
    if len(value) > 255:
        raise ValidationDomainError("O motivo deve ter no máximo 255 caracteres.")
    return value


def _optional_reason(reason: str) -> str:
    value = (reason or "").strip()
    if len(value) > 255:
        raise ValidationDomainError("O motivo deve ter no máximo 255 caracteres.")
    return value


def _unavailable_list() -> dict:
    return {
        "available": False,
        "results": [],
        "count": 0,
        "page": 1,
        "pages": 1,
        "towns": town_catalog(),
    }


def _character_payload(
    char: ModerationCharacter,
    jail: CharacterJail | None,
    panel_username: str | None,
) -> dict:
    jailed = bool(jail and jail.jailed)
    return {
        "char_id": char.char_id,
        "name": char.name,
        "login": char.login,
        "email": char.email,
        "level": char.level,
        "online": char.online,
        "sex": char.sex,
        "class_id": char.class_id,
        "title": char.title,
        "clan_name": char.clan_name,
        "pvp": char.pvp,
        "pk": char.pk,
        "karma": char.karma,
        "online_time": char.online_time,
        "last_access": char.last_access,
        "account_access": char.account_access,
        "char_access": char.char_access,
        "x": char.x,
        "y": char.y,
        "z": char.z,
        "linked_user_id": char.linked_user_id,
        "panel_username": panel_username,
        "banned": char.account_access < 0,
        "jailed": jailed,
        "jail_until": jail.jail_until.isoformat() if jailed and jail and jail.jail_until else None,
        "jail_reason": jail.jail_reason if jailed and jail else "",
    }


def _log_payload(entry: ModerationLogEntry) -> dict:
    return {
        "action": entry.action,
        "actor_username": entry.actor_username,
        "char_id": entry.char_id,
        "char_name": entry.char_name,
        "login": entry.login,
        "reason": entry.reason,
        "was_online": entry.was_online,
        "details": entry.details,
        "created_at": entry.created_at,
    }


def _panel_username(users: IUserRepository, linked_user_id: str | None) -> str | None:
    if not linked_user_id:
        return None
    compact = str(linked_user_id).replace("-", "").strip()
    if len(compact) != 32:
        return None
    try:
        uid = UUID(compact)
    except ValueError:
        return None
    user = users.get_by_id(uid)
    return user.username if user else None
