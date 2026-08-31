from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass(frozen=True, slots=True)
class ServerStatus:
    game_online: bool
    login_online: bool
    players_online: int


@dataclass(frozen=True, slots=True)
class ServerInfo:
    name: str
    description: str
    chronicle: str
    rates: dict[str, str]
    enchant: dict[str, str]
    max_level: int
    features: list[str]
    notes: dict[str, str]


@dataclass(frozen=True, slots=True)
class RankingEntry:
    position: int
    name: str
    value: int
    extra: dict = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class GameAccount:
    login: str
    email: str
    linked_user_id: str | None
    exists: bool = True


@dataclass(frozen=True, slots=True)
class GameCharacter:
    char_id: int
    name: str
    level: int
    online: bool
    sex: int
    pvp: int = 0
    pk: int = 0
    class_id: int = 0


@dataclass(frozen=True, slots=True)
class GameItem:
    item_id: int
    name: str
    quantity: int
    enchant: int


class ILineageGateway(ABC):
    """Porta única para o banco do Lineage 2. Nunca expor SQL ao frontend."""

    @abstractmethod
    def get_status(self) -> ServerStatus: ...

    @abstractmethod
    def get_top_pvp(self, limit: int = 10) -> list[RankingEntry]: ...

    @abstractmethod
    def get_top_pk(self, limit: int = 10) -> list[RankingEntry]: ...

    @abstractmethod
    def get_top_level(self, limit: int = 10) -> list[RankingEntry]: ...

    @abstractmethod
    def get_top_online(self, limit: int = 10) -> list[RankingEntry]: ...

    @abstractmethod
    def get_top_clans(self, limit: int = 10) -> list[RankingEntry]: ...

    @abstractmethod
    def get_top_adena(self, limit: int = 10) -> list[RankingEntry]: ...

    @abstractmethod
    def get_account(self, login: str) -> GameAccount | None: ...

    @abstractmethod
    def find_accounts_by_email(self, email: str) -> list[GameAccount]: ...

    @abstractmethod
    def get_account_by_login_and_email(self, login: str, email: str) -> GameAccount | None: ...

    @abstractmethod
    def register_account(self, login: str, password: str, email: str) -> GameAccount: ...

    @abstractmethod
    def validate_credentials(self, login: str, password: str) -> bool: ...

    @abstractmethod
    def link_account(self, login: str, user_id: str) -> GameAccount: ...

    @abstractmethod
    def unlink_account(self, login: str, user_id: str) -> None: ...

    @abstractmethod
    def update_account_password(self, login: str, password: str) -> None: ...

    @abstractmethod
    def list_characters(self, login: str) -> list[GameCharacter]: ...

    @abstractmethod
    def get_character(self, login: str, char_id: int) -> GameCharacter | None: ...

    @abstractmethod
    def list_character_items(self, char_id: int) -> list[GameItem]: ...

    @abstractmethod
    def withdraw_item(self, char_id: int, item_id: int, quantity: int) -> GameItem: ...

    @abstractmethod
    def deposit_item(self, char_name: str, item_id: int, quantity: int, enchant: int) -> None: ...

    @abstractmethod
    def nickname_exists(self, name: str) -> bool: ...

    @abstractmethod
    def change_nickname(self, login: str, char_id: int, name: str) -> None: ...

    @abstractmethod
    def change_sex(self, login: str, char_id: int, sex: int) -> None: ...

    @abstractmethod
    def unstuck(self, login: str, char_id: int) -> None: ...

    @abstractmethod
    def count_characters(self, login: str) -> int: ...

    @abstractmethod
    def verify_character_ownership(self, char_id: int, account: str) -> bool: ...

    @abstractmethod
    def transfer_character(self, char_id: int, new_account: str) -> None: ...

    @abstractmethod
    def query(self, name: str, params: dict | None = None) -> list[dict]:
        """Executa uma query nomeada do catálogo SQL. Sem SQL no Python."""
        ...
