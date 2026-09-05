"""Catálogo fixo dos desbloqueios do mascote, sem custos nem efeitos no jogo."""

UNLOCKS = (
    {"id": "garden", "slot": "scene", "label": {"pt": "Jardim encantado", "en": "Enchanted garden"}, "level": 1},
    {"id": "star-pin", "slot": "accessory", "label": {"pt": "Broche de estrela", "en": "Star pin"}, "level": 2},
    {"id": "dance", "slot": "interaction", "label": {"pt": "Dançar juntos", "en": "Dance together"}, "level": 3},
    {"id": "study", "slot": "scene", "label": {"pt": "Biblioteca aconchegante", "en": "Cozy library"}, "level": 4},
    {"id": "camp", "slot": "scene", "label": {"pt": "Acampamento noturno", "en": "Night campsite"}, "level": 5},
)
APPEARANCE_SLOTS = ("accessory", "scene")


def wardrobe_state(profile) -> dict:
    """Expõe o catálogo por nível e somente peças conhecidas e liberadas equipadas."""

    unlocked = {item["id"] for item in UNLOCKS if item["level"] <= profile.level}
    appearance = profile.appearance if isinstance(profile.appearance, dict) else {}
    if "scene" not in appearance:
        scene = "garden"
        if appearance.get("object") == "lantern" and profile.level >= 5:
            scene = "camp"
        elif appearance.get("outfit") == "golden-scarf" and profile.level >= 4:
            scene = "study"
        appearance = {**appearance, "scene": scene}
    return {
        "appearance": {"outfit": "", "object": "", **{
            slot: appearance.get(slot, "") if appearance.get(slot) in unlocked
            and any(item["id"] == appearance.get(slot) and item["slot"] == slot for item in UNLOCKS) else ""
            for slot in APPEARANCE_SLOTS
        }},
        "unlocks": [{**item, "unlocked": item["level"] <= profile.level} for item in UNLOCKS],
        "available_actions": ["feed", "sleep", "play", "bath", *(["dance"] if "dance" in unlocked else [])],
    }
