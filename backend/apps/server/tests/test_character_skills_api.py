import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.server.domain.gateways import GameSkill, ILineageGateway
from apps.server.infrastructure.lineage.skill_catalog import (
    skill_metadata,
    skill_progress,
)
from apps.server.infrastructure.null_gateway import NullLineageGateway
from common.di.bootstrap import DependencyInjection

User = get_user_model()


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def player(db):
    return User.objects.create_user(username="hero", email="hero@pdl.dev", password="Secret123")


@pytest.mark.django_db
def test_character_skills_are_read_only_and_include_icon_urls(api, player):
    api.force_authenticate(user=player)
    api.post("/api/v1/customer/server/accounts/register/", {"password": "l2pass1"}, format="json")
    gateway = DependencyInjection.root().resolve(ILineageGateway)
    assert isinstance(gateway, NullLineageGateway)
    char = gateway.seed_character(
        "hero",
        "SirHero",
        skills=[GameSkill(1, 37), GameSkill(3, 9, class_index=0)],
    )

    response = api.get(f"/api/v1/customer/server/characters/{char.char_id}/skills/?login=hero")

    assert response.status_code == 200
    assert [(row["skill_id"], row["level"], row["class_index"]) for row in response.data] == [
        (1, 37, 0),
        (3, 9, 0),
    ]
    for row in response.data:
        meta = skill_metadata(row["skill_id"])
        assert row["name"] == meta["name"]
        assert row["icon_url"] == f"/skill-icons/{row['skill_id']}.png"
        assert row["operate"] == meta["operate"]
        assert row["kind"] == meta["kind"]
        assert row["group"] == meta["group"]
        assert row["skill_type"] == meta["skill_type"]
        progress = skill_progress(row["skill_id"], 37 if row["skill_id"] == 1 else 9)
        assert row["enchant"] == progress["enchant"]
        assert row["enchantable"] == progress["enchantable"]
        assert row["enchant_max"] == progress["enchant_max"]
    assert api.post(f"/api/v1/customer/server/characters/{char.char_id}/skills/").status_code == 405


@pytest.mark.django_db
def test_character_skills_decode_enchant_from_stored_level(api, player):
    api.force_authenticate(user=player)
    api.post("/api/v1/customer/server/accounts/register/", {"password": "l2pass1"}, format="json")
    gateway = DependencyInjection.root().resolve(ILineageGateway)
    char = gateway.seed_character("hero", "Enchanter", skills=[GameSkill(1, 52)])

    response = api.get(f"/api/v1/customer/server/characters/{char.char_id}/skills/?login=hero")

    assert response.status_code == 200
    row = response.data[0]
    progress = skill_progress(1, 52)
    assert row["level"] == progress["level"]
    assert row["enchant"] == progress["enchant"]
    assert row["enchant_route"] == progress["enchant_route"]
    assert row["enchant_max"] == progress["enchant_max"]
    assert row["enchantable"] == progress["enchantable"]
    if progress["enchantable"]:
        assert row["level"] == 37
        assert row["enchant"] == 15
        assert row["enchant_route"] == 1
        assert row["enchant_max"] == 30


@pytest.mark.django_db
def test_character_skills_reject_foreign_character(api, player):
    api.force_authenticate(user=player)
    api.post("/api/v1/customer/server/accounts/register/", {"password": "l2pass1"}, format="json")
    gateway = DependencyInjection.root().resolve(ILineageGateway)
    foreign = gateway.seed_character("stranger", "Private", skills=[GameSkill(1, 1)])

    response = api.get(f"/api/v1/customer/server/characters/{foreign.char_id}/skills/?login=hero")

    assert response.status_code == 404, response.data


@pytest.mark.django_db
def test_character_skills_require_authentication(api):
    response = api.get("/api/v1/customer/server/characters/1/skills/")
    assert response.status_code == 401
