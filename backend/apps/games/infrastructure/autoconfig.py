from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from apps.games.domain.autoconfig import KNOWN_GAME_CODES, IGameAutoconfigService
from apps.games.infrastructure.models import (
    BoxType,
    CatalogItem,
    DailyBonusDay,
    DailyBonusPoolEntry,
    DailyBonusSeason,
    Fish,
    FishingBait,
    GameConfig,
    Monster,
    Prize,
)
from apps.server.domain.item_catalog import IItemCatalog

# Nomes antigos do seed; o autoconfig só troca esses, nunca um título customizado.
LEGACY_GAME_NAMES: dict[str, frozenset[str]] = {
    "roulette": frozenset({"Roleta"}),
    "dice": frozenset({"Dados", "Dados da Taverna"}),
    "slots": frozenset({"Slots"}),
    "fishing": frozenset({"Pesca"}),
    "economy": frozenset({"Economia"}),
}

GAME_DEFAULTS: dict[str, dict] = {
    "roulette": {"name": "Roda da Fortuna", "settings": {"cost": 1, "fail_chance": 20}},
    "daily_bonus": {"name": "Bônus diário", "settings": {"amount": "10.00"}},
    "dice": {"name": "Mesa da Taverna", "settings": {"min_bet": 1}},
    "slots": {"name": "Cilindros", "settings": {"cost": 1}},
    "fishing": {"name": "Pescaria", "settings": {"cost_per_cast": 1}},
    "economy": {"name": "Arena das Feras", "settings": {}},
    "boxes": {"name": "Baús Encantados", "settings": None},
}

# IDs Interlude do catálogo XML (`data/items`). Nomes vêm do catálogo na hora do seed.
ROULETTE_PRIZES = (
    (1835, 36, "comum"),
    (1463, 24, "comum"),
    (736, 20, "comum"),
    (737, 14, "incomum"),
    (1538, 12, "incomum"),
    (3936, 10, "incomum"),
    (955, 8, "incomum"),
    (951, 6, "raro"),
    (2131, 5, "raro"),
    (3470, 4, "raro"),
    (4037, 3, "raro"),
    (729, 2, "epico"),
    (8752, 2, "epico"),
    (6577, 1, "epico"),
    (8762, 1, "lendario"),
    (6657, 1, "lendario"),
)

BOX_ITEMS = (
    (1835, 0, "common", 40),
    (1463, 0, "common", 28),
    (736, 0, "common", 22),
    (1538, 0, "rare", 16),
    (951, 0, "rare", 12),
    (3470, 0, "rare", 10),
    (4037, 0, "epic", 6),
    (729, 0, "epic", 4),
    (8752, 0, "epic", 3),
    (6577, 0, "legendary", 2),
    (8762, 0, "legendary", 1),
    (6657, 0, "legendary", 1),
)

BOX_TYPES = (
    ("Baú Comum", Decimal("10.00"), 5),
    ("Baú Raro", Decimal("25.00"), 7),
    ("Baú Épico", Decimal("50.00"), 9),
    ("Baú Lendário", Decimal("100.00"), 12),
)

FISH_SPECIES = (
    ("Lambari", "common", 1, 40, 8, 0, 1835),
    ("Dourado", "rare", 1, 15, 20, 1, 1463),
    ("Piraíba", "epic", 2, 5, 40, 0, 3470),
    ("Pirarucu Ancestral", "legendary", 3, 2, 80, 3, 6577),
)

MONSTERS = (
    ("Elder Keltir", 1, 0, 3, 16, 3, 1, 12),
    ("Goblin", 1, 0, 5, 20, 4, 1, 15),
    ("Orc", 3, 2, 8, 50, 10, 3, 30),
    ("Ant Recruit", 5, 3, 12, 70, 12, 4, 40),
    ("Drake", 8, 5, 20, 120, 18, 8, 60),
)

BAITS = (
    ("Isca do aprendiz", 3, 5, "Uma chance extra para trazer seu próximo troféu."),
    ("Isca encantada", 8, 15, "Atrai peixes raros nas águas mais profundas."),
)

DAILY_POOL = (
    (
        "Moeda da Sorte",
        4,
        [{"kind": "item", "item_id": 4037, "name": "Coin of Luck", "quantity": 1, "enchant": 0}],
    ),
    (
        "Barra de Ouro",
        3,
        [{"kind": "item", "item_id": 3470, "name": "Gold Bar", "quantity": 1, "enchant": 0}],
    ),
    (
        "Escape Abençoado",
        5,
        [
            {
                "kind": "item",
                "item_id": 1538,
                "name": "Blessed Scroll of Escape",
                "quantity": 1,
                "enchant": 0,
            }
        ],
    ),
)


class DjangoGameAutoconfigService(IGameAutoconfigService):
    """Preenche GameConfig e catálogos jogáveis com itens Interlude; não apaga o que já existe."""

    def __init__(self, catalog: IItemCatalog) -> None:
        self._catalog = catalog

    def bootstrap(self, code: str | None) -> dict:
        targets = (code,) if code else KNOWN_GAME_CODES
        return {"games": [self._bootstrap_one(item) for item in targets]}

    def _item_name(self, item_id: int) -> str:
        return self._catalog.display_name(item_id, fallback=f"Item {item_id}")

    def _bootstrap_one(self, code: str) -> dict:
        created: dict[str, int] = {}
        spec = GAME_DEFAULTS[code]
        if spec["settings"] is None:
            created.update(self._ensure_boxes())
            return {
                "code": code,
                "name": spec["name"],
                "activated": BoxType.objects.filter(active=True).exists(),
                "created": created,
            }
        row, config_created = self._ensure_config(code, spec["name"], spec["settings"])
        created["config"] = int(config_created)
        if code == "roulette":
            created["prizes"] = self._ensure_prizes()
        elif code == "daily_bonus":
            created.update(self._ensure_daily_season())
        elif code == "fishing":
            created["fish"] = self._ensure_fish()
            created["baits"] = self._ensure_baits()
        elif code == "economy":
            created["monsters"] = self._ensure_monsters()
        return {
            "code": code,
            "name": row.name,
            "activated": bool(row.active),
            "created": created,
        }

    def _ensure_config(self, code: str, name: str, settings: dict) -> tuple[GameConfig, bool]:
        row, created = GameConfig.objects.get_or_create(
            code=code,
            defaults={"name": name, "active": True, "settings": dict(settings)},
        )
        merged = dict(row.settings or {})
        changed = False
        for key, value in settings.items():
            if key not in merged:
                merged[key] = value
                changed = True
        if not row.active:
            row.active = True
            changed = True
        if row.name in LEGACY_GAME_NAMES.get(code, frozenset()):
            row.name = name
            changed = True
        if changed:
            row.settings = merged
            row.save(update_fields=["active", "settings", "name"])
        return row, created

    def _ensure_prizes(self) -> int:
        created = 0
        for item_id, weight, rarity in ROULETTE_PRIZES:
            _, was = Prize.objects.get_or_create(
                item_id=item_id,
                enchant=0,
                defaults={
                    "name": self._item_name(item_id),
                    "weight": weight,
                    "rarity": rarity,
                    "active": True,
                },
            )
            created += int(was)
        return created

    def _ensure_daily_season(self) -> dict[str, int]:
        counts = {"seasons": 0, "season_days": 0, "pool": 0}
        season = DailyBonusSeason.objects.order_by("starts_on").first()
        if season is None:
            today = timezone.localdate()
            season = DailyBonusSeason.objects.create(
                name="Sete dias de aventura",
                starts_on=today,
                ends_on=today + timedelta(days=6),
                active=True,
            )
            counts["seasons"] = 1
        for day in range(1, 8):
            rewards = (
                [{"kind": "tokens", "quantity": day * 5}]
                if day < 7
                else [
                    {
                        "kind": "item",
                        "item_id": 3470,
                        "name": self._item_name(3470),
                        "quantity": 1,
                        "enchant": 0,
                    }
                ]
            )
            _, was = DailyBonusDay.objects.get_or_create(
                season=season,
                day=day,
                defaults={"rewards": rewards},
            )
            counts["season_days"] += int(was)
        for name, weight, rewards in DAILY_POOL:
            labeled = []
            for reward in rewards:
                entry = dict(reward)
                if entry.get("kind") == "item" and entry.get("item_id"):
                    entry["name"] = self._item_name(int(entry["item_id"]))
                labeled.append(entry)
            _, was = DailyBonusPoolEntry.objects.get_or_create(
                season=season,
                name=name,
                defaults={"weight": weight, "rewards": labeled},
            )
            counts["pool"] += int(was)
        return counts

    def _ensure_fish(self) -> int:
        created = 0
        for name, rarity, rod, weight, xp, fichas, item_id in FISH_SPECIES:
            item_name = self._item_name(item_id)
            fish, was = Fish.objects.get_or_create(
                name=name,
                defaults={
                    "rarity": rarity,
                    "min_rod_level": rod,
                    "weight": weight,
                    "xp_reward": xp,
                    "fichas_reward": fichas,
                    "item_id": item_id,
                    "item_name": item_name,
                    "active": True,
                },
            )
            created += int(was)
            if not was and not fish.item_id:
                fish.item_id = item_id
                fish.item_name = item_name
                fish.save(update_fields=["item_id", "item_name"])
                created += 1
        return created

    def _ensure_baits(self) -> int:
        created = 0
        for name, price, bonus, description in BAITS:
            _, was = FishingBait.objects.get_or_create(
                name=name,
                defaults={
                    "price": price,
                    "success_bonus": bonus,
                    "description": description,
                    "active": True,
                },
            )
            created += int(was)
        return created

    def _ensure_monsters(self) -> int:
        created = 0
        for name, level, weapon, fragments, hp, attack, defense, respawn in MONSTERS:
            _, was = Monster.objects.get_or_create(
                name=name,
                defaults={
                    "level": level,
                    "required_weapon_level": weapon,
                    "fragment_reward": fragments,
                    "hp": hp,
                    "attack": attack,
                    "defense": defense,
                    "respawn_seconds": respawn,
                    "active": True,
                },
            )
            created += int(was)
        return created

    def _ensure_boxes(self) -> dict[str, int]:
        counts = {"catalog_items": 0, "box_types": 0, "box_links": 0}
        catalog: list[CatalogItem] = []
        for item_id, enchant, rarity, weight in BOX_ITEMS:
            item, was = CatalogItem.objects.get_or_create(
                item_id=item_id,
                enchant=enchant,
                defaults={
                    "name": self._item_name(item_id),
                    "rarity": rarity,
                    "weight": weight,
                    "active": True,
                },
            )
            counts["catalog_items"] += int(was)
            catalog.append(item)
        for name, price, boosters in BOX_TYPES:
            box, was = BoxType.objects.get_or_create(
                name=name,
                defaults={"price": price, "boosters_amount": boosters, "active": True},
            )
            counts["box_types"] += int(was)
            if not box.items.exists() and catalog:
                box.items.set(catalog)
                counts["box_links"] += 1
        return counts
