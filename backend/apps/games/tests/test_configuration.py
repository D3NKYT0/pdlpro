import pytest

from apps.games.application.configuration import require_active_game
from apps.games.domain.exceptions import GameInactiveError
from apps.games.domain.repositories import IGameCatalogRepository
from apps.games.infrastructure.models import GameConfig
from common.di.bootstrap import DependencyInjection


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
