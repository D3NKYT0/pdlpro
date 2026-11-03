"""LBN-07: retomar um câmbio pendente revalida o vínculo atual da conta do jogo."""

from decimal import Decimal
from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.server.domain.gateways import ILineageGateway
from apps.wallet.infrastructure.exchange_models import GameExchange
from apps.wallet.infrastructure.models import CoinConfig, Wallet
from common.di import DependencyInjection

pytestmark = pytest.mark.django_db

URL = "/api/v1/shared/wallet/game-exchange/"


@pytest.fixture
def scenario(monkeypatch):
    owner = get_user_model().objects.create_user(username="owner", email="owner@test.dev")
    newcomer = get_user_model().objects.create_user(username="newcomer", email="newcomer@test.dev")
    Wallet.objects.create(user=owner, balance=Decimal(50))
    CoinConfig.objects.create(name="Coin", coin_id=57, multiplier=1, active=True)
    gateway = DependencyInjection.root().resolve(ILineageGateway)
    gateway.register_account("shared", "l2pass", owner.email)
    gateway.link_account("shared", str(owner.id))
    char = gateway.seed_character("shared", "Hero")
    monkeypatch.setattr(gateway, "assert_exchange_ready", lambda: None)
    calls = {"apply": [], "cancel": []}

    def fail_once(*args):
        calls["apply"].append(args)
        if len(calls["apply"]) == 1:
            raise OSError("conexão perdida")

    monkeypatch.setattr(gateway, "exchange_coins", fail_once)
    api = APIClient()
    api.force_authenticate(owner)
    return {
        "owner": owner, "newcomer": newcomer, "gateway": gateway, "char": char,
        "calls": calls, "api": api, "monkeypatch": monkeypatch,
    }


def _start(scenario, direction):
    payload = {
        "request_key": str(uuid4()), "direction": direction, "login": "shared",
        "character_id": scenario["char"].char_id, "quantity": 10,
    }
    response = scenario["api"].post(URL, payload, format="json")
    assert response.status_code == 200, response.data
    assert response.data["status"] == "pending"
    return payload


def _move_link_to_newcomer(scenario):
    scenario["gateway"].clear_account_link("shared")
    scenario["gateway"].link_account("shared", str(scenario["newcomer"].id))


def _cancel_returns(scenario, state):
    scenario["monkeypatch"].setattr(
        scenario["gateway"],
        "cancel_exchange",
        lambda receipt, reason: scenario["calls"]["cancel"].append(receipt) or state,
    )


def test_unlinked_owner_cannot_resume_an_unapplied_withdrawal(scenario):
    payload = _start(scenario, "from_game")
    _move_link_to_newcomer(scenario)
    _cancel_returns(scenario, "rejected")

    resumed = scenario["api"].post(URL, payload, format="json")

    assert resumed.status_code == 200, resumed.data
    assert resumed.data["status"] == "rejected"
    assert len(scenario["calls"]["apply"]) == 1
    assert scenario["calls"]["cancel"] == [resumed.data["id"]]
    assert Wallet.objects.get(user=scenario["owner"]).balance == 50
    replay = scenario["api"].post(URL, payload, format="json")
    assert replay.data["status"] == "rejected"
    assert len(scenario["calls"]["cancel"]) == 1


def test_withdrawal_already_applied_in_the_game_is_still_reconciled(scenario):
    payload = _start(scenario, "from_game")
    _move_link_to_newcomer(scenario)
    _cancel_returns(scenario, "completed")

    resumed = scenario["api"].post(URL, payload, format="json")

    assert resumed.data["status"] == "completed"
    assert len(scenario["calls"]["apply"]) == 1
    assert Wallet.objects.get(user=scenario["owner"]).balance == 60


def test_unlinked_owner_gets_the_reserved_deposit_back(scenario):
    payload = _start(scenario, "to_game")
    assert Wallet.objects.get(user=scenario["owner"]).balance == 40
    _move_link_to_newcomer(scenario)
    _cancel_returns(scenario, "rejected")

    resumed = scenario["api"].post(URL, payload, format="json")

    assert resumed.data["status"] == "rejected"
    assert Wallet.objects.get(user=scenario["owner"]).balance == 50
    assert len(scenario["calls"]["apply"]) == 1


def test_uncertain_cancellation_keeps_the_operation_pending(scenario):
    payload = _start(scenario, "from_game")
    _move_link_to_newcomer(scenario)

    def offline(receipt, reason):
        raise OSError("jogo indisponível")

    scenario["monkeypatch"].setattr(scenario["gateway"], "cancel_exchange", offline)

    resumed = scenario["api"].post(URL, payload, format="json")

    assert resumed.data["status"] == "pending"
    assert GameExchange.objects.get().status == "pending"
    assert Wallet.objects.get(user=scenario["owner"]).balance == 50


def test_linked_owner_resumes_normally(scenario):
    payload = _start(scenario, "from_game")
    _cancel_returns(scenario, "rejected")

    resumed = scenario["api"].post(URL, payload, format="json")

    assert resumed.data["status"] == "completed"
    assert len(scenario["calls"]["apply"]) == 2
    assert scenario["calls"]["cancel"] == []
    assert Wallet.objects.get(user=scenario["owner"]).balance == 60
