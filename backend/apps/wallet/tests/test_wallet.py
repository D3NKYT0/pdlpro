"""Transferências reais no ORM: autorização, conservação do saldo e rollback."""
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.domain.repositories import IUserRepository
from apps.wallet.application.use_cases import (
    TransferToPlayerInput,
    TransferToPlayerUseCase,
)
from apps.wallet.domain.entities import InsufficientBalanceError
from apps.wallet.domain.repositories import IWalletRepository
from apps.wallet.infrastructure.models import Wallet, WalletTransaction
from common.di import DependencyInjection
from common.infrastructure.unit_of_work import DjangoUnitOfWork

pytestmark = pytest.mark.django_db


@pytest.fixture
def accounts():
    users = [get_user_model().objects.create_user(username=name, email=f"{name}@test.dev") for name in ("sender", "recipient")]
    Wallet.objects.create(user=users[0], balance=Decimal(50), bonus_balance=Decimal(100))
    return users


@pytest.fixture
def api(accounts):
    client = APIClient()
    client.force_authenticate(accounts[0])
    return client


@pytest.mark.parametrize("amount,expected", [("0.01", "49.99"), ("50.00", "0.00"), ("12.34", "37.66")])
def test_transfer_conserves_main_balance_and_records_both_sides(api, accounts, amount, expected):
    response = api.post("/api/v1/shared/wallet/transfer/", {
        "recipient_username": "RECIPIENT", "amount": amount, "description": "Presente",
        "sender_id": str(accounts[1].id),
    }, format="json")
    assert response.status_code == 200, response.data
    assert response.data["balance"] == expected
    sender, recipient = [Wallet.objects.get(user=user) for user in accounts]
    assert sender.balance + recipient.balance == Decimal(50)
    assert recipient.balance == Decimal(amount)
    assert sender.bonus_balance == Decimal(100)
    assert recipient.bonus_balance == 0
    assert list(sender.transactions.values_list("kind", "amount", "description")) == [("SAIDA", Decimal(amount), "Presente")]
    assert list(recipient.transactions.values_list("kind", "amount", "description")) == [("ENTRADA", Decimal(amount), "Presente")]


@pytest.mark.parametrize("amount", ["0", "-1", "50.01", "100", "abc", "1.001", "NaN", "Infinity"])
def test_invalid_transfer_does_not_change_balances_or_ledger(api, accounts, amount):
    response = api.post("/api/v1/shared/wallet/transfer/", {"recipient_username": "recipient", "amount": amount}, format="json")
    assert response.status_code == 400, response.data
    assert Wallet.objects.get(user=accounts[0]).balance == 50
    assert not WalletTransaction.objects.exists()


@pytest.mark.parametrize("recipient", ["sender", "SENDER", "missing"])
def test_recipient_must_exist_and_differ_from_sender(api, recipient):
    response = api.post("/api/v1/shared/wallet/transfer/", {"recipient_username": recipient, "amount": "10"}, format="json")
    assert response.status_code == 400
    assert not WalletTransaction.objects.exists()


def test_transfer_rolls_back_debit_when_credit_fails(accounts, monkeypatch):
    scope = DependencyInjection.root().create_scope()
    repo = scope.resolve(IWalletRepository)
    users = scope.resolve(IUserRepository)
    def unavailable(*args, **kwargs):
        raise RuntimeError("credit unavailable")
    monkeypatch.setattr(repo, "credit", unavailable)
    case = TransferToPlayerUseCase(repo, users, DjangoUnitOfWork())
    with pytest.raises(RuntimeError, match="credit unavailable"):
        case.execute(TransferToPlayerInput(accounts[0].id, "recipient", Decimal(10)))
    assert Wallet.objects.get(user=accounts[0]).balance == 50
    assert not WalletTransaction.objects.exists()
    assert not Wallet.objects.filter(user=accounts[1]).exists()


def test_repository_rechecks_balance_at_debit_time(accounts):
    wallet = Wallet.objects.get(user=accounts[0])
    repo = DependencyInjection.root().create_scope().resolve(IWalletRepository)
    repo.debit(wallet.id, Decimal(50), destination="test", description="Primeiro débito")
    with pytest.raises(InsufficientBalanceError):
        repo.debit(wallet.id, Decimal("0.01"), destination="test", description="Saldo esgotado")
    wallet.refresh_from_db()
    assert wallet.balance == 0
    assert wallet.transactions.count() == 1


def test_wallet_get_is_idempotent_and_transactions_are_private(api, accounts):
    for _ in range(2):
        assert api.get("/api/v1/shared/wallet/").status_code == 200
    assert Wallet.objects.filter(user=accounts[0]).count() == 1
    other = Wallet.objects.create(user=accounts[1])
    WalletTransaction.objects.create(wallet=other, kind="ENTRADA", amount=99, description="Privado")
    listed = api.get("/api/v1/shared/wallet/transactions/").data
    assert listed["results"] == []
    assert listed["count"] == 0


def test_wallet_transactions_are_paginated(api, accounts):
    wallet = Wallet.objects.get(user=accounts[0])
    for index in range(3):
        WalletTransaction.objects.create(wallet=wallet, kind="ENTRADA", amount=index + 1, description=f"Tx {index}")
    response = api.get("/api/v1/shared/wallet/transactions/", {"page_size": 2})
    assert response.status_code == 200
    assert response.data["count"] == 3
    assert response.data["total_pages"] == 2
    assert len(response.data["results"]) == 2
    assert "created_at" in response.data["results"][0]


@pytest.mark.parametrize("method,path", [("get", ""), ("get", "transactions/"), ("post", "transfer/")])
def test_wallet_requires_authentication(method, path):
    response = getattr(APIClient(), method)(f"/api/v1/shared/wallet/{path}")
    assert response.status_code in (401, 403)
    assert not WalletTransaction.objects.exists()


def test_game_exchange_state_returns_coin_and_empty_history(api, accounts, settings):
    from apps.wallet.infrastructure.models import CoinConfig

    settings.LINEAGE_DB_ENABLED = False
    CoinConfig.objects.create(
        name="Adena",
        coin_id=57,
        multiplier="1.00",
        withdraw_fee_percent="5.00",
        active=True,
    )
    response = api.get("/api/v1/shared/wallet/game-exchange/")
    assert response.status_code == 200, response.data
    assert response.data["enabled"] is False
    assert response.data["unavailable_reason"]
    assert response.data["coin"] == {
        "name": "Adena",
        "item_id": 57,
        "multiplier": "1.00",
        "usd_multiplier": "5.00",
        "withdraw_fee_percent": "5.00",
    }
    assert response.data["history"] == []


@pytest.mark.parametrize("enabled,direction,allowed", [(False, "to_game", False), (True, "to_game", True), (True, "from_game", False)])
def test_online_coin_api_obeys_policy_and_never_double_debits(api, accounts, settings, monkeypatch, enabled, direction, allowed):
    from dataclasses import replace
    from uuid import uuid4

    from apps.server.domain.gateways import ILineageGateway
    from apps.wallet.infrastructure.exchange_models import GameExchange
    from apps.wallet.infrastructure.models import CoinConfig

    settings.LINEAGE_ALLOW_ONLINE_DELIVERY = enabled
    gateway = DependencyInjection.root().resolve(ILineageGateway)
    gateway.register_account("sender", "l2pass", accounts[0].email)
    gateway.link_account("sender", str(accounts[0].id))
    char = gateway.seed_character("sender", "Hero")
    gateway._characters["sender"][0] = replace(char, online=True)
    CoinConfig.objects.create(name="Coin", coin_id=57, multiplier=1, active=True)
    monkeypatch.setattr(gateway, "assert_exchange_ready", lambda: None)
    receipts = set()
    monkeypatch.setattr(gateway, "exchange_coins", lambda receipt, *args: receipts.add(receipt))
    payload = {"request_key": str(uuid4()), "direction": direction, "login": "sender", "character_id": char.char_id, "quantity": 10}
    response = api.post("/api/v1/shared/wallet/game-exchange/", payload, format="json")
    assert response.status_code == (200 if allowed else 400), response.data
    if allowed:
        assert response.data["status"] == "completed"
        replay = api.post("/api/v1/shared/wallet/game-exchange/", payload, format="json")
        assert replay.data["id"] == response.data["id"]
        assert len(receipts) == 1
        assert GameExchange.objects.count() == 1
    else:
        assert not receipts
        assert not GameExchange.objects.exists()
    wallet = Wallet.objects.get(user=accounts[0])
    assert wallet.balance == (40 if allowed else 50)
    assert wallet.bonus_balance == 100
    state = api.get("/api/v1/shared/wallet/game-exchange/").data
    assert state["allow_online_delivery"] is enabled


@pytest.mark.parametrize("cause", ["ownership", "balance", "quantity"])
def test_online_coin_api_rejects_invalid_input_without_reserving_balance(api, accounts, settings, monkeypatch, cause):
    from dataclasses import replace
    from uuid import uuid4

    from apps.server.domain.gateways import ILineageGateway
    from apps.wallet.infrastructure.exchange_models import GameExchange
    from apps.wallet.infrastructure.models import CoinConfig

    settings.LINEAGE_ALLOW_ONLINE_DELIVERY = True
    gateway = DependencyInjection.root().resolve(ILineageGateway)
    gateway.register_account("sender", "l2pass", accounts[0].email)
    gateway.link_account("sender", str(accounts[0].id))
    char = gateway.seed_character("sender", "Hero")
    gateway._characters["sender"][0] = replace(char, online=True)
    CoinConfig.objects.create(name="Coin", coin_id=57, multiplier=1, active=True)
    monkeypatch.setattr(gateway, "assert_exchange_ready", lambda: None)
    calls = []
    monkeypatch.setattr(gateway, "exchange_coins", lambda *args: calls.append(args))
    payload = {"request_key": str(uuid4()), "direction": "to_game", "login": "other" if cause == "ownership" else "sender", "character_id": char.char_id, "quantity": 0 if cause == "quantity" else 51 if cause == "balance" else 10}
    response = api.post("/api/v1/shared/wallet/game-exchange/", payload, format="json")
    assert response.status_code == 400, response.data
    assert not calls
    assert not GameExchange.objects.exists()
    assert Wallet.objects.get(user=accounts[0]).balance == 50


@pytest.mark.parametrize("name, expected", [("Banco Cliente A", "Banco Cliente A"), ("Carteira Cliente B", "Carteira Cliente B"), ("  Meu Banco  ", "Meu Banco"), ("", ""), ("   ", "")])
def test_wallet_exposes_installation_display_name_without_changing_balances(api, accounts, settings, name, expected):
    settings.WALLET_DISPLAY_NAME = name
    response = api.get("/api/v1/shared/wallet/")
    assert response.status_code == 200
    assert response.data["display_name"] == expected
    assert response.data["balance"] == "50.00"
    assert response.data["bonus_balance"] == "100.00"
    assert response.data["id"] == str(Wallet.objects.get(user=accounts[0]).id)
