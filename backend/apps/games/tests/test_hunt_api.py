from dataclasses import replace

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.games.infrastructure.models import HuntQuest
from apps.server.domain.gateways import ILineageGateway
from apps.server.infrastructure.null_gateway import NullLineageGateway
from common.di.bootstrap import DependencyInjection

User = get_user_model()


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def player(db):
    return User.objects.create_user(username="hunter", email="hunter@pdl.dev", password="Secret123")


def _seed_character(player, **stats):
    gateway = DependencyInjection.root().resolve(ILineageGateway)
    assert isinstance(gateway, NullLineageGateway)
    return gateway.seed_character("hunter", "Caçador", **stats)


@pytest.mark.django_db
def test_hunt_reads_character_delta_and_claims_once(api, player):
    api.force_authenticate(user=player)
    api.post("/api/v1/customer/server/accounts/register/", {"password": "l2pass123"}, format="json")
    char = _seed_character(player, pvp=3, level=40, online_time=100)
    HuntQuest.objects.all().delete()
    quest = HuntQuest.objects.create(
        name="Caçada PvP",
        name_en="PvP hunt",
        metric="pvp",
        target=5,
        period="daily",
        rewards=[{"kind": "tokens", "quantity": 3}],
        active=True,
    )

    first = api.get(f"/api/v1/customer/games/hunt/?login=hunter&char_id={char.char_id}")
    assert first.status_code == 200, first.data
    assert first.data["character"]["name"] == "Caçador"
    assert first.data["character"]["sex"] == 0
    assert first.data["character"]["class_id"] == 0
    assert first.data["quests"][0]["current"] == 0
    assert first.data["quests"][0]["target"] == 5

    gateway = DependencyInjection.root().resolve(ILineageGateway)
    live = gateway.get_character("hunter", char.char_id)
    gateway._replace_character("hunter", char.char_id, replace(live, pvp=10))

    ready = api.get(f"/api/v1/customer/games/hunt/?login=hunter&char_id={char.char_id}")
    assert ready.data["quests"][0]["current"] == 7

    claimed = api.post(
        "/api/v1/customer/games/hunt/",
        {"quest_id": str(quest.id), "login": "hunter", "char_id": char.char_id},
        format="json",
    )
    assert claimed.status_code == 200, claimed.data
    assert claimed.data["quests"][0]["claimed"] is True
    player.refresh_from_db()
    assert player.fichas >= 3

    again = api.post(
        "/api/v1/customer/games/hunt/",
        {"quest_id": str(quest.id), "login": "hunter", "char_id": char.char_id},
        format="json",
    )
    assert again.status_code == 409


@pytest.mark.django_db
def test_hunt_rejects_incomplete_objective(api, player):
    api.force_authenticate(user=player)
    api.post("/api/v1/customer/server/accounts/register/", {"password": "l2pass123"}, format="json")
    char = _seed_character(player, pvp=1)
    HuntQuest.objects.all().delete()
    quest = HuntQuest.objects.create(
        name="Caçada",
        metric="pvp",
        target=20,
        period="daily",
        rewards=[{"kind": "tokens", "quantity": 1}],
        active=True,
    )
    api.get(f"/api/v1/customer/games/hunt/?login=hunter&char_id={char.char_id}")
    response = api.post(
        "/api/v1/customer/games/hunt/",
        {"quest_id": str(quest.id), "login": "hunter", "char_id": char.char_id},
        format="json",
    )
    assert response.status_code == 400
    assert "objetivo" in response.data["message"].lower()


@pytest.mark.django_db
def test_hunt_pk_metric_uses_snapshot_pk_count(api, player):
    api.force_authenticate(user=player)
    api.post("/api/v1/customer/server/accounts/register/", {"password": "l2pass123"}, format="json")
    char = _seed_character(player, pk=2)
    HuntQuest.objects.all().delete()
    HuntQuest.objects.create(
        name="Caçada PK",
        metric="pk",
        target=3,
        period="daily",
        rewards=[{"kind": "tokens", "quantity": 1}],
        active=True,
    )

    first = api.get(f"/api/v1/customer/games/hunt/?login=hunter&char_id={char.char_id}")
    assert first.status_code == 200, first.data
    assert first.data["quests"][0]["current"] == 0

    gateway = DependencyInjection.root().resolve(ILineageGateway)
    live = gateway.get_character("hunter", char.char_id)
    gateway._replace_character("hunter", char.char_id, replace(live, pk=6))

    ready = api.get(f"/api/v1/customer/games/hunt/?login=hunter&char_id={char.char_id}")
    assert ready.status_code == 200, ready.data
    assert ready.data["quests"][0]["current"] == 4


@pytest.mark.django_db
def test_hunt_rejects_unknown_character_and_quest(api, player):
    api.force_authenticate(user=player)
    api.post("/api/v1/customer/server/accounts/register/", {"password": "l2pass123"}, format="json")
    char = _seed_character(player, pvp=5)
    HuntQuest.objects.all().delete()
    HuntQuest.objects.create(
        name="Caçada",
        metric="pvp",
        target=1,
        period="daily",
        rewards=[{"kind": "tokens", "quantity": 1}],
        active=True,
    )

    missing = api.get(f"/api/v1/customer/games/hunt/?login=hunter&char_id={char.char_id + 99}")
    assert missing.status_code == 400
    assert "personagem" in missing.data["message"].lower()

    unknown = api.post(
        "/api/v1/customer/games/hunt/",
        {"quest_id": "00000000-0000-4000-8000-000000000001", "login": "hunter", "char_id": char.char_id},
        format="json",
    )
    assert unknown.status_code == 400
    assert "missão" in unknown.data["message"].lower()


@pytest.mark.django_db
def test_hunt_weekly_quest_uses_localized_name(api, player):
    api.force_authenticate(user=player)
    api.post("/api/v1/customer/server/accounts/register/", {"password": "l2pass123"}, format="json")
    char = _seed_character(player, online_time=50)
    HuntQuest.objects.all().delete()
    HuntQuest.objects.create(
        name="Semana no reino",
        name_en="Week in the realm",
        name_es="Semana en el reino",
        description="Fique online",
        description_en="Stay online",
        metric="online_time",
        target=10,
        period="weekly",
        rewards=[{"kind": "tokens", "quantity": 1}],
        active=True,
    )

    pt = api.get(f"/api/v1/customer/games/hunt/?login=hunter&char_id={char.char_id}")
    assert pt.data["quests"][0]["name"] == "Semana no reino"
    assert pt.data["quests"][0]["period"] == "weekly"

    en = api.get(
        f"/api/v1/customer/games/hunt/?login=hunter&char_id={char.char_id}",
        HTTP_X_LANGUAGE="en",
    )
    assert en.data["quests"][0]["name"] == "Week in the realm"
    assert en.data["quests"][0]["description"] == "Stay online"
