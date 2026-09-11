from __future__ import annotations

from apps.games.domain.game_content import GAME_CONTENT_FIELDS
from apps.games.infrastructure.models import (
    BattlePassExchange,
    BattlePassLevel,
    BattlePassMilestone,
    BattlePassQuest,
    BattlePassReward,
    BattlePassSeason,
    CatalogItem,
    DailyBonusDay,
    DailyBonusPoolEntry,
    DailyBonusSeason,
    Fish,
    FishingBait,
    Monster,
    Prize,
)

CONFIG_MODELS = {
    kind: (model, list(GAME_CONTENT_FIELDS[kind]))
    for kind, model in (
        ("seasons", BattlePassSeason),
        ("levels", BattlePassLevel),
        ("rewards", BattlePassReward),
        ("quests", BattlePassQuest),
        ("exchanges", BattlePassExchange),
        ("milestones", BattlePassMilestone),
        ("daily-seasons", DailyBonusSeason),
        ("daily-days", DailyBonusDay),
        ("daily-pool", DailyBonusPoolEntry),
        ("baits", FishingBait),
        ("prizes", Prize),
        ("fish", Fish),
        ("monsters", Monster),
        ("box-items", CatalogItem),
    )
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
