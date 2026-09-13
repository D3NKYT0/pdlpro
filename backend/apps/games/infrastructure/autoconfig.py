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
    "fishing": {"name": "Pescaria", "settings": {"cost_per_cast": 1, "baits_per_token": 10}},
    "economy": {"name": "Arena das Feras", "settings": {}},
    "boxes": {"name": "Baús Encantados", "settings": None},
}

# IDs Interlude do catálogo XML (`data/items`). Nomes vêm do catálogo na hora do seed.
# Tupla: (item_id, quantity, weight, rarity) — stacks de low-rate, não unidade isolada.
ROULETTE_PRIZES = (
    (57, 50_000, 22, "comum"),
    (1835, 2_000, 16, "comum"),
    (2509, 1_000, 10, "comum"),
    (1061, 80, 8, "comum"),
    (736, 20, 6, "comum"),
    (57, 200_000, 10, "incomum"),
    (1463, 1_000, 8, "incomum"),
    (1539, 50, 6, "incomum"),
    (1538, 10, 5, "incomum"),
    (3936, 5, 4, "incomum"),
    (1458, 40, 4, "incomum"),
    (57, 500_000, 5, "raro"),
    (955, 1, 4, "raro"),
    (956, 2, 3, "raro"),
    (2130, 20, 3, "raro"),
    (3470, 1, 2, "raro"),
    (4037, 5, 2, "raro"),
    (8723, 1, 2, "raro"),
    (57, 1_500_000, 2, "epico"),
    (951, 1, 2, "epico"),
    (1464, 500, 1, "epico"),
    (8748, 1, 1, "epico"),
    (57, 5_000_000, 1, "lendario"),
    (947, 1, 1, "lendario"),
    (6577, 1, 1, "lendario"),
)

# Tupla: (item_id, enchant, quantity, rarity, weight)
BOX_ITEMS = (
    (57, 0, 80_000, "common", 28),
    (1835, 0, 3_000, "common", 20),
    (2509, 0, 1_500, "common", 16),
    (1463, 0, 1_500, "common", 14),
    (1061, 0, 80, "common", 12),
    (1539, 0, 80, "common", 12),
    (736, 0, 20, "common", 10),
    (1538, 0, 15, "rare", 10),
    (3936, 0, 5, "rare", 8),
    (1458, 0, 60, "rare", 8),
    (2130, 0, 20, "rare", 7),
    (955, 0, 1, "rare", 7),
    (956, 0, 2, "rare", 6),
    (3470, 0, 1, "rare", 6),
    (8723, 0, 1, "rare", 5),
    (57, 0, 750_000, "rare", 5),
    (951, 0, 1, "epic", 4),
    (952, 0, 1, "epic", 4),
    (4037, 0, 10, "epic", 3),
    (1464, 0, 500, "epic", 3),
    (8748, 0, 1, "epic", 2),
    (947, 0, 1, "epic", 2),
    (729, 0, 1, "epic", 2),
    (6569, 0, 1, "legendary", 1),
    (6578, 0, 1, "legendary", 1),
    (6577, 0, 1, "legendary", 1),
    (6658, 0, 1, "legendary", 1),
    (57, 0, 3_000_000, "legendary", 1),
)

# Mira lendária de cada baú default — low rate, não o mesmo anel em todos.
BOX_HUNTS = {
    "Baú Comum": 6569,
    "Baú Raro": 6578,
    "Baú Épico": 6577,
    "Baú Lendário": 6658,
}

# Raridades do catálogo em cada baú default; nomes customizados não entram neste mapa.
BOX_TIER_RARITIES = {
    "Baú Comum": frozenset({"common", "rare"}),
    "Baú Raro": frozenset({"rare", "epic"}),
    "Baú Épico": frozenset({"epic"}),
    "Baú Lendário": frozenset({"epic"}),
}

# IDs antigos do primeiro seed + atuais; o sync desativa sobras desses IDs.
_LEGACY_ROULETTE_ITEM_IDS = frozenset(
    {1835, 1463, 736, 737, 1538, 3936, 955, 951, 2131, 3470, 4037, 729, 8752, 6577, 8762, 6657}
)
_LEGACY_BOX_ITEM_IDS = frozenset(
    {1835, 1463, 736, 1538, 951, 3470, 4037, 729, 8752, 6577, 8762, 6657}
)

BOX_TYPES = (
    ("Baú Comum", Decimal("10.00"), 20),
    ("Baú Raro", Decimal("25.00"), 30),
    ("Baú Épico", Decimal("50.00"), 40),
    ("Baú Lendário", Decimal("100.00"), 50),
)

# Tupla: (name, rarity, rod, weight, xp, fichas, item_id, quantity)
FISH_SPECIES = (
    ("Lambari", "common", 1, 40, 8, 0, 1835, 800),
    ("Tilápia", "common", 1, 36, 8, 0, 1835, 600),
    ("Traíra", "common", 1, 28, 10, 0, 2509, 400),
    ("Dourado", "rare", 1, 15, 20, 1, 1463, 500),
    ("Tucunaré", "rare", 1, 14, 22, 1, 1463, 400),
    ("Tambaqui", "rare", 2, 12, 24, 1, 1061, 40),
    ("Piraíba", "epic", 2, 5, 40, 0, 57, 150_000),
    ("Surubim", "epic", 2, 6, 42, 0, 57, 200_000),
    ("Pirarucu Ancestral", "legendary", 3, 2, 80, 3, 955, 1),
    ("Koi Etéreo", "legendary", 3, 3, 90, 4, 3470, 1),
    ("Boiúna", "divine", 4, 2, 130, 6, 4037, 5),
    ("Serafim de Eva", "divine", 5, 1, 180, 10, 6577, 1),
)

MONSTERS = (
    ("Elder Keltir", 1, 0, 3, 16, 3, 1, 12),
    ("Goblin", 1, 0, 5, 20, 4, 1, 15),
    ("Orc", 3, 2, 8, 50, 10, 3, 30),
    ("Ant Recruit", 5, 3, 12, 70, 12, 4, 40),
    ("Drake", 8, 5, 20, 120, 18, 8, 60),
)

# name, paid_with, price, bonus, description
# Isca comum: 1 ficha = 10. Encantadas: preço antigo em iscas comuns (3 e 8).
BAITS = (
    ("Isca comum", "tokens", 1, 0, "Isca simples para lançar a linha."),
    ("Isca do aprendiz", "baits", 3, 5, "Uma chance extra para trazer seu próximo troféu."),
    ("Isca encantada", "baits", 8, 15, "Atrai peixes raros nas águas mais profundas."),
)

DAILY_POOL = (
    (
        "Adena do dia",
        6,
        [{"kind": "item", "item_id": 57, "name": "Adena", "quantity": 100_000, "enchant": 0}],
    ),
    (
        "Moeda da Sorte",
        4,
        [{"kind": "item", "item_id": 4037, "name": "Coin of Luck", "quantity": 3, "enchant": 0}],
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
                "quantity": 5,
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
        kept: list = []
        known_ids = _LEGACY_ROULETTE_ITEM_IDS | {item_id for item_id, *_ in ROULETTE_PRIZES}
        for item_id, quantity, weight, rarity in ROULETTE_PRIZES:
            row, was = Prize.objects.get_or_create(
                item_id=item_id,
                enchant=0,
                quantity=quantity,
                defaults={
                    "name": self._item_name(item_id),
                    "weight": weight,
                    "rarity": rarity,
                    "active": True,
                },
            )
            created += int(was)
            if not was:
                changed = False
                if not row.active:
                    row.active = True
                    changed = True
                if row.weight != weight:
                    row.weight = weight
                    changed = True
                if row.rarity != rarity:
                    row.rarity = rarity
                    changed = True
                if changed:
                    row.save(update_fields=["active", "weight", "rarity", "updated_at"])
            kept.append(row.pk)
        Prize.objects.filter(item_id__in=known_ids, active=True).exclude(pk__in=kept).update(
            active=False
        )
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
            row, was = DailyBonusPoolEntry.objects.get_or_create(
                season=season,
                name=name,
                defaults={"weight": weight, "rewards": labeled},
            )
            counts["pool"] += int(was)
            if not was and row.rewards != labeled:
                row.rewards = labeled
                row.weight = weight
                row.save(update_fields=["rewards", "weight", "updated_at"])
        return counts

    def _ensure_fish(self) -> int:
        created = 0
        for name, rarity, rod, weight, xp, fichas, item_id, quantity in FISH_SPECIES:
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
                    "quantity": quantity,
                    "active": True,
                },
            )
            created += int(was)
            if not was:
                fields: list[str] = []
                if fish.item_id != item_id:
                    fish.item_id = item_id
                    fields.append("item_id")
                if fish.item_name != item_name:
                    fish.item_name = item_name
                    fields.append("item_name")
                if fish.quantity != quantity:
                    fish.quantity = quantity
                    fields.append("quantity")
                if fields:
                    fish.save(update_fields=[*fields, "updated_at"])
                    created += 1
        return created

    def _ensure_baits(self) -> int:
        created = 0
        for name, paid_with, price, bonus, description in BAITS:
            bait, was = FishingBait.objects.get_or_create(
                name=name,
                defaults={
                    "paid_with": paid_with,
                    "price": price,
                    "success_bonus": bonus,
                    "description": description,
                    "active": True,
                },
            )
            created += int(was)
            if not was:
                fields: list[str] = []
                if bait.paid_with != paid_with:
                    bait.paid_with = paid_with
                    fields.append("paid_with")
                if bait.price != price:
                    bait.price = price
                    fields.append("price")
                if bait.success_bonus != bonus:
                    bait.success_bonus = bonus
                    fields.append("success_bonus")
                if bait.description != description:
                    bait.description = description
                    fields.append("description")
                if not bait.active:
                    bait.active = True
                    fields.append("active")
                if fields:
                    bait.save(update_fields=[*fields, "updated_at"])
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
        kept: list = []
        known_ids = _LEGACY_BOX_ITEM_IDS | {item_id for item_id, *_ in BOX_ITEMS} | {6658}
        for item_id, enchant, quantity, rarity, weight in BOX_ITEMS:
            item, was = CatalogItem.objects.get_or_create(
                item_id=item_id,
                enchant=enchant,
                quantity=quantity,
                defaults={
                    "name": self._item_name(item_id),
                    "rarity": rarity,
                    "weight": weight,
                    "active": True,
                },
            )
            counts["catalog_items"] += int(was)
            if not was:
                changed = False
                if not item.active:
                    item.active = True
                    changed = True
                if item.weight != weight:
                    item.weight = weight
                    changed = True
                if item.rarity != rarity:
                    item.rarity = rarity
                    changed = True
                if changed:
                    item.save(update_fields=["active", "weight", "rarity", "updated_at"])
            catalog.append(item)
            kept.append(item.pk)
        CatalogItem.objects.filter(item_id__in=known_ids, active=True).exclude(pk__in=kept).update(
            active=False
        )
        for name, price, boosters in BOX_TYPES:
            box, was = BoxType.objects.get_or_create(
                name=name,
                defaults={"price": price, "boosters_amount": boosters, "active": True},
            )
            counts["box_types"] += int(was)
            if box.boosters_amount != boosters:
                box.boosters_amount = boosters
                box.save(update_fields=["boosters_amount", "updated_at"])
            allowed = BOX_TIER_RARITIES.get(name)
            fillers = [item for item in catalog if allowed is None or item.rarity in allowed]
            hunt_id = BOX_HUNTS.get(name)
            hunts = [
                item
                for item in catalog
                if item.rarity in {"legendary", "lendario", "legendario"} and item.item_id != 57
            ]
            hunt = next((item for item in hunts if item.item_id == hunt_id), None)
            if hunt is None:
                hunt = next((item for item in hunts if item.item_id == 6658), hunts[0] if hunts else None)
            tier = list(fillers)
            if hunt is not None and hunt not in tier:
                tier.append(hunt)
            if tier:
                current = set(box.items.values_list("pk", flat=True))
                wanted = {item.pk for item in tier}
                if current != wanted:
                    box.items.set(tier)
                    counts["box_links"] += 1
        return counts
