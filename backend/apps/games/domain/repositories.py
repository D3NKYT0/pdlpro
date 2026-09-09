from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import date
from decimal import Decimal
from typing import Any
from uuid import UUID


class IGameConfigAdminRepository(ABC):
    """Porta administrativa de configuração de jogos (GameConfig).

    Injete nos casos de uso staff e registre o adaptador no GamesProvider.
    """

    @abstractmethod
    def list_all(self) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, config_id: UUID) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def get_by_code(self, code: str) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def get_active_by_code(self, code: str) -> Any | None:
        """Configuração ativa pelo código, ou None."""

        raise NotImplementedError

    @abstractmethod
    def save(self, row: Any) -> Any:
        raise NotImplementedError


class IGameContentAdminRepository(ABC):
    """Porta administrativa do conteúdo configurável dos jogos (passe, diário, iscas).

    Injete nos casos de uso staff de conteúdo e registre o adaptador no GamesProvider.
    """

    @abstractmethod
    def list_kind(self, kind: str) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def get_kind(self, kind: str, entry_id: UUID) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def create(self, kind: str, validated_data: dict) -> Any:
        raise NotImplementedError

    @abstractmethod
    def update(self, kind: str, entry_id: UUID, validated_data: dict) -> Any:
        raise NotImplementedError

    @abstractmethod
    def has_active_overlap(
        self,
        kind: str,
        *,
        start_key: str,
        end_key: str,
        start,
        end,
        exclude_id: UUID | None = None,
    ) -> bool:
        """Indica se já existe temporada ativa sobreposta ao intervalo informado."""

        raise NotImplementedError

    @abstractmethod
    def resolve_related(self, kind: str, field_name: str, related_id: UUID) -> Any | None:
        """Resolve FK configurável (ex.: season, level_row) pelo id."""

        raise NotImplementedError


class IGameCatalogRepository(ABC):
    """Porta do catálogo jogável: configs públicas, prêmios da roleta e histórico de giros.

    Cobre o ORM de ``use_cases`` (roleta/fichas) e consultas compartilhadas de GameConfig/Prize.
    """

    @abstractmethod
    def require_user(self, user_id: UUID) -> Any:
        raise NotImplementedError

    @abstractmethod
    def require_user_locked(self, user_id: UUID) -> Any:
        raise NotImplementedError

    @abstractmethod
    def get_config_by_code(self, code: str) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def get_active_config(self, code: str) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def list_active_prizes(self, *, order_by_name: bool = False) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def create_spin_history(self, *, user, prize, failed: bool, seed: int) -> Any:
        raise NotImplementedError

    @abstractmethod
    def add_fichas(self, user_id: UUID, amount: int) -> Any:
        """Incrementa fichas atomicamente e devolve o usuário atualizado."""

        raise NotImplementedError


class IBagRepository(ABC):
    """Porta da bag do jogador (Bag / BagItem)."""

    @abstractmethod
    def get_by_user_id(self, user_id: UUID) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def list_items(self, bag) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def clear_items(self, bag) -> None:
        raise NotImplementedError

    @abstractmethod
    def add_item(
        self,
        user,
        *,
        item_id: int,
        item_name: str,
        enchant: int = 0,
        quantity: int = 1,
    ) -> Any:
        raise NotImplementedError

    @abstractmethod
    def owned_quantity(self, user, *, item_id: int, enchant: int) -> int:
        raise NotImplementedError

    @abstractmethod
    def get_item_locked(self, user, *, item_id: int, enchant: int) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def save_item(self, item, *, update_fields: list[str]) -> None:
        raise NotImplementedError

    @abstractmethod
    def delete_item(self, item) -> None:
        raise NotImplementedError


class IBoxRepository(ABC):
    """Porta de caixas, tipos, slots e catálogo de itens de caixa."""

    @abstractmethod
    def require_user(self, user_id: UUID) -> Any:
        raise NotImplementedError

    @abstractmethod
    def require_user_locked(self, user_id: UUID) -> Any:
        raise NotImplementedError

    @abstractmethod
    def list_active_types(self) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def get_active_type(self, box_type_id: UUID) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def list_user_boxes(self, user_id: UUID) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def list_active_type_items(self, box_type) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def list_active_catalog_items(self) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def delete_user_boxes_of_type(self, user, box_type) -> None:
        raise NotImplementedError

    @abstractmethod
    def create_box(self, user, box_type) -> Any:
        raise NotImplementedError

    @abstractmethod
    def create_slot(
        self,
        box,
        *,
        item_id: int,
        item_name: str,
        enchant: int,
        rarity: str,
        probability: int,
    ) -> Any:
        raise NotImplementedError

    @abstractmethod
    def get_box(self, box_id: UUID) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def list_closed_slots(self, box) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def count_closed_slots(self, box) -> int:
        raise NotImplementedError

    @abstractmethod
    def count_slots(self, box) -> int:
        raise NotImplementedError

    @abstractmethod
    def save_slot(self, slot, *, update_fields: list[str]) -> None:
        raise NotImplementedError

    @abstractmethod
    def delete_box(self, box) -> None:
        raise NotImplementedError


class IMinigameRepository(ABC):
    """Porta de dados/slots: configs públicas, histórico e estatísticas por evento."""

    @abstractmethod
    def require_user(self, user_id: UUID) -> Any:
        raise NotImplementedError

    @abstractmethod
    def require_user_locked(self, user_id: UUID) -> Any:
        raise NotImplementedError

    @abstractmethod
    def get_config(self, code: str) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def create_dice_history(
        self,
        *,
        user,
        bet_type: str,
        bet_amount: int,
        roll: int,
        won: bool,
        payout: int,
    ) -> Any:
        raise NotImplementedError

    @abstractmethod
    def create_slot_history(self, *, user, reels: list, won: bool, payout: int) -> Any:
        raise NotImplementedError

    @abstractmethod
    def event_statistics(self, user, kind: str) -> dict:
        """Agrega jogadas/vitórias/ranking; levanta ValidationDomainError se kind inválido."""

        raise NotImplementedError

    @abstractmethod
    def count_quest_events(self, user, quest) -> int:
        """Conta eventos do jogador no período da missão do passe."""

        raise NotImplementedError


class IFishingRepository(ABC):
    """Porta de pesca: vara, peixes, iscas, capturas e estoque."""

    @abstractmethod
    def require_user(self, user_id: UUID) -> Any:
        raise NotImplementedError

    @abstractmethod
    def require_user_locked(self, user_id: UUID) -> Any:
        raise NotImplementedError

    @abstractmethod
    def get_config(self) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def get_or_create_rod(self, user) -> Any:
        raise NotImplementedError

    @abstractmethod
    def get_or_create_rod_locked(self, user) -> Any:
        raise NotImplementedError

    @abstractmethod
    def save_rod(self, rod, *, update_fields: list[str]) -> None:
        raise NotImplementedError

    @abstractmethod
    def list_active_fish(self) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def list_fish_for_rod(self, rod_level: int) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def list_recent_catches(self, user, *, limit: int = 8) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def create_catch(self, *, user, fish, success: bool, rod_level: int) -> Any:
        raise NotImplementedError

    @abstractmethod
    def get_bait_stock_locked(self, user, bait_id: UUID) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def save_bait_stock(self, stock, *, update_fields: list[str] | None = None) -> None:
        raise NotImplementedError

    @abstractmethod
    def list_active_baits(self) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def get_active_bait(self, bait_id: UUID) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def bait_stock_map(self, user) -> dict:
        raise NotImplementedError

    @abstractmethod
    def catch_collection_map(self, user) -> dict:
        raise NotImplementedError

    @abstractmethod
    def get_or_create_bait_stock(self, user, bait) -> Any:
        raise NotImplementedError


class IEconomyRepository(ABC):
    """Porta da economia de combate: arma, monstros e logs."""

    @abstractmethod
    def require_user(self, user_id: UUID) -> Any:
        raise NotImplementedError

    @abstractmethod
    def require_user_locked(self, user_id: UUID) -> Any:
        raise NotImplementedError

    @abstractmethod
    def get_active_config(self) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def get_or_create_weapon(self, user) -> Any:
        raise NotImplementedError

    @abstractmethod
    def get_or_create_weapon_locked(self, user) -> Any:
        raise NotImplementedError

    @abstractmethod
    def save_weapon(self, weapon, *, update_fields: list[str]) -> None:
        raise NotImplementedError

    @abstractmethod
    def list_active_monsters(self) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def get_active_monster(self, monster_id: UUID) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def save_monster(self, monster, *, update_fields: list[str]) -> None:
        raise NotImplementedError

    @abstractmethod
    def create_fight_log(
        self,
        *,
        user,
        monster,
        won: bool,
        rounds: int,
        fragments_earned: int,
    ) -> Any:
        raise NotImplementedError


class IDailyBonusRepository(ABC):
    """Porta do bônus diário simples e por temporada."""

    @abstractmethod
    def require_user(self, user_id: UUID) -> Any:
        raise NotImplementedError

    @abstractmethod
    def require_user_locked(self, user_id: UUID) -> Any:
        raise NotImplementedError

    @abstractmethod
    def get_config(self) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def has_active_config(self) -> bool:
        raise NotImplementedError

    @abstractmethod
    def has_claim(self, user, claimed_on: date) -> bool:
        raise NotImplementedError

    @abstractmethod
    def has_claim_for_user_id(self, user_id: UUID, claimed_on: date) -> bool:
        raise NotImplementedError

    @abstractmethod
    def create_claim(self, user, *, claimed_on: date, amount: Decimal) -> Any:
        raise NotImplementedError

    @abstractmethod
    def create_reward_log(
        self,
        *,
        user,
        kind: str,
        label: str,
        rewards: list | None = None,
        source=None,
        season=None,
    ) -> Any:
        raise NotImplementedError

    @abstractmethod
    def active_season(self):
        raise NotImplementedError

    @abstractmethod
    def list_season_days(self, season) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def get_season_day(self, season, day: int) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def list_season_pool(self, season) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def list_daily_reward_logs(self, user, *, limit: int = 60) -> list[Any]:
        raise NotImplementedError


class IBattlePassRepository(ABC):
    """Porta do passe de batalha: temporada, progresso, recompensas, missões e extras."""

    @abstractmethod
    def require_user(self, user_id: UUID) -> Any:
        raise NotImplementedError

    @abstractmethod
    def require_user_locked(self, user_id: UUID) -> Any:
        raise NotImplementedError

    @abstractmethod
    def active_season(self) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def get_or_create_progress(self, user, season) -> Any:
        raise NotImplementedError

    @abstractmethod
    def save_progress(self, progress, *, update_fields: list[str]) -> None:
        raise NotImplementedError

    @abstractmethod
    def add_progress_xp(self, progress, amount: int) -> Any:
        raise NotImplementedError

    @abstractmethod
    def lock_user_row(self, user) -> None:
        raise NotImplementedError

    @abstractmethod
    def current_level(self, progress) -> int:
        raise NotImplementedError

    @abstractmethod
    def list_levels(self, season) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def list_claimed_reward_ids(self, user) -> set:
        raise NotImplementedError

    @abstractmethod
    def get_reward(self, reward_id: UUID) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def has_claim(self, user, reward) -> bool:
        raise NotImplementedError

    @abstractmethod
    def create_claim(self, user, reward) -> Any:
        raise NotImplementedError

    @abstractmethod
    def list_claimable_rewards(self, user, progress) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def create_reward_log(
        self,
        *,
        user,
        kind: str,
        label: str,
        rewards: list | None = None,
        source=None,
        season=None,
    ) -> Any:
        raise NotImplementedError

    @abstractmethod
    def list_reward_logs(self, user, *, exclude_daily: bool = True, limit: int = 100) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def count_logs(self, user, *, kind: str, source=None, season=None) -> int:
        raise NotImplementedError

    @abstractmethod
    def has_log(self, user, *, kind: str, source) -> bool:
        raise NotImplementedError

    @abstractmethod
    def get_active_quest(self, season, quest_id) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def has_quest_claim(self, user, quest, period_start) -> bool:
        raise NotImplementedError

    @abstractmethod
    def create_quest_claim(self, user, quest, period_start) -> Any:
        raise NotImplementedError

    @abstractmethod
    def count_quest_claims(self, user, season) -> int:
        raise NotImplementedError

    @abstractmethod
    def get_active_exchange(self, season, exchange_id) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def get_milestone(self, season, milestone_id) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def count_season_reward_claims(self, user, season) -> int:
        raise NotImplementedError
