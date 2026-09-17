from __future__ import annotations

"""Catálogo inicial das feras da arena.

Cada tupla é ``(nome, nível, arma mínima, fragmentos, hp, ataque, defesa, respawn)``.
O nome casa a arte do tema (`monster-keltir.webp`, etc.).
O chefe só entra após a arma no máximo: a vitória entrega o prêmio e zera o encante.
"""

ARENA_WEAPON_MAX = 10
ARENA_BOSS_ADENA = 250_000
ARENA_BOSS_ITEM_ID = 57
ARENA_BOSS_ITEM_NAME = "Adena"

# name, level, required_weapon_level, fragment_reward, hp, attack, defense, respawn_seconds
ARENA_MONSTERS: tuple[tuple[str, int, int, int, int, int, int, int], ...] = (
    ("Elder Keltir", 1, 0, 3, 16, 3, 1, 12),
    ("Wolf", 2, 1, 4, 28, 6, 2, 20),
    ("Goblin", 1, 0, 5, 20, 4, 1, 15),
    ("Orc", 3, 2, 8, 50, 10, 3, 30),
    ("Lizardman", 4, 2, 9, 58, 11, 3, 32),
    ("Ant Recruit", 5, 3, 12, 70, 12, 4, 40),
    ("Werewolf", 6, 4, 14, 90, 15, 6, 48),
    ("Ogre", 7, 4, 16, 105, 16, 7, 52),
    ("Drake", 8, 5, 20, 120, 18, 8, 60),
    ("Death Knight", 10, 8, 25, 180, 26, 12, 90),
)

ARENA_BOSS: tuple[str, int, int, int, int, int, int, int] = (
    "Queen Ant",
    12,
    ARENA_WEAPON_MAX,
    0,
    480,
    48,
    28,
    150,
)


def is_arena_boss(monster) -> bool:
    """Verdadeiro quando o oponente é o chefe que entrega o prêmio da arena."""

    return bool(getattr(monster, "is_boss", False))
