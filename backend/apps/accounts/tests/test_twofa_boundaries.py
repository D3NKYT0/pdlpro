"""Segundo fator: expiração, assinatura e desativação entre as etapas do login."""
from uuid import uuid4

import pyotp
import pytest
from django.contrib.auth import get_user_model
from django.core import signing
from rest_framework.test import APIClient

from apps.accounts.application.twofa import (
    ConfirmTwoFactorInput, ConfirmTwoFactorUseCase, DisableTwoFactorInput,
    DisableTwoFactorUseCase, SetupTwoFactorUseCase, TWOFA_SALT,
    make_login_challenge, read_login_challenge,
)
from apps.accounts.domain.exceptions import InvalidTwoFactorError
from common.architecture.exceptions import ValidationDomainError


def test_challenge_preserves_uuid_and_rejects_tampering():
    user_id = uuid4()
    token = make_login_challenge(user_id)
    assert read_login_challenge(token) == user_id
    with pytest.raises(InvalidTwoFactorError):
        read_login_challenge(token + "tampered")


def test_expired_challenge_is_rejected(mocker):
    mocker.patch("django.core.signing.time.time", return_value=1000)
    token = make_login_challenge(uuid4())
    mocker.patch("django.core.signing.time.time", return_value=1301)
    with pytest.raises(InvalidTwoFactorError):
        read_login_challenge(token)


@pytest.mark.parametrize("payload", [{}, {"uid": "bad"}, {"uid": None}])
def test_malformed_signed_payload_is_domain_error(payload):
    with pytest.raises(InvalidTwoFactorError):
        read_login_challenge(signing.dumps(payload, salt=TWOFA_SALT))


@pytest.mark.django_db
def test_setup_confirm_disable_lifecycle():
    user = get_user_model().objects.create_user(username="twofa", email="twofa@test.dev")
    setup = SetupTwoFactorUseCase().execute(user.id)
    user.refresh_from_db()
    assert not user.is_2fa_enabled
    assert user.totp_secret == setup["secret"]
    code = pyotp.TOTP(setup["secret"]).now()
    assert ConfirmTwoFactorUseCase().execute(ConfirmTwoFactorInput(user.id, code)) == {"enabled": True}
    with pytest.raises(ValidationDomainError):
        SetupTwoFactorUseCase().execute(user.id)
    with pytest.raises(InvalidTwoFactorError):
        DisableTwoFactorUseCase().execute(DisableTwoFactorInput(user.id, "invalid"))
    assert DisableTwoFactorUseCase().execute(DisableTwoFactorInput(user.id, code)) == {"enabled": False}
    user.refresh_from_db()
    assert not user.totp_secret
    assert not user.is_2fa_enabled


@pytest.mark.django_db
def test_account_disabled_after_first_factor_cannot_receive_session():
    secret = pyotp.random_base32()
    user = get_user_model().objects.create_user(username="disabled2fa", email="disabled2fa@test.dev", is_2fa_enabled=True, totp_secret=secret)
    challenge = make_login_challenge(user.id)
    user.is_active = False
    user.save()
    response = APIClient().post("/api/v1/auth/2fa/verify/", {"challenge": challenge, "code": pyotp.TOTP(secret).now()}, format="json")
    assert response.status_code in (400, 401, 403, 404)
    assert not response.cookies
