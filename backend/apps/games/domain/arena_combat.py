from __future__ import annotations

"""Resolução de combate da arena.

Nas feras comuns, encante acima do requerimento vence sempre; no mesmo nível o
sorteio decide. O chefe é luta de HP com crítico. Sem Django.
"""

import random
from dataclasses import dataclass

ARENA_STRIKE_MAX = 5
ARENA_WIN_FLOOR = 74
ARENA_WIN_CEILING = 92
ARENA_REGULAR_BASE = 88
ARENA_PLAYER_CRIT_CHANCE = 18
ARENA_BOSS_CRIT_CHANCE = 12
ARENA_CRIT_MULT = 2


@dataclass(frozen=True, slots=True)
class ArenaHit:
    """Um golpe resolvido: dano aplicado e se foi crítico."""

    damage: int
    crit: bool


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
) -> int:
    """Chance percentual de vitória das feras comuns, entre piso e teto.

    Encante acima do requerimento: ``100``. Mesmo encante: sorteio favorável
    (a luta gasta ficha). O chefe não usa esta chance — resolve por HP.
    """

    if is_boss:
        return 0
    if is_arena_overlevel(
        weapon_level=weapon_level,
        required_weapon_level=required_weapon_level,
        is_boss=is_boss,
    ):
        return 100
    pressure = max(0, int(monster_attack) - int(weapon_level) * 2)
    chance = ARENA_REGULAR_BASE - min(12, pressure)
    return max(ARENA_WIN_FLOOR, min(ARENA_WIN_CEILING, chance))


def resolve_arena_fight(
    *,
    weapon_level: int,
    required_weapon_level: int,
    monster_attack: int,
    is_boss: bool,
) -> tuple[bool, int]:
    """Resolve vitória/derrota e um número de rodadas só para o palco.

    Encante acima do requerimento não passa pelo sorteio. Retorna ``(won, rounds)``.
    """

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
    )
    won = True if dominated else random.randint(1, 100) <= chance
    rounds = random.randint(2, 6)
    return won, rounds


def arena_player_stats(weapon_level: int) -> tuple[int, int, int]:
    """HP, ataque e defesa do jogador a partir do encante da arma."""

    level = max(0, min(10, int(weapon_level)))
    hp = 210 + level * 6
    attack = 48 + level * 6
    defense = 12 + level
    return hp, attack, defense


def roll_arena_hit(*, attack: int, defense: int, crit_chance: int) -> ArenaHit:
    """Calcula dano de um golpe, com chance de crítico."""

    base = max(12, int(attack) - int(defense) // 2)
    spread = max(3, base // 6)
    damage = random.randint(base - spread, base + spread)
    crit = random.randint(1, 100) <= max(0, min(100, int(crit_chance)))
    if crit:
        damage *= ARENA_CRIT_MULT
    return ArenaHit(damage=max(1, int(damage)), crit=bool(crit))


def apply_arena_damage(hp: int, damage: int) -> int:
    """Aplica dano e nunca deixa a vida negativa."""

    return max(0, int(hp) - max(0, int(damage)))


@dataclass(frozen=True, slots=True)
class ArenaRound:
    """Uma rodada do chefe: golpe do jogador e resposta, se o chefe ainda estiver de pé."""

    player_hit: ArenaHit
    boss_hit: ArenaHit | None
    player_hp: int
    boss_hp: int


def resolve_arena_round(
    *,
    player_hp: int,
    player_attack: int,
    player_defense: int,
    boss_hp: int,
    boss_attack: int,
    boss_defense: int,
) -> ArenaRound:
    """Jogador golpeia; o chefe só responde se sobreviver ao golpe."""

    player_hit = roll_arena_hit(
        attack=player_attack,
        defense=boss_defense,
        crit_chance=ARENA_PLAYER_CRIT_CHANCE,
    )
    boss_hp = apply_arena_damage(boss_hp, player_hit.damage)
    boss_hit = None
    if boss_hp > 0:
        boss_hit = roll_arena_hit(
            attack=boss_attack,
            defense=player_defense,
            crit_chance=ARENA_BOSS_CRIT_CHANCE,
        )
        player_hp = apply_arena_damage(player_hp, boss_hit.damage)
    return ArenaRound(
        player_hit=player_hit,
        boss_hit=boss_hit,
        player_hp=int(player_hp),
        boss_hp=int(boss_hp),
    )
