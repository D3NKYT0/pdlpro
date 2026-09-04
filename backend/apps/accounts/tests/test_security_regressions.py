import io
import json
import re
from urllib.parse import parse_qs, urlparse

import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.test import Client
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def isolated(settings):
    settings.HCAPTCHA_ENABLED = False
    settings.GOOGLE_CLIENT_ID = "audit-client"
    settings.GOOGLE_CLIENT_SECRET = "audit-secret"
    cache.clear()
    yield
    cache.clear()


def create(name="audituser", **kwargs):
    return get_user_model().objects.create_user(
        username=name,
        email=f"{name}@audit.invalid",
        password="AuditPassword42",
        **kwargs,
    )


def login(client, username="audituser", password="AuditPassword42"):
    return client.post(
        "/api/v1/auth/login/", {"login": username, "password": password}, format="json"
    )


def reset_token(user):
    client = APIClient()
    assert (
        client.post(
            "/api/v1/auth/password-reset/", {"email": user.email}, format="json"
        ).status_code
        == 200
    )
    return re.search(r"token=([^\s]+)", mail.outbox[-1].body).group(1)


def mock_google_http(mocker, email, uid="audit-google-id"):
    mocker.patch(
        "apps.accounts.application.oauth.urlopen",
        side_effect=[
            io.BytesIO(json.dumps({"access_token": "external-test-token"}).encode()),
            io.BytesIO(
                json.dumps(
                    {"sub": uid, "email": email, "email_verified": True}
                ).encode()
            ),
        ],
    )


def begin(client):
    response = client.post(
        "/api/v1/auth/oauth/begin/",
        {"provider": "google", "mode": "login"},
        format="json",
    )
    assert response.status_code == 200
    return parse_qs(urlparse(response.data["authorization_url"]).query)["state"][0]


def test_password_reset_token_is_consumed_by_password_change():
    user = create()
    token = reset_token(user)
    for index, password in enumerate(["VictimNewPassword42", "AttackerNewPassword42"]):
        response = APIClient().post(
            "/api/v1/auth/password-reset/confirm/",
            {"token": token, "password": password},
            format="json",
        )
        assert response.status_code == (200 if index == 0 else 400)
    assert login(APIClient(), password="VictimNewPassword42").status_code == 200


def test_stolen_refresh_is_rejected_after_logout_and_password_reset():
    user = create()
    victim = APIClient()
    stolen_refresh = login(victim).data["refresh"]
    assert victim.post("/api/v1/auth/logout/", {}, format="json").status_code == 200
    first_replay = APIClient().post(
        "/api/v1/auth/refresh/", {"refresh": stolen_refresh}, format="json"
    )
    assert first_replay.status_code == 401
    active = login(APIClient()).data
    token = reset_token(user)
    assert (
        APIClient()
        .post(
            "/api/v1/auth/password-reset/confirm/",
            {"token": token, "password": "VictimNewPassword42"},
            format="json",
        )
        .status_code
        == 200
    )
    attacker = APIClient()
    assert (
        attacker.post(
            "/api/v1/auth/refresh/", {"refresh": active["refresh"]}, format="json"
        ).status_code
        == 401
    )
    assert (
        attacker.get(
            "/api/v1/shared/me/", HTTP_AUTHORIZATION=f"Bearer {active['access']}"
        ).status_code
        == 401
    )


def test_admin_login_requires_enabled_totp():
    user = create(
        is_staff=True,
        is_superuser=True,
        is_2fa_enabled=True,
        totp_secret="JBSWY3DPEHPK3PXP",
    )
    api_login = login(APIClient())
    assert api_login.status_code == 200
    assert api_login.data["requires_2fa"] is True
    browser = Client()
    response = browser.post(
        "/admin/login/",
        {"username": user.username, "password": "AuditPassword42", "next": "/admin/"},
    )
    assert response.status_code == 200
    assert browser.get("/admin/").status_code == 302
    assert "_auth_user_id" not in browser.session


def test_oauth_rejects_precreated_unverified_account(mocker):
    attacker = APIClient()
    response = attacker.post(
        "/api/v1/auth/register/",
        {
            "username": "precreated",
            "email": "victim@audit.invalid",
            "password": "AttackerPassword42",
            "accept_terms": True,
        },
        format="json",
    )
    assert response.status_code == 200
    user = get_user_model().objects.get(username="precreated")
    assert user.is_email_verified is False
    victim = APIClient()
    state = begin(victim)
    mock_google_http(mocker, user.email)
    victim_login = victim.post(
        "/api/v1/auth/oauth/complete/",
        {"provider": "google", "code": "mock-code", "state": state},
        format="json",
    )
    assert victim_login.status_code == 409
    user.refresh_from_db()
    assert not user.is_email_verified
    from allauth.socialaccount.models import SocialAccount

    assert not SocialAccount.objects.filter(user=user).exists()


def test_oauth_callback_rejects_state_from_another_browser(mocker):
    attacker_account = create()
    attacker_browser = APIClient(enforce_csrf_checks=True)
    state = begin(attacker_browser)
    mock_google_http(mocker, attacker_account.email)
    victim_browser = APIClient(enforce_csrf_checks=True)
    response = victim_browser.post(
        "/api/v1/auth/oauth/complete/",
        {"provider": "google", "code": "mock-code", "state": state},
        format="json",
    )
    assert response.status_code == 400
    assert victim_browser.get("/api/v1/shared/me/").status_code == 401


def test_refresh_rotates_once_and_rejects_invalid_disabled_or_missing_users():
    user = create()
    data = login(APIClient()).data
    client = APIClient()
    rotated = client.post(
        "/api/v1/auth/refresh/", {"refresh": data["refresh"]}, format="json"
    )
    assert rotated.status_code == 200
    assert rotated.data["refresh"] != data["refresh"]
    assert (
        APIClient()
        .post("/api/v1/auth/refresh/", {"refresh": data["refresh"]}, format="json")
        .status_code
        == 401
    )
    user.is_active = False
    user.save()
    assert (
        APIClient()
        .post(
            "/api/v1/auth/refresh/", {"refresh": rotated.data["refresh"]}, format="json"
        )
        .status_code
        == 401
    )
    assert (
        APIClient()
        .post("/api/v1/auth/refresh/", {"refresh": "broken"}, format="json")
        .status_code
        == 401
    )
    assert (
        APIClient().post("/api/v1/auth/refresh/", {}, format="json").status_code == 401
    )


def test_logout_cannot_revoke_another_users_refresh():
    create()
    create("other")
    owner = APIClient()
    login(owner)
    other_token = login(APIClient(), username="other").data["refresh"]
    assert (
        owner.post(
            "/api/v1/auth/logout/", {"refresh": other_token}, format="json"
        ).status_code
        == 401
    )
    assert (
        APIClient()
        .post("/api/v1/auth/refresh/", {"refresh": other_token}, format="json")
        .status_code
        == 200
    )


def test_admin_totp_success_and_old_session_rejected(mocker):
    from datetime import datetime
    from types import SimpleNamespace

    import pyotp

    class FixedDateTime(datetime):
        @classmethod
        def now(cls, tz=None):
            return cls(2026, 9, 4, 12, 0, 0, tzinfo=tz)

    instant = FixedDateTime.now()
    mocker.patch("pyotp.totp.datetime", SimpleNamespace(datetime=FixedDateTime))
    user = create(is_staff=True)
    old = Client()
    assert old.login(username=user.username, password="AuditPassword42")
    user.is_2fa_enabled, user.totp_secret = True, "JBSWY3DPEHPK3PXP"
    user.save()
    assert old.get("/admin/").status_code == 302
    browser = Client(enforce_csrf_checks=True)
    page = browser.get("/admin/login/")
    assert b'name="otp"' in page.content
    assert (
        browser.post(
            "/admin/login/", {"username": user.username, "password": "AuditPassword42"}
        ).status_code
        == 403
    )
    code = pyotp.TOTP(user.totp_secret).at(instant)
    result = browser.post(
        "/admin/login/",
        {
            "username": user.username,
            "password": "AuditPassword42",
            "otp": code,
            "csrfmiddlewaretoken": browser.cookies["csrftoken"].value,
            "next": "/admin/",
        },
    )
    assert result.status_code == 302
    assert browser.get("/admin/").status_code == 200


def test_oauth_same_browser_success_and_replay_rejected(mocker):
    user = create(is_email_verified=True)
    browser = APIClient(enforce_csrf_checks=True)
    state = begin(browser)
    mock_google_http(mocker, user.email)
    response = browser.post(
        "/api/v1/auth/oauth/complete/",
        {"provider": "google", "code": "mock-code", "state": state},
        format="json",
    )
    assert response.status_code == 200
    assert browser.get("/api/v1/shared/me/").data["id"] == str(user.id)
    # Use CSRF on the now authenticated cookie request.
    csrf = browser.get("/api/v1/auth/csrf/").data["csrfToken"]
    assert (
        browser.post(
            "/api/v1/auth/oauth/complete/",
            {"provider": "google", "code": "mock-code", "state": state},
            format="json",
            HTTP_X_CSRFTOKEN=csrf,
        ).status_code
        == 400
    )


def test_reset_invalid_expired_and_unknown_tokens(mocker):
    from datetime import datetime, timedelta

    from django.contrib.auth.tokens import default_token_generator

    user = create()
    now = datetime(2026, 9, 4, 12)  # noqa: DTZ001 -- Django's token generator uses naive datetimes.
    mocker.patch.object(default_token_generator, "_now", return_value=now)
    token = reset_token(user)
    mocker.patch.object(
        default_token_generator, "_now", return_value=now + timedelta(seconds=3601)
    )
    for invalid in [token, "broken", "invalid:token", f"{user.id}:invalid"]:
        assert (
            APIClient()
            .post(
                "/api/v1/auth/password-reset/confirm/",
                {"token": invalid, "password": "NewPassword42"},
                format="json",
            )
            .status_code
            == 400
        )
    assert login(APIClient()).status_code == 200


def test_cookie_refresh_requires_csrf_and_rotates_with_valid_csrf():
    create()
    client = APIClient(enforce_csrf_checks=True)
    assert login(client).status_code == 200
    assert client.post("/api/v1/auth/refresh/", {}, format="json").status_code == 403
    csrf = client.get("/api/v1/auth/csrf/").data["csrfToken"]
    assert (
        client.post(
            "/api/v1/auth/refresh/", {}, format="json", HTTP_X_CSRFTOKEN=csrf
        ).status_code
        == 200
    )
