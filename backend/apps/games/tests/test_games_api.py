from datetime import date
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.communication.infrastructure.models import Notification
from apps.games.infrastructure.models import DailyBonusClaim, GameConfig, Prize
from apps.wallet.infrastructure.models import Wallet

User = get_user_model()


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def player(db):
    return User.objects.create_user(username="gamer1", email="gamer1@pdl.dev", password="Secret123")


@pytest.mark.django_db
def test_public_world_query_returns_empty_without_lineage(api):
    response = api.get("/api/v1/public/server/world/olympiad_ranking/")
    assert response.status_code == 200
    assert response.data == []


@pytest.mark.django_db
def test_public_world_query_rejects_unknown_name(api):
    response = api.get("/api/v1/public/server/world/drop_all/")
    assert response.status_code == 400


@pytest.mark.django_db
def test_notifications_list_and_mark_read(api, player):
    other = User.objects.create_user(username="other1", email="other1@pdl.dev", password="Secret123")
    mine = Notification.objects.create(user=player, title="Bem-vindo", body="Painel 2.0", kind="info")
    Notification.objects.create(user=other, title="Alheia", body="Não deve aparecer")
    api.force_authenticate(user=player)
    listed = api.get("/api/v1/customer/notifications/")
    assert listed.status_code == 200
    assert listed.data["unread"] == 1
    assert listed.data["results"][0]["title"] == "Bem-vindo"
    marked = api.post(f"/api/v1/customer/notifications/{mine.id}/read/")
    assert marked.status_code == 200
    assert marked.data["is_read"] is True
    listed = api.get("/api/v1/customer/notifications/")
    assert listed.data["unread"] == 0


@pytest.mark.django_db
def test_daily_bonus_credits_wallet_once(api, player):
    GameConfig.objects.update_or_create(
        code="daily_bonus",
        defaults={"name": "Bônus diário", "active": True, "settings": {"amount": "10.00"}},
    )
    api.force_authenticate(user=player)
    first = api.post("/api/v1/customer/games/daily-bonus/")
    assert first.status_code == 200, first.data
    assert first.data["amount"] == "10.00"
    wallet = api.get("/api/v1/shared/wallet/")
    assert wallet.data["balance"] == "10.00"
    second = api.post("/api/v1/customer/games/daily-bonus/")
    assert second.status_code == 409
    state = api.get("/api/v1/customer/games/daily-bonus/")
    assert state.data["claimed"] is True
    assert DailyBonusClaim.objects.filter(user=player, claimed_on=date.today()).count() == 1


@pytest.mark.django_db
def test_buy_tokens_and_spin_roulette(api, player):
    GameConfig.objects.update_or_create(
        code="roulette",
        defaults={"name": "Roleta", "active": True, "settings": {"cost": 1, "fail_chance": 0}},
    )
    Prize.objects.create(name="Adena", item_id=57, weight=10, rarity="comum")
    Wallet.objects.create(user=player, balance=Decimal("20.00"))
    api.force_authenticate(user=player)
    bought = api.post("/api/v1/customer/games/tokens/", {"amount": 5}, format="json")
    assert bought.status_code == 200, bought.data
    assert bought.data["fichas"] == 5
    spin = api.post("/api/v1/customer/games/roulette/")
    assert spin.status_code == 200, spin.data
    assert spin.data["failed"] is False
    assert spin.data["prize"]["name"] == "Adena"
    bag = api.get("/api/v1/customer/games/bag/")
    assert bag.status_code == 200
    assert bag.data[0]["item_name"] == "Adena"
    assert bag.data[0]["quantity"] == 1
