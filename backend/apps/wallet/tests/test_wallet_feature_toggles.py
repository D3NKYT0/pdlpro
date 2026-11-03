"""Recursos da carteira que a equipe desliga: a API recusa mesmo sem passar pela tela."""

from decimal import Decimal
from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.server.domain.gateways import ILineageGateway
from apps.wallet.infrastructure.exchange_models import GameExchange
from apps.wallet.infrastructure.models import CoinConfig, Wallet, WalletTransaction
from common.di import DependencyInjection

pytestmark = pytest.mark.django_db


@pytest.fixture
def players():
    users = [get_user_model().objects.create_user(username=name, email=f"{name}@test.dev") for name in ("sender", "recipient")]
    Wallet.objects.create(user=users[0], balance=Decimal(50))
    return users


def _client(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.mark.parametrize("enabled", [True, False])
def test_player_transfer_follows_the_admin_switch(players, settings, enabled):
    settings.WALLET_PLAYER_TRANSFER_ENABLED = enabled
    api = _client(players[0])

    response = api.post("/api/v1/shared/wallet/transfer/", {"recipient_username": "recipient", "amount": "10"}, format="json")

    assert response.status_code == (200 if enabled else 400), response.data
    assert api.get("/api/v1/shared/wallet/").data["transfer_enabled"] is enabled
    assert Wallet.objects.get(user=players[0]).balance == (40 if enabled else 50)
    if not enabled:
        assert not WalletTransaction.objects.exists()


@pytest.fixture
def exchange(players, monkeypatch):
    gateway = DependencyInjection.root().resolve(ILineageGateway)
    gateway.register_account("sender", "l2pass", players[0].email)
    gateway.link_account("sender", str(players[0].id))
    char = gateway.seed_character("sender", "Hero")
    CoinConfig.objects.create(name="Item 65214", coin_id=65214, multiplier=1, active=True)
    monkeypatch.setattr(gateway, "assert_exchange_ready", lambda: None)
    calls = []
    monkeypatch.setattr(gateway, "exchange_coins", lambda *args: calls.append(args))
    return char, calls


def _exchange(user, char, direction, key=None):
    return _client(user).post("/api/v1/shared/wallet/game-exchange/", {
        "request_key": key or str(uuid4()), "direction": direction, "login": "sender",
        "character_id": char.char_id, "quantity": 10,
    }, format="json")


def test_disabled_game_withdrawal_is_refused_but_deposit_still_works(players, settings, exchange):
    settings.WALLET_GAME_WITHDRAW_ENABLED = False
    char, calls = exchange

    assert _exchange(players[0], char, "from_game").status_code == 400
    assert not GameExchange.objects.exists()
    assert not calls
    assert _exchange(players[0], char, "to_game").status_code == 200
    assert _client(players[0]).get("/api/v1/shared/wallet/game-exchange/").data["allow_withdraw"] is False


def test_pending_withdrawal_can_still_be_resumed_after_the_switch_is_turned_off(players, settings, exchange, monkeypatch):
    char, calls = exchange
    gateway = DependencyInjection.root().resolve(ILineageGateway)

    def offline(*args):
        raise OSError("sem conexão")

    monkeypatch.setattr(gateway, "exchange_coins", offline)
    key = str(uuid4())
    assert _exchange(players[0], char, "from_game", key).data["status"] == "pending"
    settings.WALLET_GAME_WITHDRAW_ENABLED = False
    monkeypatch.setattr(gateway, "exchange_coins", lambda *args: calls.append(args))

    resumed = _exchange(players[0], char, "from_game", key)

    assert resumed.status_code == 200
    assert resumed.data["status"] == "completed"


def test_coin_item_id_is_only_shown_to_staff(players, exchange):
    player_view = _client(players[0]).get("/api/v1/shared/wallet/game-exchange/").data["coin"]
    staff = get_user_model().objects.create_user(username="staffer", email="staffer@test.dev", is_staff=True)
    staff_view = _client(staff).get("/api/v1/shared/wallet/game-exchange/").data["coin"]

    assert "item_id" not in player_view
    assert "65214" not in player_view["name"]
    assert staff_view["item_id"] == 65214
    assert staff_view["name"] == "Item 65214"
