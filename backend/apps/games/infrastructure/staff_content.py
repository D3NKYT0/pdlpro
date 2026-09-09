from __future__ import annotations

from apps.games.infrastructure.models import (
    BattlePassExchange,
    BattlePassLevel,
    BattlePassMilestone,
    BattlePassQuest,
    BattlePassReward,
    BattlePassSeason,
    DailyBonusDay,
    DailyBonusPoolEntry,
    DailyBonusSeason,
    FishingBait,
)

CONFIG_MODELS = {
    "seasons": (
        BattlePassSeason,
        ["name", "starts_at", "ends_at", "active", "premium_price"],
    ),
    "levels": (BattlePassLevel, ["season", "level", "required_xp"]),
    "rewards": (
        BattlePassReward,
        [
            "level_row",
            "is_premium",
            "item_id",
            "item_name",
            "enchant",
            "quantity",
            "description",
        ],
    ),
    "quests": (
        BattlePassQuest,
        ["season", "name", "description", "event", "target", "xp", "period", "active"],
    ),
    "exchanges": (
        BattlePassExchange,
        [
            "season",
            "name",
            "required_item_id",
            "required_enchant",
            "required_quantity",
            "rewards",
            "limit_per_user",
            "active",
        ],
    ),
    "milestones": (BattlePassMilestone, ["season", "name", "required_xp", "rewards"]),
    "daily-seasons": (DailyBonusSeason, ["name", "starts_on", "ends_on", "active"]),
    "daily-days": (DailyBonusDay, ["season", "day", "rewards"]),
    "daily-pool": (DailyBonusPoolEntry, ["season", "name", "weight", "rewards"]),
    "baits": (FishingBait, ["name", "description", "price", "success_bonus", "active"]),
}


def get_config_model(kind: str):
    entry = CONFIG_MODELS.get(kind)
    if entry is None:
        return None
    return entry[0]


def get_config_fields(kind: str) -> list[str] | None:
    entry = CONFIG_MODELS.get(kind)
    if entry is None:
        return None
    return list(entry[1])
