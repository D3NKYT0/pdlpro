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

ADENA_ITEM_ID = 57
ADENA_NAME = "Adena"

GAME_DEFAULTS: dict[str, dict] = {
    "roulette": {"name": "Roda da Fortuna", "settings": {"cost": 1, "fail_chance": 20}},
    "daily_bonus": {"name": "Bônus diário", "settings": {"amount": "10.00"}},
    "dice": {"name": "Dados da Taverna", "settings": {"min_bet": 1}},
    "slots": {"name": "Cilindros", "settings": {"cost": 1}},
    "fishing": {"name": "Pescaria", "settings": {"cost_per_cast": 1}},
    "economy": {"name": "Arena das Feras", "settings": {}},
    "boxes": {"name": "Baús Encantados", "settings": None},
}

ROULETTE_PRIZES = (
    ("Saco de Adena", 40, "comum"),
    ("Bolsa de Adena", 25, "incomum"),
    ("Cofre de Adena", 10, "raro"),
    ("Tesouro de Adena", 4, "epico"),
)

CATALOG_ITEMS = (
    ("Pedaço de Adena", 0, "common", 40),
    ("Saco de Adena", 0, "rare", 20),
    ("Baú de Adena", 0, "epic", 8),
    ("Relíquia de Adena", 0, "legendary", 2),
)

BOX_TYPES = (
    ("Baú Comum", Decimal("10.00"), 5),
    ("Baú Raro", Decimal("25.00"), 7),
    ("Baú Épico", Decimal("50.00"), 9),
    ("Baú Lendário", Decimal("100.00"), 12),
)

FISH_SPECIES = (
    ("Lambari", "common", 1, 40, 8, 0, 0, ""),
    ("Dourado", "rare", 1, 15, 20, 1, 0, ""),
    ("Piraíba", "epic", 2, 5, 40, 0, ADENA_ITEM_ID, ADENA_NAME),
    ("Pirarucu Ancestral", "legendary", 3, 2, 80, 3, ADENA_ITEM_ID, ADENA_NAME),
)

MONSTERS = (
    ("Goblin", 1, 0, 5, 20, 4, 1, 15),
    ("Orc", 3, 2, 8, 50, 10, 3, 30),
    ("Dragão Negro", 8, 5, 20, 120, 18, 8, 60),
)

BAITS = (
    ("Isca do aprendiz", 3, 5, "Uma chance extra para trazer seu próximo troféu."),
    ("Isca encantada", 8, 15, "Atrai peixes raros nas águas mais profundas."),
)


class DjangoGameAutoconfigService(IGameAutoconfigService):
    """Preenche GameConfig e catálogos jogáveis com ``get_or_create``; não apaga o que já existe."""

    def bootstrap(self, code: str | None) -> dict:
        targets = (code,) if code else KNOWN_GAME_CODES
        return {"games": [self._bootstrap_one(item) for item in targets]}

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
        if changed:
            row.settings = merged
            row.save(update_fields=["active", "settings"])
        return row, created

    def _ensure_prizes(self) -> int:
        created = 0
        for name, weight, rarity in ROULETTE_PRIZES:
            _, was = Prize.objects.get_or_create(
                name=name,
                defaults={
                    "item_id": ADENA_ITEM_ID,
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
            _, was = DailyBonusDay.objects.get_or_create(
                season=season,
                day=day,
                defaults={"rewards": [{"kind": "tokens", "quantity": day * 5}]},
            )
            counts["season_days"] += int(was)
        _, was = DailyBonusPoolEntry.objects.get_or_create(
            season=season,
            name="Um toque de sorte",
            defaults={
                "weight": 3,
                "rewards": [
                    {
                        "kind": "item",
                        "item_id": ADENA_ITEM_ID,
                        "name": ADENA_NAME,
                        "quantity": 100,
                        "enchant": 0,
                    }
                ],
            },
        )
        counts["pool"] += int(was)
        _, was = DailyBonusPoolEntry.objects.get_or_create(
            season=season,
            name="Reserva para a jornada",
            defaults={"weight": 7, "rewards": [{"kind": "bonus", "quantity": "5.00"}]},
        )
        counts["pool"] += int(was)
        return counts

    def _ensure_fish(self) -> int:
        created = 0
        for name, rarity, rod, weight, xp, fichas, item_id, item_name in FISH_SPECIES:
            _, was = Fish.objects.get_or_create(
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
        for name, enchant, rarity, weight in CATALOG_ITEMS:
            item, was = CatalogItem.objects.get_or_create(
                name=name,
                defaults={
                    "item_id": ADENA_ITEM_ID,
                    "enchant": enchant,
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
