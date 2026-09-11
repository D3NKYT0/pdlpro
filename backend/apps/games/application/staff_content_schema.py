"""Schema de conteúdo staff dos jogos, sem modelos ORM."""

from __future__ import annotations

CONFIG_FIELDS: dict[str, list[str]] = {
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

RELATED_FIELDS = frozenset({"season", "level_row"})


def known_content_kind(kind: str) -> bool:
    return kind in CONFIG_FIELDS


def get_config_fields(kind: str) -> list[str] | None:
    fields = CONFIG_FIELDS.get(kind)
    return list(fields) if fields is not None else None


def serialize_game_content_row(kind: str, row) -> dict:
    """Serializa uma linha de conteúdo staff para a API (dicts, sem ORM na presentation)."""

    fields = CONFIG_FIELDS.get(kind) or []
    payload: dict = {"id": str(row.id)}
    for field in fields:
        value = getattr(row, field, None)
        if field in RELATED_FIELDS:
            payload[field] = str(value.id) if value is not None and hasattr(value, "id") else value
        elif hasattr(value, "isoformat"):
            payload[field] = value
        else:
            payload[field] = value
    return payload
