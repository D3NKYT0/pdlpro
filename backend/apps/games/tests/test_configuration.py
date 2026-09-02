import pytest

from apps.games.application.configuration import require_active_game
from apps.games.domain.exceptions import GameInactiveError
from apps.games.infrastructure.models import GameConfig


@pytest.mark.django_db
@pytest.mark.parametrize("code", ["roulette", "daily_bonus", "dice", "slots"])
def test_game_actions_share_availability_policy(code):
    GameConfig.objects.filter(code=code).delete()
    with pytest.raises(GameInactiveError):
        require_active_game(code)
    config = GameConfig.objects.create(code=code, name=code, active=False, settings={"cost": 3})
    with pytest.raises(GameInactiveError):
        require_active_game(code)
    config.active = True
    config.save()
    assert require_active_game(code).settings == {"cost": 3}
