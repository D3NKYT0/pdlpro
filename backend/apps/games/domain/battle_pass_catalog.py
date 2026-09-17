from __future__ import annotations

from typing import NamedTuple

BATTLE_PASS_LEVELS = 30
BATTLE_PASS_XP_STEP = 120
BATTLE_PASS_SEASON_DAYS = 90
BATTLE_PASS_PREMIUM_PRICE = "50.00"
BATTLE_PASS_SEASON_NAME = "Temporada Low Rate"
LEGACY_BATTLE_PASS_SEASON_NAMES = frozenset({"Temporada 1"})
LEGACY_BATTLE_PASS_REWARD_DESCRIPTIONS = frozenset(
    {"Livre Nv.1", "Premium Nv.1", "Livre Nv.2", "Premium Nv.3"}
)
SEED_BATTLE_PASS_XP = {1: 0, 2: 20, 3: 50}

# (item_id, quantity) — índice 0 = nível 1. Stacks Interlude de servidor low rate.
BATTLE_PASS_FREE: tuple[tuple[int, int], ...] = (
    (57, 80_000),
    (1835, 800),
    (1061, 30),
    (57, 120_000),
    (736, 8),
    (1835, 1_200),
    (1539, 20),
    (57, 180_000),
    (2509, 600),
    (1458, 15),
    (1463, 500),
    (57, 250_000),
    (5591, 25),
    (1539, 30),
    (956, 1),
    (57, 350_000),
    (1463, 800),
    (5592, 12),
    (1458, 25),
    (1538, 5),
    (57, 500_000),
    (3948, 400),
    (2130, 12),
    (1464, 250),
    (1539, 50),
    (57, 750_000),
    (1459, 12),
    (4037, 1),
    (3936, 2),
    (3470, 1),
)

BATTLE_PASS_PREMIUM: tuple[tuple[int, int], ...] = (
    (57, 250_000),
    (1835, 2_500),
    (1539, 50),
    (57, 400_000),
    (1538, 12),
    (1463, 1_500),
    (5592, 30),
    (57, 600_000),
    (3947, 2_000),
    (956, 2),
    (1458, 50),
    (57, 800_000),
    (1464, 800),
    (2130, 25),
    (955, 1),
    (57, 1_200_000),
    (3948, 1_000),
    (1459, 25),
    (5592, 50),
    (952, 1),
    (57, 1_800_000),
    (1464, 1_500),
    (4037, 3),
    (2131, 15),
    (951, 1),
    (57, 2_500_000),
    (3949, 600),
    (3470, 1),
    (3936, 8),
    (3470, 2),
)

# Níveis 1-based com prêmio premium extra (marcos da pista paga).
BATTLE_PASS_PREMIUM_EXTRA: dict[int, tuple[tuple[int, int], ...]] = {
    10: ((1538, 8),),
    20: ((4037, 2),),
    30: ((57, 3_000_000),),
}


class BattlePassQuestSpec(NamedTuple):
    name: str
    description: str
    event: str
    target: int
    xp: int
    period: str


BATTLE_PASS_QUESTS: tuple[BattlePassQuestSpec, ...] = (
    BattlePassQuestSpec(
        "Girar a roda",
        "Gire a Roda da Fortuna 2 vezes hoje.",
        "roulette",
        2,
        20,
        "daily",
    ),
    BattlePassQuestSpec(
        "Jogar na taverna",
        "Jogue 2 vezes na Mesa da Taverna hoje.",
        "dice",
        2,
        20,
        "daily",
    ),
    BattlePassQuestSpec(
        "Lançar a linha",
        "Faça 3 lançamentos na Pescaria hoje.",
        "fishing",
        3,
        25,
        "daily",
    ),
    BattlePassQuestSpec(
        "Resgatar o bônus",
        "Resgate o bônus diário de hoje.",
        "daily_bonus",
        1,
        20,
        "daily",
    ),
    BattlePassQuestSpec(
        "Cilindros da semana",
        "Jogue 8 vezes nos Cilindros nesta semana.",
        "slots",
        8,
        70,
        "weekly",
    ),
    BattlePassQuestSpec(
        "Caçar na arena",
        "Enfrente 6 feras na Arena nesta semana.",
        "economy",
        6,
        70,
        "weekly",
    ),
    BattlePassQuestSpec(
        "Roda semanal",
        "Gire a Roda da Fortuna 10 vezes nesta semana.",
        "roulette",
        10,
        80,
        "weekly",
    ),
    BattlePassQuestSpec(
        "Pescaria da semana",
        "Faça 15 lançamentos na Pescaria nesta semana.",
        "fishing",
        15,
        80,
        "weekly",
    ),
    BattlePassQuestSpec(
        "Mestre da roda",
        "Gire a Roda da Fortuna 40 vezes na temporada.",
        "roulette",
        40,
        150,
        "season",
    ),
    BattlePassQuestSpec(
        "Pescador da temporada",
        "Faça 50 lançamentos na Pescaria nesta temporada.",
        "fishing",
        50,
        150,
        "season",
    ),
    BattlePassQuestSpec(
        "Gladiador",
        "Enfrente 25 feras na Arena nesta temporada.",
        "economy",
        25,
        120,
        "season",
    ),
)


class BattlePassExchangeSpec(NamedTuple):
    name: str
    required_item_id: int
    required_quantity: int
    limit_per_user: int
    rewards: tuple[tuple[int, int], ...]


BATTLE_PASS_EXCHANGES: tuple[BattlePassExchangeSpec, ...] = (
    BattlePassExchangeSpec("Mochila de Soulshot NG", 1835, 5_000, 5, ((57, 300_000),)),
    BattlePassExchangeSpec("Cristais em encante", 1458, 40, 3, ((956, 1),)),
    BattlePassExchangeSpec("Troca de Gold Bar", 3470, 1, 2, ((57, 2_000_000),)),
    BattlePassExchangeSpec("Moedas da sorte", 4037, 2, 2, ((5592, 40),)),
)


class BattlePassMilestoneSpec(NamedTuple):
    name: str
    required_xp: int
    rewards: tuple[tuple[int, int], ...]


BATTLE_PASS_MILESTONES: tuple[BattlePassMilestoneSpec, ...] = (
    BattlePassMilestoneSpec("Marco do aprendiz", 600, ((57, 200_000), (1835, 1_000))),
    BattlePassMilestoneSpec("Marco do veterano", 1_800, ((1458, 30), (1538, 8))),
    BattlePassMilestoneSpec(
        "Marco do campeão",
        BATTLE_PASS_XP_STEP * (BATTLE_PASS_LEVELS - 1),
        ((3470, 1), (4037, 3), (57, 1_000_000)),
    ),
)
