import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def player(db):
    return User.objects.create_user(username="hero", email="hero@pdl.dev", password="Secret123")


@pytest.fixture
def staff(db):
    return User.objects.create_user(
        username="gm",
        email="gm@pdl.dev",
        password="Secret123",
        is_staff=True,
        role=User.Role.STAFF,
    )


@pytest.mark.django_db
def test_player_cannot_access_staff_panel(api, player):
    api.force_authenticate(user=player)
    response = api.get("/api/v1/staff/panel/")
    assert response.status_code == 403


@pytest.mark.django_db
def test_staff_can_update_panel_and_services(api, staff):
    api.force_authenticate(user=staff)
    panel = api.get("/api/v1/staff/panel/")
    assert panel.status_code == 200
    saved = api.put(
        "/api/v1/staff/panel/",
        {
            "name": "Imperium",
            "chronicle": "High Five",
            "description": "Servidor de testes",
            "rates": {"xp": "x10", "sp": "x10", "adena": "x5", "drop": "x3", "spoil": "x3"},
            "enchant": {"safe": "+4", "max": "+20"},
            "max_level": 85,
            "features": ["Siege", "Olympiad"],
            "notes": {"pvp": "PvP livre", "start": "Crie a conta"},
            "coming_soon": False,
        },
        format="json",
    )
    assert saved.status_code == 200, saved.data
    assert saved.data["name"] == "Imperium"
    public = api.get("/api/v1/public/server/info/")
    assert public.data["name"] == "Imperium"
    assert public.data["rates"]["xp"] == "x10"

    prices = api.put(
        "/api/v1/staff/services/",
        [{"code": "CHANGE_NICKNAME", "name": "Nick", "price": "25.00", "active": True}],
        format="json",
    )
    assert prices.status_code == 200
    nick = next(item for item in prices.data if item["code"] == "CHANGE_NICKNAME")
    assert nick["price"] == "25.00"


@pytest.mark.django_db
def test_staff_can_update_coins_shop_and_news(api, staff):
    api.force_authenticate(user=staff)
    coins = api.put(
        "/api/v1/staff/coins/",
        {
            "name": "Gold Bar",
            "coin_id": 3470,
            "multiplier": "2.00",
            "usd_multiplier": "10.00",
            "withdraw_fee_percent": "1.50",
        },
        format="json",
    )
    assert coins.status_code == 200, coins.data
    assert coins.data["name"] == "Gold Bar"
    assert coins.data["coin_id"] == 3470

    created = api.post(
        "/api/v1/staff/shop/",
        {"name": "Espada", "item_id": 1, "price": "50.00", "quantity": 2, "active": True},
        format="json",
    )
    assert created.status_code == 200, created.data
    assert created.data["name"] == "Espada"

    news = api.post(
        "/api/v1/staff/news/",
        {"title": "Patch 1", "excerpt": "Notas", "body": "Conteúdo do patch.", "is_published": True},
        format="json",
    )
    assert news.status_code == 200, news.data
    assert news.data["title"] == "Patch 1"
    listed = api.get("/api/v1/staff/news/")
    assert listed.status_code == 200
    assert listed.data[0]["title"] == "Patch 1"


@pytest.mark.django_db
def test_me_exposes_staff_flags(api, staff):
    api.force_authenticate(user=staff)
    me = api.get("/api/v1/shared/me/")
    assert me.status_code == 200
    assert me.data["is_staff"] is True
    assert me.data["is_staff_member"] is True
