from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(username="hero", email="hero@pdl.dev", password="Secret123")


@pytest.mark.django_db
def test_health(api):
    response = api.get("/api/v1/system/health/")
    assert response.status_code == 200
    assert response.data["status"] == "ok"


@pytest.mark.django_db
def test_register_and_me(api):
    response = api.post(
        "/api/v1/auth/register/",
        {"username": "knight", "email": "knight@pdl.dev", "password": "Secret123", "accept_terms": True},
        format="json",
    )
    assert response.status_code == 200
    assert response.data["username"] == "knight"
    me = api.get("/api/v1/shared/me/")
    assert me.status_code == 200
    assert me.data["username"] == "knight"
    assert me.data["is_email_verified"] is False


@pytest.mark.django_db
def test_login(api, user):
    response = api.post(
        "/api/v1/auth/login/",
        {"login": "hero", "password": "Secret123"},
        format="json",
    )
    assert response.status_code == 200
    assert response.data["username"] == "hero"


@pytest.mark.django_db
def test_login_cookies_outlive_access_token(api, user):
    from django.conf import settings as django_settings

    response = api.post(
        "/api/v1/auth/login/",
        {"login": "hero", "password": "Secret123"},
        format="json",
    )
    assert response.status_code == 200
    access_name = django_settings.REST_AUTH["JWT_AUTH_COOKIE"]
    refresh_name = django_settings.REST_AUTH["JWT_AUTH_REFRESH_COOKIE"]
    expected_age = int(django_settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())
    assert int(response.cookies[access_name]["max-age"]) == expected_age
    assert int(response.cookies[refresh_name]["max-age"]) == expected_age
    assert response.cookies[access_name]["path"] == "/"
    assert response.cookies[refresh_name]["path"] == "/"


@pytest.mark.django_db
def test_refresh_restores_session_without_access_cookie(api, user):
    from django.conf import settings as django_settings

    login = api.post(
        "/api/v1/auth/login/",
        {"login": "hero", "password": "Secret123"},
        format="json",
    )
    assert login.status_code == 200
    access_name = django_settings.REST_AUTH["JWT_AUTH_COOKIE"]
    api.cookies.pop(access_name, None)
    blocked = api.get("/api/v1/shared/me/")
    assert blocked.status_code == 401
    refreshed = api.post("/api/v1/auth/refresh/", {}, format="json")
    assert refreshed.status_code == 200, refreshed.data
    me = api.get("/api/v1/shared/me/")
    assert me.status_code == 200
    assert me.data["username"] == "hero"


@pytest.mark.django_db
def test_wallet_is_created_on_first_access(api, user):
    api.force_authenticate(user=user)
    response = api.get("/api/v1/shared/wallet/")
    assert response.status_code == 200
    assert Decimal(response.data["balance"]) == Decimal("0.00")


@pytest.mark.django_db
def test_public_rankings_empty_without_lineage_db(api):
    response = api.get("/api/v1/public/server/rankings/pvp/")
    assert response.status_code == 200
    assert response.data == []


@pytest.mark.django_db
def test_two_factor_login_challenge(api, user):
    import pyotp

    secret = pyotp.random_base32()
    user.totp_secret = secret
    user.is_2fa_enabled = True
    user.save(update_fields=["totp_secret", "is_2fa_enabled"])
    login = api.post("/api/v1/auth/login/", {"login": "hero", "password": "Secret123"}, format="json")
    assert login.status_code == 200
    assert login.data["requires_2fa"] is True
    assert login.data["challenge"]
    blocked = api.get("/api/v1/shared/me/")
    assert blocked.status_code == 401
    verified = api.post(
        "/api/v1/auth/2fa/verify/",
        {"challenge": login.data["challenge"], "code": pyotp.TOTP(secret).now()},
        format="json",
    )
    assert verified.status_code == 200, verified.data
    assert verified.data["username"] == "hero"
    me = api.get("/api/v1/shared/me/")
    assert me.status_code == 200
    assert me.data["is_2fa_enabled"] is True


@pytest.mark.django_db
def test_setup_and_confirm_two_factor(api, user):
    import pyotp

    api.force_authenticate(user=user)
    setup = api.post("/api/v1/shared/me/2fa/", {"action": "setup"}, format="json")
    assert setup.status_code == 200, setup.data
    secret = setup.data["secret"]
    confirm = api.post(
        "/api/v1/shared/me/2fa/",
        {"action": "confirm", "code": pyotp.TOTP(secret).now()},
        format="json",
    )
    assert confirm.status_code == 200
    assert confirm.data["enabled"] is True
    user.refresh_from_db()
    assert user.is_2fa_enabled is True


@pytest.mark.django_db
def test_gamer_profile_and_claim_level_reward(api, user):
    from apps.accounts.application.progress import add_xp
    from apps.accounts.infrastructure.models import RewardDefinition

    reward = RewardDefinition.objects.create(
        kind="level", reference="2", item_id=57, item_name="Adena", quantity=80, description="Nv.2"
    )
    api.force_authenticate(user=user)
    profile = api.get("/api/v1/shared/me/progress/")
    assert profile.status_code == 200
    assert profile.data["level"] == 1
    add_xp(user, 100)
    profile = api.get("/api/v1/shared/me/progress/")
    assert profile.data["level"] == 2
    reward_row = next(row for row in profile.data["rewards"] if row["id"] == str(reward.id))
    assert reward_row["available"] is True
    claimed = api.post(f"/api/v1/shared/me/rewards/{reward.id}/claim/")
    assert claimed.status_code == 200, claimed.data
    bag = api.get("/api/v1/customer/games/bag/")
    assert bag.status_code == 200
    assert any(item["item_name"] == "Adena" for item in bag.data)
