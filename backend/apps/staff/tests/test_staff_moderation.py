import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.server.domain.gateways import ILineageGateway
from apps.server.domain.moderation import BAN_ACCESS_LEVEL, JAIL_X
from apps.server.infrastructure.moderation_models import (
    CharacterJailState,
    ModerationActionLog,
)
from apps.server.infrastructure.null_gateway import NullLineageGateway
from common.di.bootstrap import DependencyInjection

User = get_user_model()


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def staff(db):
    return User.objects.create_user(
        username="gmstaff",
        email="gmstaff@pdl.dev",
        password="Secret123",
        is_staff=True,
        role=User.Role.STAFF,
    )


def _gateway() -> NullLineageGateway:
    gateway = DependencyInjection.root().resolve(ILineageGateway)
    assert isinstance(gateway, NullLineageGateway)
    return gateway


def _seed(online=False, name="SirHero", login="hero", email="hero@pdl.dev"):
    gateway = _gateway()
    if gateway.get_account(login) is None:
        gateway.register_account(login, "GmPass123", email)
    return gateway.seed_character(login, name, online=online, level=70)


@pytest.mark.django_db
def test_player_cannot_list_or_moderate_characters(api):
    player = User.objects.create_user(username="hero", email="hero@pdl.dev", password="Secret123")
    char = _seed()
    api.force_authenticate(user=player)
    assert api.get("/api/v1/staff/moderation/characters/").status_code == 403
    assert api.get(f"/api/v1/staff/moderation/characters/{char.char_id}/").status_code == 403
    denied = api.post(
        "/api/v1/staff/moderation/actions/",
        {"action": "kick", "char_id": char.char_id},
        format="json",
    )
    assert denied.status_code == 403


@pytest.mark.django_db
def test_staff_lists_characters_with_account_and_email(api, staff):
    _seed(name="SirHero")
    _seed(name="DarkElf", login="alt", email="alt@pdl.dev")
    api.force_authenticate(user=staff)
    listed = api.get("/api/v1/staff/moderation/characters/")
    assert listed.status_code == 200, listed.data
    assert listed.data["available"] is True
    names = {row["name"] for row in listed.data["results"]}
    assert names == {"SirHero", "DarkElf"}
    hero = next(row for row in listed.data["results"] if row["name"] == "SirHero")
    assert hero["login"] == "hero"
    assert hero["email"] == "hero@pdl.dev"
    assert hero["banned"] is False
    assert hero["jailed"] is False

    found = api.get("/api/v1/staff/moderation/characters/?q=Dark")
    assert [row["name"] for row in found.data["results"]] == ["DarkElf"]

    by_email = api.get("/api/v1/staff/moderation/characters/?q=hero@pdl")
    assert [row["name"] for row in by_email.data["results"]] == ["SirHero"]


@pytest.mark.django_db
def test_staff_kick_jail_ban_and_teleport(api, staff):
    char = _seed(online=True)
    gateway = _gateway()
    api.force_authenticate(user=staff)

    kicked = api.post(
        "/api/v1/staff/moderation/actions/",
        {"action": "kick", "char_id": char.char_id, "reason": "AFK na arena"},
        format="json",
    )
    assert kicked.status_code == 200, kicked.data
    assert kicked.data["was_online"] is True
    assert kicked.data["takes_effect"] == "next_login"
    assert kicked.data["character"]["online"] is False
    assert gateway.get_character("hero", char.char_id).online is False

    missing_reason = api.post(
        "/api/v1/staff/moderation/actions/",
        {"action": "jail", "char_id": char.char_id, "minutes": 10},
        format="json",
    )
    assert missing_reason.status_code == 400

    jailed = api.post(
        "/api/v1/staff/moderation/actions/",
        {"action": "jail", "char_id": char.char_id, "reason": "RMT", "minutes": 30},
        format="json",
    )
    assert jailed.status_code == 200, jailed.data
    assert jailed.data["character"]["jailed"] is True
    assert jailed.data["character"]["jail_reason"] == "RMT"
    assert gateway._char_coords[char.char_id][0] == JAIL_X
    assert CharacterJailState.objects.filter(char_id=char.char_id, jailed=True).exists()

    banned = api.post(
        "/api/v1/staff/moderation/actions/",
        {"action": "ban", "char_id": char.char_id, "reason": "bot"},
        format="json",
    )
    assert banned.status_code == 200, banned.data
    assert banned.data["character"]["banned"] is True
    assert gateway._accounts["hero"]["access_level"] == BAN_ACCESS_LEVEL

    already = api.post(
        "/api/v1/staff/moderation/actions/",
        {"action": "unban", "char_id": char.char_id},
        format="json",
    )
    assert already.status_code == 200, already.data
    assert already.data["character"]["banned"] is False

    teleported = api.post(
        "/api/v1/staff/moderation/actions/",
        {"action": "teleport", "char_id": char.char_id, "town": "aden"},
        format="json",
    )
    assert teleported.status_code == 200, teleported.data
    assert gateway._char_coords[char.char_id] == (146331, 25762, -2018)

    unjailed = api.post(
        "/api/v1/staff/moderation/actions/",
        {"action": "unjail", "char_id": char.char_id},
        format="json",
    )
    assert unjailed.status_code == 200, unjailed.data
    assert unjailed.data["character"]["jailed"] is False
    assert gateway._char_coords[char.char_id] == (83400, 147943, -3404)

    detail = api.get(f"/api/v1/staff/moderation/characters/{char.char_id}/")
    assert detail.status_code == 200
    actions = [row["action"] for row in detail.data["logs"]]
    assert actions[:5] == ["unjail", "teleport", "unban", "ban", "jail"]
    assert ModerationActionLog.objects.filter(char_id=char.char_id).count() == 6


@pytest.mark.django_db
def test_anonymous_cannot_list_moderation_characters(api):
    assert api.get("/api/v1/staff/moderation/characters/").status_code in (401, 403)


@pytest.mark.django_db
def test_staff_filters_jailed_and_rejects_invalid_payloads(api, staff):
    char = _seed()
    api.force_authenticate(user=staff)
    jailed = api.post(
        "/api/v1/staff/moderation/actions/",
        {"action": "jail", "char_id": char.char_id, "reason": "RMT"},
        format="json",
    )
    assert jailed.status_code == 200, jailed.data
    listed = api.get("/api/v1/staff/moderation/characters/?status=jailed")
    assert listed.status_code == 200
    assert [row["name"] for row in listed.data["results"]] == ["SirHero"]
    online = api.get("/api/v1/staff/moderation/characters/?status=online")
    assert online.data["results"] == []
    bad_action = api.post(
        "/api/v1/staff/moderation/actions/",
        {"action": "explode", "char_id": char.char_id},
        format="json",
    )
    assert bad_action.status_code == 400
    bad_status = api.get("/api/v1/staff/moderation/characters/?status=ghost")
    assert bad_status.status_code == 400


@pytest.mark.django_db
def test_staff_moderation_rejects_unknown_character_and_town(api, staff):
    _seed()
    api.force_authenticate(user=staff)
    missing = api.get("/api/v1/staff/moderation/characters/999/")
    assert missing.status_code == 404
    bad_town = api.post(
        "/api/v1/staff/moderation/actions/",
        {"action": "teleport", "char_id": 1, "town": "narnia"},
        format="json",
    )
    assert bad_town.status_code == 400
    unjail_free = api.post(
        "/api/v1/staff/moderation/actions/",
        {"action": "unjail", "char_id": 1},
        format="json",
    )
    assert unjail_free.status_code == 400
    unban_free = api.post(
        "/api/v1/staff/moderation/actions/",
        {"action": "unban", "char_id": 1},
        format="json",
    )
    assert unban_free.status_code == 400
