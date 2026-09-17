import pytest

from apps.games.application.configuration import require_active_game
from apps.games.domain.arena_roster import ARENA_BOSS, ARENA_MONSTERS, ARENA_WEAPON_MAX, is_arena_boss
from apps.games.domain.exceptions import GameInactiveError
from apps.games.domain.repositories import IGameCatalogRepository
from apps.games.infrastructure.models import GameConfig
from common.di.bootstrap import DependencyInjection


def test_arena_roster_has_ten_distinct_beasts():
    names = [row[0] for row in ARENA_MONSTERS]
    assert names == [
        "Elder Keltir",
        "Wolf",
        "Goblin",
        "Orc",
        "Lizardman",
        "Ant Recruit",
        "Werewolf",
        "Ogre",
        "Drake",
        "Death Knight",
    ]
    assert len(set(names)) == 10


def test_arena_boss_is_queen_ant_at_weapon_max():
    assert ARENA_BOSS[0] == "Queen Ant"
    assert ARENA_BOSS[2] == ARENA_WEAPON_MAX
    assert ARENA_BOSS[3] == 0
    assert ARENA_BOSS[0] not in [row[0] for row in ARENA_MONSTERS]

    class Marked:
        is_boss = True

    assert is_arena_boss(Marked()) is True
    assert is_arena_boss(object()) is False


@pytest.mark.django_db
@pytest.mark.parametrize("code", ["roulette", "daily_bonus", "dice", "slots"])
def test_game_actions_share_availability_policy(code):
    catalog = DependencyInjection.root().create_scope().resolve(IGameCatalogRepository)
    GameConfig.objects.filter(code=code).delete()
    with pytest.raises(GameInactiveError):
        require_active_game(code, catalog=catalog)
    config = GameConfig.objects.create(code=code, name=code, active=False, settings={"cost": 3})
    with pytest.raises(GameInactiveError):
        require_active_game(code, catalog=catalog)
    config.active = True
    config.save()
    assert require_active_game(code, catalog=catalog).settings == {"cost": 3}
