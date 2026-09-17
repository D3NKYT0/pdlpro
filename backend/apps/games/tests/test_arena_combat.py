from apps.games.domain.arena_combat import (
    ARENA_STRIKE_MAX,
    arena_win_chance,
    clamp_arena_strikes,
    resolve_arena_fight,
)


def test_regular_fight_is_never_guaranteed():
    chance = arena_win_chance(
        weapon_level=0,
        required_weapon_level=0,
        monster_attack=3,
        is_boss=False,
    )
    assert ARENA_STRIKE_MAX == 5
    assert 50 <= chance < 80
    farmed = arena_win_chance(
        weapon_level=10,
        required_weapon_level=0,
        monster_attack=3,
        is_boss=False,
    )
    assert farmed <= 90
    assert farmed < 100


def test_boss_strikes_raise_win_chance():
    miss = arena_win_chance(
        weapon_level=10,
        required_weapon_level=10,
        monster_attack=48,
        is_boss=True,
        strikes=0,
    )
    perfect = arena_win_chance(
        weapon_level=10,
        required_weapon_level=10,
        monster_attack=48,
        is_boss=True,
        strikes=5,
    )
    overflow = arena_win_chance(
        weapon_level=10,
        required_weapon_level=10,
        monster_attack=48,
        is_boss=True,
        strikes=99,
    )
    assert miss < perfect
    assert perfect == overflow
    assert clamp_arena_strikes(-3) == 0
    assert clamp_arena_strikes(None) == 0


def test_resolve_arena_fight_uses_the_luck_roll(monkeypatch):
    rolls = iter([1, 4, 100, 6])

    def fake_randint(low, high):
        return next(rolls)

    monkeypatch.setattr("apps.games.domain.arena_combat.random.randint", fake_randint)
    won, rounds = resolve_arena_fight(
        weapon_level=3,
        required_weapon_level=1,
        monster_attack=10,
        is_boss=False,
    )
    assert won is True
    assert rounds == 4
    lost, lost_rounds = resolve_arena_fight(
        weapon_level=3,
        required_weapon_level=1,
        monster_attack=10,
        is_boss=False,
    )
    assert lost is False
    assert lost_rounds == 6
