from __future__ import annotations

import re
import time

from django.conf import settings
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from apps.server.domain.access import same_linked_user
from apps.server.domain.exceptions import (
    AccountAlreadyLinkedError,
    CharacterOfflineRequiredError,
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
from apps.server.infrastructure.lineage.catalog import LineageQueryCatalog
from apps.server.infrastructure.lineage.item_catalog import item_display_name
from apps.server.infrastructure.null_gateway import SocketStatusProbe
from apps.server.infrastructure.passwords import LineagePasswordHasher

BIND_RE = re.compile(r"(?<!:):([a-zA-Z_][a-zA-Z0-9_]*)")
UNSTUCK = (83400, 147940, -3404)


class SqlAlchemyLineageGateway(ILineageGateway):
    """Executa as queries do catálogo. O SQL mora nos .sql do dialeto, não aqui."""

    def __init__(
        self,
        queries: LineageQueryCatalog,
        probe: SocketStatusProbe | None = None,
        hasher: LineagePasswordHasher | None = None,
    ) -> None:
        self._sql = queries
        self._probe = probe or SocketStatusProbe()
        self._hasher = hasher or LineagePasswordHasher()
        self._engine: Engine | None = None

    def _engine_or_create(self) -> Engine:
        if self._engine is None:
            user = settings.LINEAGE_DB_USER
            password = settings.LINEAGE_DB_PASSWORD
            host = settings.LINEAGE_DB_HOST
            port = settings.LINEAGE_DB_PORT
            name = settings.LINEAGE_DB_NAME
            url = f"mysql+pymysql://{user}:{password}@{host}:{port}/{name}?charset=utf8mb4"
            self._engine = create_engine(
                url,
                pool_size=settings.LINEAGE_DB_POOL_SIZE,
                max_overflow=settings.LINEAGE_DB_MAX_OVERFLOW,
                pool_pre_ping=True,
            )
        return self._engine

    def _bind(self, sql: str, params: dict | None) -> dict:
        needed = set(BIND_RE.findall(sql))
        source = params or {}
        return {key: source[key] for key in needed if key in source}

    def _fetch(self, name: str, params: dict | None = None) -> list[dict]:
        sql = self._sql[name]
        with self._engine_or_create().connect() as connection:
            result = connection.execute(text(sql), self._bind(sql, params))
            return [dict(row._mapping) for row in result]

    def _execute(self, name: str, params: dict | None = None) -> None:
        sql = self._sql[name]
        with self._engine_or_create().begin() as connection:
            connection.execute(text(sql), self._bind(sql, params))

    def _ranking(self, name: str, limit: int) -> list[RankingEntry]:
        rows = self._fetch(name, {"limit": limit})
        entries: list[RankingEntry] = []
        for index, row in enumerate(rows):
            extra = {
                key: value
                for key, value in row.items()
                if key not in ("name", "value") and isinstance(value, (str, int, float, bool, type(None)))
            }
            entries.append(RankingEntry(index + 1, row["name"], int(row["value"] or 0), extra))
        return entries

    def _character(self, row: dict) -> GameCharacter:
        return GameCharacter(
            char_id=int(row["char_id"]),
            name=row["name"],
            level=int(row["level"] or 0),
            online=bool(row["online"]),
            sex=int(row["sex"] or 0),
            pvp=int(row.get("pvp") or 0),
            pk=int(row.get("pk") or 0),
            class_id=int(row.get("class_id") or 0),
            title=str(row.get("title") or "").strip(),
            clan_name=str(row.get("clan_name") or "").strip(),
            is_clan_leader=bool(int(row.get("is_clan_leader") or 0)),
        )

    def get_status(self) -> ServerStatus:
        timeout = float(settings.SERVER_STATUS_TIMEOUT)
        host = settings.GAME_SERVER_IP
        game_online = self._probe.is_open(host, int(settings.GAME_SERVER_PORT), timeout)
        login_online = self._probe.is_open(host, int(settings.LOGIN_SERVER_PORT), timeout)
        players = 0
        try:
            rows = self._fetch("players_online")
            players = int(rows[0]["total"]) if rows else 0
        except Exception:
            players = 0
        factor = float(settings.FAKE_PLAYERS_FACTOR or 1)
        players = max(int(settings.FAKE_PLAYERS_MIN), int(players * factor))
        if settings.FAKE_PLAYERS_MAX:
            players = min(players, int(settings.FAKE_PLAYERS_MAX))
        return ServerStatus(game_online=game_online, login_online=login_online, players_online=players)

    def get_top_pvp(self, limit: int = 10) -> list[RankingEntry]:
        return self._ranking("top_pvp", limit)

    def get_top_pk(self, limit: int = 10) -> list[RankingEntry]:
        return self._ranking("top_pk", limit)

    def get_top_level(self, limit: int = 10) -> list[RankingEntry]:
        return self._ranking("top_level", limit)

    def get_top_online(self, limit: int = 10) -> list[RankingEntry]:
        return self._ranking("top_online", limit)

    def get_top_clans(self, limit: int = 10) -> list[RankingEntry]:
        return self._ranking("top_clans", limit)

    def get_top_adena(self, limit: int = 10) -> list[RankingEntry]:
        return self._ranking("top_adena", limit)

    def _account_from_row(self, row: dict) -> GameAccount:
        linked = str(row["linked_uuid"]).strip() if row.get("linked_uuid") else None
        return GameAccount(login=row["login"], email=row.get("email") or "", linked_user_id=linked or None)

    def get_account(self, login: str) -> GameAccount | None:
        rows = self._fetch("get_account", {"login": login})
        return self._account_from_row(rows[0]) if rows else None

    def find_accounts_by_email(self, email: str) -> list[GameAccount]:
        return [self._account_from_row(row) for row in self._fetch("find_accounts_by_email", {"email": email})]

    def get_account_by_login_and_email(self, login: str, email: str) -> GameAccount | None:
        rows = self._fetch("get_account_by_login_and_email", {"login": login, "email": email})
        return self._account_from_row(rows[0]) if rows else None

    def register_account(self, login: str, password: str, email: str) -> GameAccount:
        if self.get_account(login):
            raise GameAccountAlreadyExistsError()
        self._execute(
            "register_account",
            {
                "login": login,
                "password": self._hasher.hash(password),
                "email": email,
                "created_time": int(time.time()),
            },
        )
        account = self.get_account(login)
        if account is None:
            raise GameAccountNotFoundError()
        return account

    def validate_credentials(self, login: str, password: str) -> bool:
        rows = self._fetch("get_account_password", {"login": login})
        if not rows:
            return False
        return self._hasher.verify(password, rows[0]["password"])

    def link_account(self, login: str, user_id: str) -> GameAccount:
        account = self.get_account(login)
        if account is None:
            raise GameAccountNotFoundError()
        if account.linked_user_id and not same_linked_user(account.linked_user_id, user_id):
            raise AccountAlreadyLinkedError()
        self._execute("link_account", {"uuid": user_id, "login": login})
        updated = self.get_account(login)
        if updated is None:
            raise GameAccountNotFoundError()
        return updated

    def unlink_account(self, login: str, user_id: str) -> None:
        account = self.get_account(login)
        if account is None or not same_linked_user(account.linked_user_id, user_id):
            raise GameAccountNotFoundError()
        self._execute("unlink_account", {"login": login})

    def clear_account_link(self, login: str) -> GameAccount:
        account = self.get_account(login)
        if account is None:
            raise GameAccountNotFoundError()
        if account.linked_user_id:
            self._execute("unlink_account", {"login": login})
        updated = self.get_account(login)
        if updated is None:
            raise GameAccountNotFoundError()
        return updated

    def update_account_password(self, login: str, password: str) -> None:
        if self.get_account(login) is None:
            raise GameAccountNotFoundError()
        self._execute("update_account_password", {"password": self._hasher.hash(password), "login": login})

    def list_characters(self, login: str) -> list[GameCharacter]:
        return [self._character(row) for row in self._fetch("list_characters", {"login": login})]

    def get_character(self, login: str, char_id: int) -> GameCharacter | None:
        rows = self._fetch("get_character", {"login": login, "char_id": char_id})
        return self._character(rows[0]) if rows else None

    def _game_item(self, row, slot: int | None = None) -> GameItem:
        item_id = int(row["item_id"])
        return GameItem(
            item_id=item_id,
            name=item_display_name(item_id),
            quantity=int(row["quantity"] or 1),
            enchant=int(row["enchant"] or 0),
            slot=slot,
        )

    def list_character_items(self, char_id: int) -> list[GameItem]:
        rows = self._fetch("list_character_items", {"char_id": char_id})
        return [self._game_item(row) for row in rows]

    def list_character_equipment(self, char_id: int) -> list[GameItem]:
        if not self._sql.has("list_character_equipment"):
            return []
        rows = self._fetch("list_character_equipment", {"char_id": char_id})
        return [self._game_item(row, slot=int(row["slot"])) for row in rows]

    def withdraw_item(self, char_id: int, item_id: int, quantity: int) -> GameItem:
        items = [item for item in self.list_character_items(char_id) if item.item_id == item_id]
        total = sum(item.quantity for item in items)
        if total < quantity:
            from common.architecture.exceptions import ValidationDomainError

            raise ValidationDomainError("Quantidade insuficiente no personagem.")
        remaining = quantity
        withdrawn_enchant = items[0].enchant if items else 0
        for item in items:
            take = min(remaining, item.quantity)
            params = {"char_id": char_id, "item_id": item_id, "enchant": item.enchant, "qty": take}
            if item.quantity - take <= 0:
                self._execute("delete_item_stack", params)
            else:
                self._execute("update_item_amount", params)
            remaining -= take
            if remaining <= 0:
                return GameItem(item.item_id, item.name, quantity, item.enchant)
        return GameItem(item_id, item_display_name(item_id), quantity, withdrawn_enchant)

    def deposit_item(self, char_name: str, item_id: int, quantity: int, enchant: int) -> None:
        rows = self._fetch("find_character_id_by_name", {"name": char_name})
        if not rows:
            raise GameAccountNotFoundError("Personagem não encontrado.")
        self._execute(
            "deposit_item",
            {
                "name": char_name,
                "owner_id": int(rows[0]["char_id"]),
                "item_id": item_id,
                "qty": quantity,
                "enchant": enchant,
            },
        )

    def nickname_exists(self, name: str) -> bool:
        return bool(self._fetch("nickname_exists", {"name": name}))

    def change_nickname(self, login: str, char_id: int, name: str) -> None:
        char = self._require_offline(login, char_id)
        if self.nickname_exists(name):
            raise NicknameTakenError()
        self._execute("change_nickname", {"name": name, "cid": char.char_id, "login": login})

    def change_sex(self, login: str, char_id: int, sex: int) -> None:
        char = self._require_offline(login, char_id)
        self._execute("change_sex", {"sex": sex, "cid": char.char_id, "login": login})

    def unstuck(self, login: str, char_id: int) -> None:
        char = self._require_offline(login, char_id)
        x, y, z = UNSTUCK
        self._execute("unstuck", {"x": x, "y": y, "z": z, "cid": char.char_id, "login": login})

    def count_characters(self, login: str) -> int:
        rows = self._fetch("count_characters", {"login": login})
        return int(rows[0]["total"]) if rows else 0

    def verify_character_ownership(self, char_id: int, account: str) -> bool:
        rows = self._fetch("verify_character_ownership", {"char_id": char_id, "login": account})
        return bool(rows and int(rows[0]["total"] or 0) > 0)

    def transfer_character(self, char_id: int, new_account: str) -> None:
        self._execute("transfer_character", {"acc": new_account, "cid": char_id})

    def observe_items(self) -> dict:
        # All reads share one MySQL snapshot; this path cannot mutate game data.
        result = {}
        with self._engine_or_create().connect() as connection:
            connection.exec_driver_sql("START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY")
            for key, name in (("items", "monitor_items"), ("details", "monitor_details"),
                              ("characters", "monitor_characters")):
                sql = self._sql[name]
                if not sql.lstrip().upper().startswith("SELECT"):
                    raise ValueError("Item observation requires SELECT statements.")
                rows = connection.execute(text(sql), {"row_limit": 100001}).mappings().all()
                if len(rows) > 100000:
                    raise ValueError("O limite seguro de grupos de itens foi excedido; captura cancelada.")
                result[key] = [dict(row) for row in rows]
        return result

    def query(self, name: str, params: dict | None = None) -> list[dict]:
        if not self._sql.has(name):
            return []
        return self._fetch(name, params)

    def _require_offline(self, login: str, char_id: int) -> GameCharacter:
        char = self.get_character(login, char_id)
        if char is None:
            raise GameAccountNotFoundError("Personagem não encontrado nesta conta.")
        if char.online:
            raise CharacterOfflineRequiredError()
        return char
