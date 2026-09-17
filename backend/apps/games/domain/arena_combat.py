from __future__ import annotations

"""Resolução de combate da arena.

A força da arma e os golpes no chefe mudam a chance; o sorteio decide vitória
ou derrota. Sem Django.
"""

import random

ARENA_STRIKE_MAX = 5
ARENA_WIN_FLOOR = 38
ARENA_WIN_CEILING = 90
ARENA_REGULAR_BASE = 58
ARENA_BOSS_BASE = 34
ARENA_BOSS_PER_STRIKE = 9


def clamp_arena_strikes(strikes: int | None) -> int:
    """Limita os golpes do duelo do chefe à janela válida ``0…ARENA_STRIKE_MAX``."""

    if strikes is None:
        return 0
    return max(0, min(ARENA_STRIKE_MAX, int(strikes)))


def arena_win_chance(
    *,
    weapon_level: int,
    required_weapon_level: int,
    monster_attack: int,
    is_boss: bool,
    strikes: int = 0,
) -> int:
    """Chance percentual de vitória, já recortada entre piso e teto."""

    if is_boss:
        return min(
            ARENA_WIN_CEILING,
            ARENA_BOSS_BASE + clamp_arena_strikes(strikes) * ARENA_BOSS_PER_STRIKE,
        )
    over = max(0, weapon_level - required_weapon_level)
    pressure = max(0, monster_attack - weapon_level * 2)
    chance = ARENA_REGULAR_BASE + over * 3 - min(18, pressure)
    return max(ARENA_WIN_FLOOR, min(ARENA_WIN_CEILING, chance))


def resolve_arena_fight(
    *,
    weapon_level: int,
    required_weapon_level: int,
    monster_attack: int,
    is_boss: bool,
    strikes: int | None = None,
) -> tuple[bool, int]:
    """Sorteia vitória/derrota e um número de rodadas só para o palco.

    Retorna ``(won, rounds)``.
    """

    hits = clamp_arena_strikes(strikes)
    chance = arena_win_chance(
        weapon_level=weapon_level,
        required_weapon_level=required_weapon_level,
        monster_attack=monster_attack,
        is_boss=is_boss,
        strikes=hits,
    )
    won = random.randint(1, 100) <= chance
    low, high = (5, 9) if is_boss else (2, 6)
    rounds = random.randint(low, high)
    return won, rounds
