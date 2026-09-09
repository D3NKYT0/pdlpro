from __future__ import annotations

from abc import ABC, abstractmethod


class IAchievementFacts(ABC):
    """Porta de fatos usados pelos predicados de conquista.

    Isola ``achievement_rules`` / ``progress`` de consultas ORM multi-app. O adaptador Django
    concentra contagens e existência em outros módulos.
    """

    @abstractmethod
    def level(self, user) -> int:
        raise NotImplementedError

    @abstractmethod
    def total_xp(self, user) -> int:
        raise NotImplementedError

    @abstractmethod
    def has_avatar(self, user) -> bool:
        raise NotImplementedError

    @abstractmethod
    def email_verified(self, user) -> bool:
        raise NotImplementedError

    @abstractmethod
    def twofa_enabled(self, user) -> bool:
        raise NotImplementedError

    @abstractmethod
    def shop_purchase_count(self, user) -> int:
        raise NotImplementedError

    @abstractmethod
    def bid_count(self, user) -> int:
        raise NotImplementedError

    @abstractmethod
    def auction_seller_count(self, user) -> int:
        raise NotImplementedError

    @abstractmethod
    def auction_won_count(self, user) -> int:
        raise NotImplementedError

    @abstractmethod
    def payment_order_count(self, user, *, confirmed_only: bool = False) -> int:
        raise NotImplementedError

    @abstractmethod
    def player_transfer_count(self, user) -> int:
        raise NotImplementedError

    @abstractmethod
    def wallet_transaction_count(self, user) -> int:
        raise NotImplementedError

    @abstractmethod
    def bonus_credit_count(self, user) -> int:
        raise NotImplementedError

    @abstractmethod
    def inventory_log_count(self, user, action: str) -> int:
        raise NotImplementedError

    @abstractmethod
    def inventory_item_count(self, user) -> int:
        raise NotImplementedError

    @abstractmethod
    def spin_count(self, user, *, with_prize: bool = False) -> int:
        raise NotImplementedError

    @abstractmethod
    def opened_box_count(self, user) -> int:
        raise NotImplementedError

    @abstractmethod
    def opened_box_slot_rarity_exists(self, user, value: str, *aliases: str) -> bool:
        raise NotImplementedError

    @abstractmethod
    def slot_play_count(self, user) -> int:
        raise NotImplementedError

    @abstractmethod
    def jackpot_count(self, user) -> int:
        raise NotImplementedError

    @abstractmethod
    def dice_play_count(self, user, *, won_only: bool = False) -> int:
        raise NotImplementedError

    @abstractmethod
    def fishing_catch_count(self, user, *, rarity: str | None = None) -> int:
        raise NotImplementedError

    @abstractmethod
    def fishing_rod_level_at_least(self, user, level: int) -> bool:
        raise NotImplementedError

    @abstractmethod
    def battle_pass_progress_exists(self, user, *, premium_only: bool = False) -> bool:
        raise NotImplementedError

    @abstractmethod
    def battle_pass_highest_level(self, user) -> int:
        raise NotImplementedError

    @abstractmethod
    def daily_bonus_claim_count(self, user) -> int:
        raise NotImplementedError

    @abstractmethod
    def marketplace_deal_count(self, user) -> int:
        raise NotImplementedError

    @abstractmethod
    def bag_exists(self, user) -> bool:
        raise NotImplementedError
