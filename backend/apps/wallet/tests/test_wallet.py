"""Transferências reais no ORM: autorização, conservação do saldo e rollback."""
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.wallet.application.use_cases import TransferToPlayerInput, TransferToPlayerUseCase
from apps.wallet.domain.entities import InsufficientBalanceError
from apps.wallet.infrastructure.models import Wallet, WalletTransaction
from apps.wallet.infrastructure.repositories import DjangoWalletRepository
from common.infrastructure.unit_of_work import DjangoUnitOfWork

pytestmark = pytest.mark.django_db


@pytest.fixture
def accounts():
    users = [get_user_model().objects.create_user(username=name, email=f"{name}@test.dev") for name in ("sender", "recipient")]
    Wallet.objects.create(user=users[0], balance=Decimal("50"), bonus_balance=Decimal("100"))
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
    assert sender.balance + recipient.balance == Decimal("50")
    assert recipient.balance == Decimal(amount)
    assert sender.bonus_balance == Decimal("100")
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
    repo = DjangoWalletRepository()
    def unavailable(*args, **kwargs):
        raise RuntimeError("credit unavailable")
    monkeypatch.setattr(repo, "credit", unavailable)
    case = TransferToPlayerUseCase(repo, DjangoUnitOfWork())
    with pytest.raises(RuntimeError, match="credit unavailable"):
        case.execute(TransferToPlayerInput(accounts[0].id, "recipient", Decimal("10")))
    assert Wallet.objects.get(user=accounts[0]).balance == 50
    assert not WalletTransaction.objects.exists()
    assert not Wallet.objects.filter(user=accounts[1]).exists()


def test_repository_rechecks_balance_at_debit_time(accounts):
    wallet = Wallet.objects.get(user=accounts[0])
    repo = DjangoWalletRepository()
    repo.debit(wallet.id, Decimal("50"), destination="test", description="Primeiro débito")
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
    assert api.get("/api/v1/shared/wallet/transactions/").data == {"results": []}


@pytest.mark.parametrize("method,path", [("get", ""), ("get", "transactions/"), ("post", "transfer/")])
def test_wallet_requires_authentication(method, path):
    response = getattr(APIClient(), method)(f"/api/v1/shared/wallet/{path}")
    assert response.status_code in (401, 403)
    assert not WalletTransaction.objects.exists()
