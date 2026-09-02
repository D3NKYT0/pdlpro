from __future__ import annotations

import socket

from django.conf import settings

from apps.server.domain.access import same_linked_user
from apps.server.domain.character_rules import require_offline_character
from apps.server.domain.exceptions import (
    AccountAlreadyLinkedError,
    GameAccountAlreadyExistsError,
    GameAccountNotFoundError,
    NicknameTakenError,
)
from apps.server.domain.gateways import (
    GameAccount,
    GameCharacter,
    GameItem,
    ILineageGateway,
    RankingEntry,
    ServerStatus,
)
from apps.server.infrastructure.passwords import LineagePasswordHasher


class SocketStatusProbe:
    """Testa a abertura de uma conexão TCP com host, porta e timeout em segundos.

    Retorna False para OSError. Uma conexão aceita indica disponibilidade da porta, sem validar
    o protocolo do jogo nem contar jogadores conectados.
    """

    def is_open(self, host: str, port: int, timeout: float) -> bool:
        try:
            with socket.create_connection((host, port), timeout=timeout):
                return True
        except OSError:
            return False


class NullLineageGateway(ILineageGateway):
    """Implementação em memória de ILineageGateway para desenvolvimento e testes.

    ServerProvider a seleciona quando LINEAGE_DB_ENABLED está desabilitado. Contas, personagens
    e itens vivem somente nesta instância; ``seed_character`` prepara cenários de teste.
    Rankings e consultas nomeadas retornam listas vazias, enquanto o status ainda testa portas
    TCP. Operações opcionais, como câmbio durável e observação de itens, permanecem
    indisponíveis.
    """

    def __init__(
        self,
        probe: SocketStatusProbe | None = None,
        hasher: LineagePasswordHasher | None = None,
    ) -> None:
        self._probe = probe or SocketStatusProbe()
        self._hasher = hasher or LineagePasswordHasher()
        self._accounts: dict[str, dict] = {}
        self._characters: dict[str, list[GameCharacter]] = {}
        self._items: dict[int, list[GameItem]] = {}
        self._next_char_id = 1

    def get_status(self) -> ServerStatus:
        timeout = float(getattr(settings, "SERVER_STATUS_TIMEOUT", 2))
        host = getattr(settings, "GAME_SERVER_IP", "127.0.0.1")
        game_online = self._probe.is_open(host, int(getattr(settings, "GAME_SERVER_PORT", 7777)), timeout)
        login_online = self._probe.is_open(host, int(getattr(settings, "LOGIN_SERVER_PORT", 2106)), timeout)
        fake = int(getattr(settings, "FAKE_PLAYERS_MIN", 0))
        return ServerStatus(game_online=game_online, login_online=login_online, players_online=fake)

    def get_top_pvp(self, limit: int = 10) -> list[RankingEntry]:
        return []

    def get_top_pk(self, limit: int = 10) -> list[RankingEntry]:
        return []

    def get_top_level(self, limit: int = 10) -> list[RankingEntry]:
        return []

    def get_top_online(self, limit: int = 10) -> list[RankingEntry]:
        return []

    def get_top_clans(self, limit: int = 10) -> list[RankingEntry]:
        return []

    def get_top_adena(self, limit: int = 10) -> list[RankingEntry]:
        return []

    def get_account(self, login: str) -> GameAccount | None:
        row = self._accounts.get(login.lower())
        if not row:
            return None
        return GameAccount(login=row["login"], email=row["email"], linked_user_id=row["linked_user_id"])

    def find_accounts_by_email(self, email: str) -> list[GameAccount]:
        target = email.strip().lower()
        return [
            GameAccount(login=row["login"], email=row["email"], linked_user_id=row["linked_user_id"])
            for row in self._accounts.values()
            if (row["email"] or "").lower() == target
        ]

    def get_account_by_login_and_email(self, login: str, email: str) -> GameAccount | None:
        account = self.get_account(login)
        if account is None or account.email.lower() != email.strip().lower():
            return None
        return account

    def register_account(self, login: str, password: str, email: str) -> GameAccount:
        key = login.lower()
        if key in self._accounts:
            raise GameAccountAlreadyExistsError()
        self._accounts[key] = {
            "login": login,
            "email": email,
            "password": self._hasher.hash(password),
            "linked_user_id": None,
        }
        self._characters.setdefault(key, [])
        return self.get_account(login)

    def validate_credentials(self, login: str, password: str) -> bool:
        row = self._accounts.get(login.lower())
        return bool(row and self._hasher.verify(password, row["password"]))

    def link_account(self, login: str, user_id: str) -> GameAccount:
        row = self._require_account(login)
        if row["linked_user_id"] and not same_linked_user(row["linked_user_id"], user_id):
            raise AccountAlreadyLinkedError()
        row["linked_user_id"] = user_id
        return self.get_account(login)

    def unlink_account(self, login: str, user_id: str) -> None:
        row = self._require_account(login)
        if not same_linked_user(row["linked_user_id"], user_id):
            raise GameAccountNotFoundError()
        row["linked_user_id"] = None

    def clear_account_link(self, login: str) -> GameAccount:
        row = self._require_account(login)
        row["linked_user_id"] = None
        return self.get_account(login)

    def update_account_password(self, login: str, password: str) -> None:
        row = self._require_account(login)
        row["password"] = self._hasher.hash(password)

    def list_characters(self, login: str) -> list[GameCharacter]:
        return list(self._characters.get(login.lower(), []))

    def get_character(self, login: str, char_id: int) -> GameCharacter | None:
        for char in self.list_characters(login):
            if char.char_id == char_id:
                return char
        return None

    def list_character_items(self, char_id: int) -> list[GameItem]:
        return [item for item in self._items.get(char_id, []) if item.slot is None]

    def list_character_equipment(self, char_id: int) -> list[GameItem]:
        return [item for item in self._items.get(char_id, []) if item.slot is not None]

    def withdraw_item(self, char_id: int, item_id: int, quantity: int) -> GameItem:
        items = self._items.setdefault(char_id, [])
        for index, item in enumerate(items):
            if item.slot is None and item.item_id == item_id and item.quantity >= quantity:
                remaining = item.quantity - quantity
                withdrawn = GameItem(item.item_id, item.name, quantity, item.enchant)
                if remaining:
                    items[index] = GameItem(item.item_id, item.name, remaining, item.enchant)
                else:
                    items.pop(index)
                return withdrawn
        from common.architecture.exceptions import ValidationDomainError

        raise ValidationDomainError("Quantidade insuficiente no personagem.")

    def deposit_item(self, char_name: str, item_id: int, quantity: int, enchant: int) -> None:
        char = self._find_char_by_name(char_name)
        items = self._items.setdefault(char.char_id, [])
        for index, item in enumerate(items):
            if item.item_id == item_id and item.enchant == enchant:
                items[index] = GameItem(item.item_id, item.name, item.quantity + quantity, item.enchant)
                return
        items.append(GameItem(item_id, f"Item {item_id}", quantity, enchant))

    def nickname_exists(self, name: str) -> bool:
        lowered = name.lower()
        return any(char.name.lower() == lowered for chars in self._characters.values() for char in chars)

    def change_nickname(self, login: str, char_id: int, name: str) -> None:
        char = self._require_offline(login, char_id)
        if self.nickname_exists(name):
            raise NicknameTakenError()
        self._replace_character(
            login,
            char_id,
            GameCharacter(
                char.char_id,
                name,
                char.level,
                False,
                char.sex,
                char.pvp,
                char.pk,
                char.class_id,
                char.title,
                char.clan_name,
                char.is_clan_leader,
            ),
        )

    def change_sex(self, login: str, char_id: int, sex: int) -> None:
        char = self._require_offline(login, char_id)
        self._replace_character(
            login,
            char_id,
            GameCharacter(
                char.char_id,
                char.name,
                char.level,
                False,
                sex,
                char.pvp,
                char.pk,
                char.class_id,
                char.title,
                char.clan_name,
                char.is_clan_leader,
            ),
        )

    def unstuck(self, login: str, char_id: int) -> None:
        self._require_offline(login, char_id)

    def count_characters(self, login: str) -> int:
        return len(self.list_characters(login))

    def verify_character_ownership(self, char_id: int, account: str) -> bool:
        return self.get_character(account, char_id) is not None

    def transfer_character(self, char_id: int, new_account: str) -> None:
        origin_login = None
        moved: GameCharacter | None = None
        for login, chars in self._characters.items():
            for char in chars:
                if char.char_id == char_id:
                    origin_login = login
                    moved = char
                    break
            if moved is not None:
                break
        if origin_login is None or moved is None:
            raise GameAccountNotFoundError("Personagem não encontrado.")
        self._characters[origin_login] = [char for char in self._characters[origin_login] if char.char_id != char_id]
        key = new_account.lower()
        self._accounts.setdefault(
            key,
            {"login": new_account, "email": "", "password": "", "linked_user_id": None},
        )
        self._characters.setdefault(key, []).append(moved)

    def query(self, name: str, params: dict | None = None) -> list[dict]:
        return []

    def seed_character(self, login: str, name: str, *, items: list[GameItem] | None = None) -> GameCharacter:
        """Apenas testes/dev: cria um personagem no gateway em memória."""
        key = login.lower()
        self._accounts.setdefault(
            key,
            {"login": login, "email": "", "password": "", "linked_user_id": None},
        )
        char = GameCharacter(self._next_char_id, name, 1, False, 0)
        self._next_char_id += 1
        self._characters.setdefault(key, []).append(char)
        self._items[char.char_id] = list(items or [])
        return char

    def _require_account(self, login: str) -> dict:
        row = self._accounts.get(login.lower())
        if not row:
            raise GameAccountNotFoundError()
        return row

    def _require_offline(self, login: str, char_id: int) -> GameCharacter:
        return require_offline_character(self.get_character(login, char_id))

    def _replace_character(self, login: str, char_id: int, updated: GameCharacter) -> None:
        chars = self._characters[login.lower()]
        self._characters[login.lower()] = [updated if item.char_id == char_id else item for item in chars]

    def _find_char_by_name(self, name: str) -> GameCharacter:
        for chars in self._characters.values():
            for char in chars:
                if char.name.lower() == name.lower():
                    return char
        raise GameAccountNotFoundError("Personagem não encontrado.")
