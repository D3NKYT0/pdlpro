from __future__ import annotations

"""Resolução de combate da arena.

Nas feras comuns, encante acima do requerimento vence sempre; no mesmo nível o
sorteio decide. O chefe ignora essa folga e usa os golpes do duelo. Sem Django.
"""

import random

ARENA_STRIKE_MAX = 5
ARENA_WIN_FLOOR = 74
ARENA_WIN_CEILING = 92
ARENA_REGULAR_BASE = 88
ARENA_BOSS_BASE = 56
ARENA_BOSS_PER_STRIKE = 7


def clamp_arena_strikes(strikes: int | None) -> int:
    """Limita os golpes do duelo do chefe à janela válida ``0…ARENA_STRIKE_MAX``."""

    if strikes is None:
        return 0
    return max(0, min(ARENA_STRIKE_MAX, int(strikes)))


def is_arena_overlevel(
    *,
    weapon_level: int,
    required_weapon_level: int,
    is_boss: bool,
) -> bool:
    """Verdadeiro quando a arma comum está acima do requerimento e a vitória é certa."""

    if is_boss:
        return False
    return int(weapon_level) > int(required_weapon_level)


def arena_win_chance(
    *,
    weapon_level: int,
    required_weapon_level: int,
    monster_attack: int,
    is_boss: bool,
    strikes: int = 0,
) -> int:
    """Chance percentual de vitória, já recortada entre piso e teto.

    Fera comum com arma acima do requerimento: ``100``. Mesmo encante: sorteio
    favorável (a luta gasta ficha). Chefe: nunca garantido; cada golpe do duelo
    soma ``ARENA_BOSS_PER_STRIKE``.
    """

    if is_arena_overlevel(
        weapon_level=weapon_level,
        required_weapon_level=required_weapon_level,
        is_boss=is_boss,
    ):
        return 100
    if is_boss:
        return min(
            ARENA_WIN_CEILING,
            ARENA_BOSS_BASE + clamp_arena_strikes(strikes) * ARENA_BOSS_PER_STRIKE,
        )
    pressure = max(0, int(monster_attack) - int(weapon_level) * 2)
    chance = ARENA_REGULAR_BASE - min(12, pressure)
    return max(ARENA_WIN_FLOOR, min(ARENA_WIN_CEILING, chance))


def resolve_arena_fight(
    *,
    weapon_level: int,
    required_weapon_level: int,
    monster_attack: int,
    is_boss: bool,
    strikes: int | None = None,
) -> tuple[bool, int]:
    """Resolve vitória/derrota e um número de rodadas só para o palco.

    Encante acima do requerimento não passa pelo sorteio. Retorna ``(won, rounds)``.
    """

    hits = clamp_arena_strikes(strikes)
    dominated = is_arena_overlevel(
        weapon_level=weapon_level,
        required_weapon_level=required_weapon_level,
        is_boss=is_boss,
    )
    chance = arena_win_chance(
        weapon_level=weapon_level,
        required_weapon_level=required_weapon_level,
        monster_attack=monster_attack,
        is_boss=is_boss,
        strikes=hits,
    )
    won = True if dominated else random.randint(1, 100) <= chance
    low, high = (5, 9) if is_boss else (2, 6)
    rounds = random.randint(low, high)
    return won, rounds
