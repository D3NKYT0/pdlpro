from apps.games.domain.arena_combat import (
    ARENA_CRIT_MULT,
    ARENA_PLAYER_CRIT_CHANCE,
    ARENA_STRIKE_MAX,
    ArenaHit,
    apply_arena_damage,
    arena_player_stats,
    arena_win_chance,
    clamp_arena_strikes,
    is_arena_overlevel,
    resolve_arena_fight,
    resolve_arena_round,
    roll_arena_hit,
)


def test_even_enchant_can_lose_overlevel_always_wins():
    even = arena_win_chance(
        weapon_level=1,
        required_weapon_level=1,
        monster_attack=6,
        is_boss=False,
    )
    plus_one = arena_win_chance(
        weapon_level=2,
        required_weapon_level=1,
        monster_attack=6,
        is_boss=False,
    )
    keltir = arena_win_chance(
        weapon_level=1,
        required_weapon_level=0,
        monster_attack=3,
        is_boss=False,
    )
    farmed = arena_win_chance(
        weapon_level=10,
        required_weapon_level=0,
        monster_attack=3,
        is_boss=False,
    )
    assert ARENA_STRIKE_MAX == 5
    assert 74 <= even < 100
    assert even >= 80
    assert plus_one == 100
    assert keltir == 100
    assert farmed == 100
    assert is_arena_overlevel(weapon_level=1, required_weapon_level=0, is_boss=False)
    assert not is_arena_overlevel(weapon_level=1, required_weapon_level=1, is_boss=False)


def test_boss_uses_hit_points_and_can_crit(monkeypatch):
    hp, attack, defense = arena_player_stats(10)
    assert hp == 270
    assert attack == 108
    assert defense == 22
    assert apply_arena_damage(480, 90) == 390
    assert apply_arena_damage(40, 90) == 0

    rolls = iter([80, 1, 40, 50])

    def fake_randint(low, high):
        return next(rolls)

    monkeypatch.setattr("apps.games.domain.arena_combat.random.randint", fake_randint)
    crit = roll_arena_hit(attack=108, defense=28, crit_chance=ARENA_PLAYER_CRIT_CHANCE)
    normal = roll_arena_hit(attack=48, defense=22, crit_chance=12)
    assert crit.crit is True
    assert crit.damage == 80 * ARENA_CRIT_MULT
    assert normal.crit is False
    assert normal.damage == 40
    assert ARENA_STRIKE_MAX == 5
    assert clamp_arena_strikes(-3) == 0
    assert clamp_arena_strikes(None) == 0
    assert (
        arena_win_chance(
            weapon_level=10,
            required_weapon_level=10,
            monster_attack=48,
            is_boss=True,
        )
        == 0
    )


def test_resolve_arena_round_player_can_crit_and_stop_the_boss(monkeypatch):
    hits = [ArenaHit(damage=200, crit=True)]

    def fake_roll(*, attack, defense, crit_chance):
        assert hits
        return hits.pop(0)

    monkeypatch.setattr("apps.games.domain.arena_combat.roll_arena_hit", fake_roll)
    outcome = resolve_arena_round(
        player_hp=270,
        player_attack=108,
        player_defense=22,
        boss_hp=180,
        boss_attack=48,
        boss_defense=28,
    )
    assert outcome.player_hit.crit is True
    assert outcome.player_hit.damage == 200
    assert outcome.boss_hit is None
    assert outcome.boss_hp == 0
    assert outcome.player_hp == 270


def test_resolve_arena_round_lets_the_boss_reply(monkeypatch):
    hits = [ArenaHit(damage=40, crit=False), ArenaHit(damage=90, crit=True)]

    def fake_roll(*, attack, defense, crit_chance):
        return hits.pop(0)

    monkeypatch.setattr("apps.games.domain.arena_combat.roll_arena_hit", fake_roll)
    outcome = resolve_arena_round(
        player_hp=270,
        player_attack=108,
        player_defense=22,
        boss_hp=480,
        boss_attack=48,
        boss_defense=28,
    )
    assert outcome.player_hit.crit is False
    assert outcome.boss_hit is not None
    assert outcome.boss_hit.crit is True
    assert outcome.boss_hp == 440
    assert outcome.player_hp == 180


def test_resolve_arena_fight_uses_the_luck_roll(monkeypatch):
    rolls = iter([1, 4, 100, 6])

    def fake_randint(low, high):
        return next(rolls)

    monkeypatch.setattr("apps.games.domain.arena_combat.random.randint", fake_randint)
    won, rounds = resolve_arena_fight(
        weapon_level=3,
        required_weapon_level=3,
        monster_attack=10,
        is_boss=False,
    )
    assert won is True
    assert rounds == 4
    lost, lost_rounds = resolve_arena_fight(
        weapon_level=3,
        required_weapon_level=3,
        monster_attack=10,
        is_boss=False,
    )
    assert lost is False
    assert lost_rounds == 6


def test_resolve_overleveled_fight_ignores_a_bad_roll(monkeypatch):
    rolls: list[tuple[int, int]] = []

    def fake_randint(low, high):
        rolls.append((low, high))
        return high

    monkeypatch.setattr("apps.games.domain.arena_combat.random.randint", fake_randint)
    won, rounds = resolve_arena_fight(
        weapon_level=1,
        required_weapon_level=0,
        monster_attack=3,
        is_boss=False,
    )
    assert won is True
    assert rounds == 6
    assert (1, 100) not in rolls
