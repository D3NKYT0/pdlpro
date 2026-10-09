"""Contratos da política inicial e configuração administrativa, sem servidor de jogo."""

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.infrastructure.models import User
from apps.server.domain.character_creation import (
    CharacterStart,
    normalize_creation,
    resolve_start,
)
from apps.server.domain.gateways import ILineageGateway
from apps.server.infrastructure.models import IndexConfig
from common.architecture.exceptions import ValidationDomainError
from common.di.bootstrap import DependencyInjection


def test_profiles_inherit_general_and_class_replaces_items():
    raw = {
        "default": {
            "level": 20,
            "xp": "9007199254740993",
            "sp": "900",
            "items": [{"item_id": 57, "quantity": 100}],
        },
        "classes": {"10": {"items": [{"item_id": 100, "enchant": 3, "slot": 7}]}},
    }
    assert resolve_start(raw, 0).items[0].item_id == 57
    mage = resolve_start(raw, 10)
    assert mage.level == 20 and mage.xp == 9007199254740993
    assert [(item.item_id, item.slot) for item in mage.items] == [(100, 7)]
    assert normalize_creation(raw)["default"]["xp"] == "9007199254740993"
    assert resolve_start({}, 0) == CharacterStart()


@pytest.mark.parametrize(
    "profile",
    [
        {"level": 0},
        {"level": 81},
        {"xp": "-1"},
        {"xp": "9223372036854775808"},
        {"sp": "2147483648"},
        {"sp": True},
        {"level": 2.5},
        {"xp": "1e9"},
        {"title": "x" * 17},
        {"title": "bad\ntitle"},
        {"x": 2147483648},
        {"unknown": 1},
        {"items": {}},
        {"items": [None]},
        {"items": [{"item_id": 0}]},
        {"items": [{"item_id": 57, "quantity": 0}]},
        {"items": [{"item_id": 57, "enchant": -1}]},
        {"items": [{"item_id": 57, "slot": 32}]},
        {"items": [{"item_id": 57, "quantity": 2, "slot": 7}]},
        {"items": [{"item_id": 57, "slot": 7}, {"item_id": 58, "slot": 7}]},
        {"items": [{"item_id": 57}] * 101},
    ],
)
def test_invalid_profiles_are_rejected(profile):
    with pytest.raises(ValidationDomainError):
        normalize_creation({"default": profile})


@pytest.mark.parametrize(
    "raw",
    [
        [],
        {"classes": []},
        {"classes": {"99": {}}},
        {"classes": {"10": None}},
        {"extra": {}},
    ],
)
def test_invalid_config_is_rejected(raw):
    with pytest.raises(ValidationDomainError):
        normalize_creation(raw)


@pytest.mark.django_db
def test_admin_config_applies_to_customer_creation_and_replay():
    client = APIClient()
    admin = User.objects.create_superuser(
        username="startadmin", email="admin@start.dev", password="Password123!"
    )
    player = User.objects.create_user(
        username="startplayer", email="player@start.dev", password="Password123!"
    )
    client.force_authenticate(admin)
    config = {
        "default": {
            "level": 20,
            "xp": "100000",
            "sp": "90",
            "title": "Novato",
            "items": [{"item_id": 57, "quantity": 500}],
        },
        "classes": {"10": {"items": [{"item_id": 100, "slot": 7, "enchant": 3}]}},
    }
    url = reverse("staff-panel-settings")
    response = client.put(url, {"character_creation": config}, format="json")
    assert response.status_code == 200
    assert client.get(url).json()["character_creation"]["classes"]["10"]["level"] == 20
    gateway = DependencyInjection.root().resolve(ILineageGateway)
    gateway.register_account("startaccount", "Password123!", player.email)
    gateway.link_account("startaccount", str(player.id))
    client.force_authenticate(player)
    data = {
        "login": "startaccount",
        "name": "StartMage",
        "race": 0,
        "class_id": 10,
        "sex": 0,
        "level": 99,
        "items": [{"item_id": 57, "quantity": 99999}],
    }
    created = client.post(
        "/api/v1/customer/server/characters/create/", data, format="json"
    )
    assert created.status_code == 201
    assert created.json()["level"] == 20
    char_id = created.json()["char_id"]
    assert [
        (item.item_id, item.enchant, item.slot)
        for item in gateway.list_character_equipment(char_id)
    ] == [(100, 3, 7)]
    assert gateway.list_character_items(char_id) == []
    assert (
        client.post(
            "/api/v1/customer/server/characters/create/", data, format="json"
        ).status_code
        == 400
    )
    assert len(gateway.list_characters("startaccount")) == 1
    client.force_authenticate(admin)
    assert (
        client.put(
            url, {"character_creation": {"default": {"level": 81}}}, format="json"
        ).status_code
        == 400
    )
    assert (
        IndexConfig.objects.get(is_active=True).character_creation["default"]["level"]
        == 20
    )
    assert client.put(url, {"character_creation": {}}, format="json").status_code == 200
    assert client.get(url).json()["character_creation"]["default"]["items"] == []


@pytest.mark.django_db
@pytest.mark.parametrize("role", ["anonymous", "player", "staff"])
def test_start_configuration_requires_settings_capability(role):
    client = APIClient()
    if role != "anonymous":
        user = User.objects.create_user(
            username="limited", email="limited@start.dev", is_staff=role == "staff"
        )
        client.force_authenticate(user)
    response = client.put(
        reverse("staff-panel-settings"), {"character_creation": {}}, format="json"
    )
    assert response.status_code in (401, 403)
    assert not IndexConfig.objects.exists()


@pytest.mark.django_db
def test_customer_cannot_create_character_on_other_account():
    client = APIClient()
    player = User.objects.create_user(
        username="unauthorized", email="unauthorized@start.dev"
    )
    gateway = DependencyInjection.root().resolve(ILineageGateway)
    gateway.register_account("foreign", "Password123!", "other@start.dev")
    client.force_authenticate(player)
    response = client.post(
        "/api/v1/customer/server/characters/create/",
        {"login": "foreign", "name": "Stolen", "race": 0, "class_id": 0, "sex": 0},
        format="json",
    )
    assert response.status_code == 403
    assert gateway.list_characters("foreign") == []


@pytest.mark.parametrize(
    "language, expected",
    [
        ("en", "Invalid character starting configuration."),
        ("es", "Configuración inicial del personaje no válida."),
    ],
)
def test_invalid_start_is_translated_at_http_boundary(language, expected):
    from django.utils.translation import override

    from common.exceptions import custom_exception_handler

    with override(language):
        response = custom_exception_handler(
            ValidationDomainError("Configuração inicial de personagem inválida."), {}
        )
    assert response.status_code == 400
    assert response.data["message"] == expected


def test_start_accepts_numeric_boundaries_and_one_hundred_inventory_entries():
    raw = {
        "default": {
            "level": 80,
            "xp": "9223372036854775807",
            "sp": "2147483647",
            "x": -2147483648,
            "y": 2147483647,
            "z": 0,
            "items": [{"item_id": 57, "quantity": 2147483647, "enchant": 65535}] * 100,
        }
    }
    start = resolve_start(raw, 0)
    assert start.xp == 9223372036854775807 and start.sp == 2147483647
    assert len(start.items) == 100 and start.items[0].quantity == 2147483647
