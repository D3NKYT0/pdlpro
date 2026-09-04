from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APIClient, APIRequestFactory
from rest_framework.throttling import AnonRateThrottle

from apps.server.domain.gateways import ILineageGateway
from apps.server.infrastructure.models import ManagedLineageAccount
from apps.server.infrastructure.null_gateway import NullLineageGateway
from apps.wallet.infrastructure.models import Wallet, WalletTransaction
from common.di.bootstrap import DependencyInjection


@pytest.fixture(autouse=True)
def isolated_gateway(settings):
    settings.HCAPTCHA_ENABLED = False
    settings.ALLOWED_HOSTS = ["testserver"]
    settings.ACCOUNT_EMAIL_VERIFICATION = "mandatory"
    gateway = DependencyInjection.root().resolve(ILineageGateway)
    assert isinstance(gateway, NullLineageGateway)
    gateway._accounts.clear()
    gateway._characters.clear()
    gateway._items.clear()
    cache.clear()
    yield gateway
    gateway._accounts.clear()
    gateway._characters.clear()
    gateway._items.clear()
    cache.clear()


@pytest.mark.django_db
def test_public_registration_cannot_take_over_unlinked_game_account(isolated_gateway):
    gateway = isolated_gateway
    gateway.register_account("victim", "VictimGamePassword1", "victim@example.invalid")
    api = APIClient(enforce_csrf_checks=True)
    registered = api.post(
        "/api/v1/auth/register/",
        {
            "username": "victim",
            "email": "attacker@example.invalid",
            "password": "AttackerPanelPassword1",
            "accept_terms": True,
        },
        format="json",
    )
    assert registered.status_code == 200, registered.data
    csrf = api.get("/api/v1/auth/csrf/").data["csrfToken"]
    assert not ManagedLineageAccount.objects.filter(login="victim").exists()
    changed = api.post(
        "/api/v1/customer/server/accounts/password/",
        {
            "login": "victim",
            "password": "AttackerGamePassword1",
        },
        format="json",
        HTTP_X_CSRFTOKEN=csrf,
    )
    assert changed.status_code == 403, changed.data
    assert gateway.validate_credentials("victim", "VictimGamePassword1")
    assert not gateway.validate_credentials("victim", "AttackerGamePassword1")


@pytest.mark.django_db
@pytest.mark.parametrize(
    "endpoint,payload,field,value",
    [
        ("nickname", {"name": "FreeNickname"}, "name", "FreeNickname"),
        ("sex", {"sex": "F"}, "sex", 1),
    ],
)
def test_paid_game_service_preserves_character_when_balance_is_insufficient(
    isolated_gateway, endpoint, payload, field, value
):
    gateway = isolated_gateway
    user = get_user_model().objects.create_user(
        username="payer", email="payer@example.invalid", password="PanelPassword1"
    )
    gateway.register_account("payer", "GamePassword1", user.email)
    gateway.link_account("payer", str(user.id))
    ManagedLineageAccount.objects.create(user=user, login="payer", is_primary=True)
    char = gateway.seed_character("payer", "OriginalName")
    wallet = Wallet.objects.create(user=user, balance=Decimal("0.00"))
    api = APIClient()
    api.force_authenticate(user=user)
    response = api.post(
        f"/api/v1/customer/server/characters/{endpoint}/",
        {
            "login": "payer",
            "char_id": char.char_id,
            **payload,
        },
        format="json",
    )
    assert response.status_code == 400, response.data
    assert response.data["error_code"] == "INSUFFICIENT_BALANCE", response.data
    observed = api.get(
        f"/api/v1/customer/server/characters/{char.char_id}/?login=payer"
    )
    assert observed.status_code == 200
    assert observed.data[field] == ("OriginalName" if field == "name" else 0)
    wallet.refresh_from_db()
    assert wallet.balance == Decimal("0.00")
    assert not WalletTransaction.objects.filter(wallet=wallet).exists()


@pytest.mark.django_db
def test_forwarded_header_changes_cannot_bypass_exhausted_anonymous_throttle(
    isolated_gateway,
):
    from apps.accounts.presentation.views.auth import LoginView

    api = APIClient()
    xff = "198.51.100.1, 203.0.113.5, 10.0.0.2"
    from django.contrib.auth.models import AnonymousUser

    request = APIRequestFactory().post(
        "/api/v1/auth/login/", HTTP_X_FORWARDED_FOR=xff, REMOTE_ADDR="10.0.0.3"
    )
    request.user = AnonymousUser()
    throttle = AnonRateThrottle()
    key = throttle.get_cache_key(request, LoginView())
    now = throttle.timer()
    cache.set(key, [now] * throttle.num_requests, throttle.duration)
    payload = {"login": "nonexistent", "password": "WrongPassword1"}
    blocked = api.post(
        "/api/v1/auth/login/",
        payload,
        format="json",
        HTTP_X_FORWARDED_FOR=xff,
        REMOTE_ADDR="10.0.0.3",
    )
    assert blocked.status_code == 429, blocked.data
    changed = api.post(
        "/api/v1/auth/login/",
        payload,
        format="json",
        HTTP_X_FORWARDED_FOR="198.51.100.2, 203.0.113.5, 10.0.0.2",
        REMOTE_ADDR="10.0.0.3",
    )
    assert changed.status_code == 429, changed.data


@pytest.mark.django_db
@pytest.mark.parametrize(
    "endpoint,payload", [("nickname", {"name": "PaidName"}), ("sex", {"sex": "F"})]
)
def test_service_repetition_and_ambiguous_failure_reserve_only_once(
    isolated_gateway, endpoint, payload, mocker
):
    from uuid import uuid4

    from apps.server.application.paid_services import settle_service
    from apps.server.infrastructure.service_models import CharacterServiceOperation

    gateway = isolated_gateway
    user = get_user_model().objects.create_user(
        username="payer", email="payer@example.invalid"
    )
    gateway.register_account("payer", "GamePassword1", user.email)
    gateway.link_account("payer", str(user.id))
    char = gateway.seed_character("payer", "OriginalName")
    wallet = Wallet.objects.create(user=user, balance=100)
    api = APIClient()
    api.force_authenticate(user)
    data = {
        "login": "payer",
        "char_id": char.char_id,
        "request_key": str(uuid4()),
        **payload,
    }
    action = "change_nickname" if endpoint == "nickname" else "change_sex"
    original = getattr(gateway, action)
    calls = []

    def lost_response(*args):
        calls.append(args)
        original(*args)
        raise TimeoutError("test timeout after commit")

    mocker.patch.object(gateway, action, side_effect=lost_response)
    path = f"/api/v1/customer/server/characters/{endpoint}/"
    assert api.post(path, data, format="json").status_code == 409
    for request in [data, {**data, "request_key": str(uuid4())}]:
        assert api.post(path, request, format="json").status_code == 409
    wallet.refresh_from_db()
    assert wallet.balance == 90
    assert len(calls) == 1
    row = CharacterServiceOperation.objects.get(user=user)
    assert row.status == "pending"
    settle_service(row.id, completed=True, note="Test operator verified game mutation")
    assert api.post(path, data, format="json").status_code == 200
    assert len(calls) == 1
    wallet.refresh_from_db()
    assert wallet.balance == 90


@pytest.mark.django_db
def test_known_service_rejection_refunds_once_and_conflicting_key_is_rejected(
    isolated_gateway, mocker
):
    from uuid import uuid4

    from apps.server.application.paid_services import settle_service
    from apps.server.domain.exceptions import NicknameTakenError
    from apps.server.infrastructure.service_models import CharacterServiceOperation

    gateway = isolated_gateway
    user = get_user_model().objects.create_user(
        username="payer", email="payer@example.invalid"
    )
    gateway.register_account("payer", "GamePassword1", user.email)
    gateway.link_account("payer", str(user.id))
    char = gateway.seed_character("payer", "OriginalName")
    wallet = Wallet.objects.create(user=user, balance=100)
    api = APIClient()
    api.force_authenticate(user)
    mocker.patch.object(gateway, "change_nickname", side_effect=NicknameTakenError())
    data = {
        "login": "payer",
        "char_id": char.char_id,
        "name": "TakenName",
        "request_key": str(uuid4()),
    }
    path = "/api/v1/customer/server/characters/nickname/"
    assert api.post(path, data, format="json").status_code == 409
    row = CharacterServiceOperation.objects.get(user=user)
    assert row.status == "rejected"
    settle_service(row.id, completed=False, note="Repeated reconciliation")
    assert api.post(path, data, format="json").status_code == 409
    assert (
        api.post(path, {**data, "name": "OtherName"}, format="json").status_code == 409
    )
    wallet.refresh_from_db()
    assert wallet.balance == 100
    assert WalletTransaction.objects.filter(wallet=wallet, kind="ENTRADA").count() == 1


@pytest.mark.django_db
@pytest.mark.parametrize("linked", [False, True])
def test_stale_local_record_does_not_authorize_game_access(isolated_gateway, linked):
    gateway = isolated_gateway
    owner = get_user_model().objects.create_user(
        username="owner", email="owner@example.invalid"
    )
    other = get_user_model().objects.create_user(
        username="other", email="other@example.invalid"
    )
    gateway.register_account("owner", "OriginalPassword1", owner.email)
    if linked:
        gateway.link_account("owner", str(other.id))
    ManagedLineageAccount.objects.create(user=owner, login="owner")
    api = APIClient()
    api.force_authenticate(owner)
    assert (
        api.post(
            "/api/v1/customer/server/accounts/password/",
            {"login": "owner", "password": "ChangedPassword1"},
            format="json",
        ).status_code
        == 403
    )
    assert gateway.validate_credentials("owner", "OriginalPassword1")


@pytest.mark.django_db
@pytest.mark.parametrize("result,expected", [("completed", 90), ("rejected", 100)])
def test_manual_reconciliation_changes_balance_once(result, expected):
    from io import StringIO
    from uuid import uuid4

    from django.core.management import call_command

    from apps.server.infrastructure.service_models import CharacterServiceOperation

    user = get_user_model().objects.create_user(username="operator-test", email="operator@example.invalid")
    wallet = Wallet.objects.create(user=user, balance=90)
    row = CharacterServiceOperation.objects.create(
        user=user,
        request_key=uuid4(),
        login="game",
        character_id=1,
        service="CHANGE_SEX",
        value="1",
        amount=10,
    )
    for _ in range(2):
        call_command(
            "reconcile_character_service",
            str(row.id),
            result=result,
            note="QA verified the game result",
            stdout=StringIO(),
        )
    row.refresh_from_db()
    wallet.refresh_from_db()
    assert row.status == result
    assert row.resolution_note == "QA verified the game result"
    assert wallet.balance == expected
    assert WalletTransaction.objects.filter(wallet=wallet).count() == (
        result == "rejected"
    )


@pytest.mark.django_db
@pytest.mark.parametrize(
    "operation,note",
    [
        ("invalid", "Checked"),
        ("00000000-0000-4000-8000-000000000000", "Checked"),
        ("invalid", " "),
    ],
)
def test_manual_reconciliation_rejects_invalid_operation_or_blank_evidence(
    operation, note
):
    from django.core.management import CommandError, call_command

    with pytest.raises(CommandError):
        call_command(
            "reconcile_character_service", operation, result="rejected", note=note
        )


@pytest.mark.django_db
def test_service_already_applied_does_not_charge_or_call_gateway(
    isolated_gateway, mocker
):
    gateway = isolated_gateway
    user = get_user_model().objects.create_user(username="payer", email="payer@example.invalid")
    gateway.register_account("payer", "GamePassword1", "payer@example.invalid")
    gateway.link_account("payer", str(user.id))
    char = gateway.seed_character("payer", "OriginalName")
    wallet = Wallet.objects.create(user=user, balance=0)
    mutation = mocker.spy(gateway, "change_nickname")
    api = APIClient()
    api.force_authenticate(user)
    response = api.post(
        "/api/v1/customer/server/characters/nickname/",
        {"login": "payer", "char_id": char.char_id, "name": "OriginalName"},
        format="json",
    )
    assert response.status_code == 200
    mutation.assert_not_called()
    wallet.refresh_from_db()
    assert wallet.balance == 0
    assert not WalletTransaction.objects.filter(wallet=wallet).exists()
