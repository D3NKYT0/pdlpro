"""Segundo fator: expiração, assinatura e desativação entre as etapas do login."""
import base64
from uuid import uuid4

import pyotp
import pytest
from django.contrib.auth import get_user_model
from django.core import signing
from rest_framework.test import APIClient

from apps.accounts.application.twofa import (
    TWOFA_SALT,
    ConfirmTwoFactorInput,
    ConfirmTwoFactorUseCase,
    DisableTwoFactorInput,
    DisableTwoFactorUseCase,
    SetupTwoFactorUseCase,
    make_login_challenge,
    provisioning_qr_png,
    read_login_challenge,
)
from apps.accounts.domain.exceptions import InvalidTwoFactorError
from apps.accounts.domain.repositories import IUserRepository
from apps.accounts.infrastructure.models import TwoFactorRecoveryCode
from common.architecture.exceptions import ValidationDomainError
from common.di.bootstrap import DependencyInjection


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


def test_provisioning_qr_png_encodes_otpauth_uri():
    uri = "otpauth://totp/PDL%20PRO:hero?secret=JBSWY3DPEHPK3PXP&issuer=PDL%20PRO"
    png = base64.b64decode(provisioning_qr_png(uri))
    assert png.startswith(b"\x89PNG")
    assert len(png) > 200


@pytest.mark.django_db
def test_setup_confirm_disable_lifecycle():
    scope = DependencyInjection.root().create_scope()
    users = scope.resolve(IUserRepository)
    confirm = scope.resolve(ConfirmTwoFactorUseCase)
    disable = scope.resolve(DisableTwoFactorUseCase)
    user = get_user_model().objects.create_user(username="twofa", email="twofa@test.dev")
    setup = SetupTwoFactorUseCase(users).execute(user.id)
    user.refresh_from_db()
    assert not user.is_2fa_enabled
    assert user.totp_secret
    assert user.totp_secret != setup["secret"]
    assert users.get_totp_state(user.id).totp_secret == setup["secret"]
    assert setup["otpauth_url"].startswith("otpauth://totp/")
    assert setup["secret"] in setup["otpauth_url"]
    qr_png = base64.b64decode(setup["qr_code_base64"])
    assert qr_png.startswith(b"\x89PNG")
    code = pyotp.TOTP(setup["secret"]).now()
    confirmed = confirm.execute(ConfirmTwoFactorInput(user.id, code))
    assert confirmed["enabled"] is True
    assert len(confirmed["recovery_codes"]) == 10
    assert TwoFactorRecoveryCode.objects.filter(user=user).count() == 10
    with pytest.raises(ValidationDomainError):
        SetupTwoFactorUseCase(users).execute(user.id)
    with pytest.raises(InvalidTwoFactorError):
        disable.execute(DisableTwoFactorInput(user.id, "invalid"))
    assert disable.execute(DisableTwoFactorInput(user.id, code)) == {"enabled": False}
    user.refresh_from_db()
    assert not user.totp_secret
    assert not user.is_2fa_enabled
    assert not TwoFactorRecoveryCode.objects.filter(user=user).exists()


@pytest.mark.django_db
def test_recovery_code_completes_login_once():
    scope = DependencyInjection.root().create_scope()
    users = scope.resolve(IUserRepository)
    confirm = scope.resolve(ConfirmTwoFactorUseCase)
    user = get_user_model().objects.create_user(username="recover2fa", email="recover2fa@test.dev", password="Secret123")
    setup = SetupTwoFactorUseCase(users).execute(user.id)
    codes = confirm.execute(ConfirmTwoFactorInput(user.id, pyotp.TOTP(setup["secret"]).now()))["recovery_codes"]
    api = APIClient()
    login = api.post("/api/v1/auth/login/", {"login": "recover2fa", "password": "Secret123"}, format="json")
    assert login.data["requires_2fa"] is True
    first = api.post(
        "/api/v1/auth/2fa/verify/",
        {"challenge": login.data["challenge"], "code": codes[0]},
        format="json",
    )
    assert first.status_code == 200, first.data
    assert first.data["username"] == "recover2fa"
    other = APIClient()
    login_again = other.post("/api/v1/auth/login/", {"login": "recover2fa", "password": "Secret123"}, format="json")
    reused = other.post(
        "/api/v1/auth/2fa/verify/",
        {"challenge": login_again.data["challenge"], "code": codes[0]},
        format="json",
    )
    assert reused.status_code == 400
    assert not reused.cookies


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


@pytest.mark.django_db
def test_twofa_challenge_lockout_after_max_attempts():
    from django.core.cache import cache
    cache.clear()
    scope = DependencyInjection.root().create_scope()
    users = scope.resolve(IUserRepository)
    confirm = scope.resolve(ConfirmTwoFactorUseCase)
    user = get_user_model().objects.create_user(username="lockout2fa", email="lockout2fa@test.dev", password="Secret123")
    setup = SetupTwoFactorUseCase(users).execute(user.id)
    confirm.execute(ConfirmTwoFactorInput(user.id, pyotp.TOTP(setup["secret"]).now()))

    api = APIClient()
    login = api.post("/api/v1/auth/login/", {"login": "lockout2fa", "password": "Secret123"}, format="json")
    challenge = login.data["challenge"]

    for _ in range(5):
        res = api.post("/api/v1/auth/2fa/verify/", {"challenge": challenge, "code": "000000"}, format="json")
        assert res.status_code == 400

    valid_code = pyotp.TOTP(setup["secret"]).now()
    blocked = api.post("/api/v1/auth/2fa/verify/", {"challenge": challenge, "code": valid_code}, format="json")
    assert blocked.status_code == 400
    assert "Limite de tentativas" in str(blocked.data)


@pytest.mark.django_db
def test_twofa_challenge_cannot_be_replayed():
    from django.core.cache import cache
    cache.clear()
    scope = DependencyInjection.root().create_scope()
    users = scope.resolve(IUserRepository)
    confirm = scope.resolve(ConfirmTwoFactorUseCase)
    user = get_user_model().objects.create_user(username="replay2fa", email="replay2fa@test.dev", password="Secret123")
    setup = SetupTwoFactorUseCase(users).execute(user.id)
    confirm.execute(ConfirmTwoFactorInput(user.id, pyotp.TOTP(setup["secret"]).now()))

    api = APIClient()
    login = api.post("/api/v1/auth/login/", {"login": "replay2fa", "password": "Secret123"}, format="json")
    challenge = login.data["challenge"]

    valid_code = pyotp.TOTP(setup["secret"]).now()
    first = api.post("/api/v1/auth/2fa/verify/", {"challenge": challenge, "code": valid_code}, format="json")
    assert first.status_code == 200

    second = api.post("/api/v1/auth/2fa/verify/", {"challenge": challenge, "code": valid_code}, format="json")
    assert second.status_code == 400
    assert "expirado" in str(second.data)


def test_twofa_view_uses_twofactor_throttle():
    from apps.accounts.presentation.throttling import TwoFactorRateThrottle
    from apps.accounts.presentation.views.auth import VerifyTwoFactorLoginView
    assert TwoFactorRateThrottle in VerifyTwoFactorLoginView.throttle_classes
