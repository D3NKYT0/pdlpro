"""Exercita a troca real de cookies e as fronteiras de autorização."""

from datetime import timedelta
from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from apps.accounts.infrastructure.models import ImpersonationSession

pytestmark = pytest.mark.django_db
BASE = "/api/v1/auth/"


@pytest.fixture
def users():
    model = get_user_model()
    admin = model.objects.create_superuser("admin", "admin@example.com", "Secret123")
    player = model.objects.create_user("player", "player@example.com", "Secret123")
    return admin, player


def login(api, user):
    response = api.post(
        BASE + "login/",
        {"login": user.username, "password": "Secret123"},
        format="json",
    )
    assert response.status_code == 200, response.data


def start(api, target):
    return api.post(BASE + f"impersonation/{target.id}/", {}, format="json")


def test_switch_refresh_restore_and_reject_old_tokens(users):
    admin, player = users
    api = APIClient()
    login(api, admin)
    original = api.cookies["PDL-refresh"].value
    response = start(api, player)
    assert response.status_code == 200, response.data
    assert response.data["username"] == player.username
    assert response.cookies["PDL-impersonation"]["httponly"]
    assert api.get("/api/v1/shared/me/").data["username"] == player.username
    assert (
        api.get(BASE + "impersonation/").data["impersonation"]["username"]
        == admin.username
    )
    assert start(api, player).status_code == 403
    assert api.get(BASE + "site-users/").status_code == 403
    assert api.post(BASE + "refresh/", {}, format="json").status_code == 200
    access = api.cookies["PDL-auth"].value
    refresh = api.cookies["PDL-refresh"].value
    assert AccessToken(access)["impersonation"]
    proof = api.cookies["PDL-impersonation"].value
    stopped = api.post(BASE + "impersonation/stop/", {}, format="json")
    assert stopped.status_code == 200, stopped.data
    assert stopped.data["username"] == admin.username
    assert api.get("/api/v1/shared/me/").data["username"] == admin.username
    assert ImpersonationSession.objects.get().ended_at is not None
    attacker = APIClient()
    attacker.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
    assert attacker.get("/api/v1/shared/me/").status_code == 403
    assert attacker.post(
        BASE + "refresh/", {"refresh": refresh}, format="json"
    ).status_code in (401, 403)
    attacker.cookies["PDL-impersonation"] = proof
    assert (
        attacker.post(BASE + "impersonation/stop/", {}, format="json").status_code
        == 403
    )
    assert (
        api.post(BASE + "refresh/", {"refresh": original}, format="json").status_code
        == 200
    )


@pytest.mark.parametrize("role", ["player", "supporter", "moderator", "staff", "admin"])
def test_only_superuser_can_list_or_start(users, role):
    _, player = users
    model = get_user_model()
    actor = model.objects.create_user(
        "actor",
        "actor@example.com",
        "Secret123",
        role=role,
        is_staff=role in ("staff", "admin"),
    )
    api = APIClient()
    login(api, actor)
    assert api.get(BASE + "site-users/").status_code == 403
    assert start(api, player).status_code == 403
    assert not ImpersonationSession.objects.exists()


@pytest.mark.parametrize(
    "changes",
    [
        {"is_active": False},
        {"is_staff": True},
        {"is_superuser": True},
        {"role": "moderator"},
        {"role": "staff"},
        {"role": "admin"},
    ],
)
def test_privileged_or_inactive_targets_are_forbidden(users, changes):
    admin, player = users
    for key, value in changes.items():
        setattr(player, key, value)
    player.save()
    api = APIClient()
    login(api, admin)
    assert start(api, player).status_code == 403


def test_search_pagination_invalid_and_missing(users):
    admin, player = users
    api = APIClient()
    login(api, admin)
    response = api.get(BASE + "site-users/", {"search": "player@example"})
    assert response.data["count"] == 1
    assert response.data["results"][0]["id"] == str(player.id)
    assert response.data["results"][0]["can_impersonate"]
    assert api.get(BASE + "site-users/", {"page": 2}).data["results"] == []
    for params in [
        {"page": 0},
        {"page": 1_000_001},
        {"page": "9" * 100},
        {"page": "abc"},
        {"search": "x" * 101},
    ]:
        assert api.get(BASE + "site-users/", params).status_code == 400
    assert api.post(BASE + f"impersonation/{uuid4()}/", {}).status_code == 404
    assert api.get(BASE + "impersonation/").json() == {"impersonation": None}
    assert api.post(BASE + "impersonation/stop/", {}).status_code == 403
    anonymous = APIClient()
    assert anonymous.get(BASE + "site-users/").status_code == 401
    assert start(anonymous, player).status_code == 401


def test_expired_or_inactive_target_can_return(users):
    admin, player = users
    api = APIClient()
    login(api, admin)
    assert start(api, player).status_code == 200
    ImpersonationSession.objects.update(
        expires_at=timezone.now() - timedelta(seconds=1)
    )
    player.is_active = False
    player.save()
    api.cookies.pop("PDL-auth")
    api.cookies.pop("PDL-refresh")
    assert (
        api.get(BASE + "impersonation/").data["impersonation"]["username"]
        == admin.username
    )
    assert api.post(BASE + "impersonation/stop/", {}).data["username"] == admin.username


def test_csrf_tampering_and_revoked_actor(users):
    admin, player = users
    api = APIClient()
    login(api, admin)
    assert start(api, player).status_code == 200
    secure = APIClient(enforce_csrf_checks=True)
    secure.cookies = api.cookies.copy()
    assert secure.post(BASE + "impersonation/stop/", {}).status_code == 403
    api.cookies["PDL-impersonation"] = "forged"
    assert api.post(BASE + "impersonation/stop/", {}).status_code == 403
    admin.is_superuser = False
    admin.save()
    assert api.get("/api/v1/shared/me/").status_code == 403


@pytest.mark.parametrize("change", ["password", "revoke", "promote"])
def test_security_changes_revoke_representation(users, change):
    admin, player = users
    api = APIClient()
    login(api, admin)
    original = api.cookies["PDL-refresh"].value
    assert start(api, player).status_code == 200
    if change == "password":
        admin.set_password("Different123")
        admin.save()
    elif change == "revoke":
        from rest_framework_simplejwt.tokens import RefreshToken

        RefreshToken(original).blacklist()
    else:
        player.is_staff = True
        player.save()
    assert api.get("/api/v1/shared/me/").status_code == 403
    assert api.post(BASE + "refresh/", {}).status_code in (401, 403)


def test_duplicate_start_and_proof_mismatch(users):
    admin, player = users
    api = APIClient()
    login(api, admin)
    original_cookies = api.cookies.copy()
    assert start(api, player).status_code == 200
    duplicate = APIClient()
    duplicate.cookies = original_cookies
    assert start(duplicate, player).status_code == 409
    from rest_framework_simplejwt.tokens import RefreshToken

    other = get_user_model().objects.create_user(
        "other", "other@example.com", "Secret123"
    )
    token = RefreshToken.for_user(other)
    token["impersonation"] = str(ImpersonationSession.objects.get().id)
    duplicate.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")
    assert duplicate.get("/api/v1/shared/me/").status_code == 403
    duplicate.cookies.pop("PDL-refresh")
    duplicate.credentials()
    assert start(duplicate, player).status_code == 403


@pytest.mark.parametrize("language", ["en", "es"])
def test_denials_are_localized(users, language):
    _, player = users
    api = APIClient()
    login(api, player)
    response = api.get(BASE + "site-users/", HTTP_ACCEPT_LANGUAGE=language)
    assert response.status_code == 403
    assert response.data["message"] != "Você não tem permissão para realizar esta ação."


def test_mixed_identity_refresh_is_rejected(users):
    from rest_framework_simplejwt.tokens import RefreshToken

    admin, player = users
    api = APIClient()
    login(api, admin)
    api.cookies["PDL-refresh"] = str(RefreshToken.for_user(player))
    assert start(api, player).status_code == 403
    assert not ImpersonationSession.objects.exists()


def test_missing_original_session_and_invalid_proof_hide_status(users):
    from rest_framework_simplejwt.token_blacklist.models import OutstandingToken

    admin, player = users
    api = APIClient()
    login(api, admin)
    assert start(api, player).status_code == 200
    proof = api.cookies["PDL-impersonation"].value
    api.cookies["PDL-impersonation"] = "tampered"
    assert api.get(BASE + "impersonation/").json() == {"impersonation": None}
    api.cookies["PDL-impersonation"] = proof
    OutstandingToken.objects.filter(user=admin).delete()
    assert api.get(BASE + "impersonation/").json() == {"impersonation": None}
    assert api.get("/api/v1/shared/me/").status_code == 403
    assert api.post(BASE + "impersonation/stop/", {}).status_code == 403
