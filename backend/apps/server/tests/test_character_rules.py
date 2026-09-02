from unittest.mock import Mock

import pytest

from apps.server.domain.exceptions import CharacterOfflineRequiredError, GameAccountNotFoundError
from apps.server.domain.gateways import GameCharacter
from apps.server.infrastructure.null_gateway import NullLineageGateway
from apps.server.infrastructure.sqlalchemy_gateway import SqlAlchemyLineageGateway


@pytest.mark.parametrize("adapter", [NullLineageGateway, SqlAlchemyLineageGateway])
@pytest.mark.parametrize("state", ["missing", "online", "offline"])
def test_adapters_apply_same_offline_rule_without_changing_lookup(adapter, state):
    gateway = object.__new__(adapter)
    character = None if state == "missing" else GameCharacter(7, "Hero", 80, state == "online", 99)
    gateway.get_character = Mock(return_value=character)
    if state == "offline":
        assert gateway._require_offline("account", 7) is character
    else:
        error = GameAccountNotFoundError if state == "missing" else CharacterOfflineRequiredError
        with pytest.raises(error):
            gateway._require_offline("account", 7)
    gateway.get_character.assert_called_once_with("account", 7)
