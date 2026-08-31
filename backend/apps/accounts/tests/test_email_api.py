import re

import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def api():
    return APIClient()


def _token_from_outbox() -> str:
    body = mail.outbox[-1].body
    match = re.search(r"token=([^\s]+)", body)
    assert match, body
    return match.group(1)


@pytest.mark.django_db
def test_register_sends_verification_and_confirms(api):
    created = api.post(
        "/api/v1/auth/register/",
        {"username": "mage01", "email": "mage01@pdl.dev", "password": "Secret123", "accept_terms": True},
        format="json",
    )
    assert created.status_code == 200, created.data
    assert len(mail.outbox) == 1
    token = _token_from_outbox()
    verified = api.post("/api/v1/auth/email/verify/", {"token": token}, format="json")
    assert verified.status_code == 200, verified.data
    user = User.objects.get(username="mage01")
    assert user.is_email_verified is True
    assert user.terms_and_privacy_version


@pytest.mark.django_db
def test_password_reset_flow(api):
    User.objects.create_user(username="reset1", email="reset1@pdl.dev", password="Secret123")
    requested = api.post("/api/v1/auth/password-reset/", {"email": "reset1@pdl.dev"}, format="json")
    assert requested.status_code == 200
    token = _token_from_outbox()
    confirmed = api.post(
        "/api/v1/auth/password-reset/confirm/",
        {"token": token, "password": "NovaSenha1"},
        format="json",
    )
    assert confirmed.status_code == 200, confirmed.data
    login = api.post("/api/v1/auth/login/", {"login": "reset1", "password": "NovaSenha1"}, format="json")
    assert login.status_code == 200
    assert login.data["username"] == "reset1"


@pytest.mark.django_db
def test_password_reset_unknown_email_is_silent(api):
    response = api.post("/api/v1/auth/password-reset/", {"email": "nobody@pdl.dev"}, format="json")
    assert response.status_code == 200
    assert mail.outbox == []
