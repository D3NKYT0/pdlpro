"""Catálogo fixo dos desbloqueios do mascote, sem custos nem efeitos no jogo."""

UNLOCKS = (
    {"id": "star-pin", "slot": "accessory", "label": {"pt": "Broche de estrela", "en": "Star pin"}, "level": 2},
    {"id": "dance", "slot": "interaction", "label": {"pt": "Dançar juntos", "en": "Dance together"}, "level": 3},
    {"id": "golden-scarf", "slot": "outfit", "label": {"pt": "Lenço dourado", "en": "Golden scarf"}, "level": 4},
    {"id": "lantern", "slot": "object", "label": {"pt": "Lanterna de aventura", "en": "Adventure lantern"}, "level": 5},
)
APPEARANCE_SLOTS = ("accessory", "outfit", "object")


def wardrobe_state(profile) -> dict:
    """Expõe o catálogo por nível e somente peças conhecidas e liberadas equipadas."""

    unlocked = {item["id"] for item in UNLOCKS if item["level"] <= profile.level}
    appearance = profile.appearance if isinstance(profile.appearance, dict) else {}
    return {
        "appearance": {
            slot: appearance.get(slot, "") if appearance.get(slot) in unlocked
            and any(item["id"] == appearance.get(slot) and item["slot"] == slot for item in UNLOCKS) else ""
            for slot in APPEARANCE_SLOTS
        },
        "unlocks": [{**item, "unlocked": item["level"] <= profile.level} for item in UNLOCKS],
        "available_actions": ["feed", "sleep", "play", "care", *(["dance"] if "dance" in unlocked else [])],
    }
