from __future__ import annotations

"""Campos editáveis por tipo de conteúdo administrativo de jogos.

Mantém o registro kind → nomes de campo fora da infraestrutura (sem modelos Django).
A infra associa esses kinds aos modelos ORM.
"""

GAME_CONTENT_FIELDS: dict[str, list[str]] = {
    "seasons": ["name", "starts_at", "ends_at", "active", "premium_price"],
    "levels": ["season", "level", "required_xp"],
    "rewards": [
        "level_row",
        "is_premium",
        "item_id",
        "item_name",
        "enchant",
        "quantity",
        "description",
    ],
    "quests": ["season", "name", "description", "event", "target", "xp", "period", "active"],
    "exchanges": [
        "season",
        "name",
        "required_item_id",
        "required_enchant",
        "required_quantity",
        "rewards",
        "limit_per_user",
        "active",
    ],
    "milestones": ["season", "name", "required_xp", "rewards"],
    "daily-seasons": ["name", "starts_on", "ends_on", "active"],
    "daily-days": ["season", "day", "rewards"],
    "daily-pool": ["season", "name", "weight", "rewards"],
    "baits": ["name", "description", "price", "success_bonus", "active"],
    "prizes": ["name", "item_id", "enchant", "weight", "rarity", "active"],
    "fish": [
        "name",
        "rarity",
        "min_rod_level",
        "weight",
        "xp_reward",
        "fichas_reward",
        "item_id",
        "item_name",
        "enchant",
        "active",
    ],
    "monsters": [
        "name",
        "level",
        "required_weapon_level",
        "fragment_reward",
        "hp",
        "attack",
        "defense",
        "respawn_seconds",
        "active",
    ],
    "box-items": ["name", "item_id", "enchant", "rarity", "weight", "active"],
}

GAME_CONTENT_KINDS = frozenset(GAME_CONTENT_FIELDS)


def get_config_fields(kind: str) -> list[str] | None:
    fields = GAME_CONTENT_FIELDS.get(kind)
    return list(fields) if fields is not None else None
