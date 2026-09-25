"""API e store do configurador de integrações (cifrado + hot-apply)."""

from __future__ import annotations

import pytest
from django.core import mail
from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.infrastructure.models import User
from apps.server.infrastructure.sqlalchemy_gateway import SqlAlchemyLineageGateway
from apps.staff.domain.integrations import CLEAR_SENTINEL, SECTION_PAYMENTS
from apps.staff.infrastructure.integrations import (
    REV_CACHE_KEY,
    DjangoIntegrationConfigStore,
    DjangoRuntimeSettingsApplier,
)
from apps.staff.infrastructure.models import IntegrationSettings
from common.crypto import field_cipher_from_settings
from common.secrets_env import fingerprint


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def hosts(settings):
    settings.ALLOWED_HOSTS = ["painel.example.com", "testserver", "localhost"]
    return settings


@pytest.fixture
def superuser(db):
    return User.objects.create_superuser(
        username="ops",
        email="ops@pdl.dev",
        password="Secret123!",
    )


@pytest.fixture
def staff_user(db):
    return User.objects.create_user(
        username="gm",
        email="gm@pdl.dev",
        password="Secret123!",
        is_staff=True,
    )


@pytest.fixture(autouse=True)
def _reset_overlay_state(settings):
    import apps.staff.infrastructure.integrations as mod

    mod._local_rev = 0
    mod._boot_defaults = None
    mod._process_bootstrapped = False
    yield
    mod._local_rev = 0
    mod._boot_defaults = None
    mod._process_bootstrapped = False


@pytest.mark.django_db
def test_integrations_status_requires_superuser(api, staff_user, superuser, hosts):
    url = reverse("staff-integrations-status")
    api.force_authenticate(staff_user)
    assert api.get(url).status_code == 403
    api.force_authenticate(superuser)
    response = api.get(url)
    assert response.status_code == 200
    body = response.json()
    assert "payments" in body
    assert "lineage" in body
    assert "smtp" in body
    assert "oauth" in body
    assert "denkynho" in body
    assert "storage" in body
    assert "observability" in body
    assert "revision" in body


@pytest.mark.django_db
def test_get_never_returns_secret_plaintext(api, superuser, hosts, settings):
    settings.STRIPE_SECRET_KEY = "sk_live_should_not_leak"
    store = DjangoIntegrationConfigStore()
    store.save_section(
        SECTION_PAYMENTS,
        {
            "STRIPE_SECRET_KEY": "sk_test_sealed_value",
            "STRIPE_ACTIVATE_PAYMENTS": True,
        },
    )
    DjangoRuntimeSettingsApplier(store).apply_section(SECTION_PAYMENTS)

    api.force_authenticate(superuser)
    body = api.get(reverse("staff-integrations-status")).json()
    payload = str(body)
    assert "sk_test_sealed_value" not in payload
    assert "sk_live_should_not_leak" not in payload
    stripe = next(f for f in body["payments"]["fields"] if f["key"] == "STRIPE_SECRET_KEY")
    assert stripe["configured"] is True
    assert stripe["fingerprint"] == fingerprint("sk_test_sealed_value")
    assert stripe.get("value") in (None, "")


@pytest.mark.django_db
def test_patch_keep_clear_replace(api, superuser, hosts, settings):
    settings.STRIPE_SECRET_KEY = "sk_env_default"
    api.force_authenticate(superuser)
    url = reverse("staff-integrations-section", kwargs={"section": "payments"})

    r1 = api.patch(
        url,
        {"STRIPE_SECRET_KEY": "sk_new", "STRIPE_ACTIVATE_PAYMENTS": True},
        format="json",
    )
    assert r1.status_code == 200, r1.content
    assert settings.STRIPE_SECRET_KEY == "sk_new"
    assert settings.STRIPE_ACTIVATE_PAYMENTS is True

    r2 = api.patch(url, {"STRIPE_SECRET_KEY": ""}, format="json")
    assert r2.status_code == 200
    assert settings.STRIPE_SECRET_KEY == "sk_new"

    r3 = api.patch(url, {"STRIPE_SECRET_KEY": CLEAR_SENTINEL}, format="json")
    assert r3.status_code == 200
    assert settings.STRIPE_SECRET_KEY == "sk_env_default"

    row = IntegrationSettings.objects.get(pk=1)
    assert row.payments_blob
    cipher = field_cipher_from_settings()
    assert "sk_new" not in row.payments_blob
    assert "sk_new" not in cipher.unseal_text(row.payments_blob)


@pytest.mark.django_db
def test_smtp_test_sends_mail(api, superuser, hosts, settings):
    settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
    api.force_authenticate(superuser)
    response = api.post(
        reverse("staff-integrations-test", kwargs={"section": "smtp"}),
        {},
        format="json",
    )
    assert response.status_code == 200, response.content
    body = response.json()
    assert body["ok"] is True
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == [superuser.email]


@pytest.mark.django_db
def test_payments_test_rejects_active_without_key(api, superuser, hosts, settings):
    settings.STRIPE_SECRET_KEY = ""
    settings.STRIPE_ACTIVATE_PAYMENTS = True
    settings.MERCADO_PAGO_ACCESS_TOKEN = ""
    settings.MERCADO_PAGO_ACTIVATE_PAYMENTS = False
    api.force_authenticate(superuser)
    response = api.post(
        reverse("staff-integrations-test", kwargs={"section": "payments"}),
        {},
        format="json",
    )
    assert response.status_code == 200
    assert response.json()["ok"] is False


@pytest.mark.django_db
def test_oauth_test_rejects_incomplete_pair(api, superuser, hosts, settings):
    settings.GOOGLE_CLIENT_ID = "google-id"
    settings.GOOGLE_CLIENT_SECRET = ""
    settings.DISCORD_CLIENT_ID = ""
    settings.DISCORD_CLIENT_SECRET = ""
    settings.HCAPTCHA_SITE_KEY = ""
    settings.HCAPTCHA_SECRET_KEY = ""
    settings.HCAPTCHA_ENABLED = False
    api.force_authenticate(superuser)
    response = api.post(
        reverse("staff-integrations-test", kwargs={"section": "oauth"}),
        {},
        format="json",
    )
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is False


@pytest.mark.django_db
def test_oauth_patch_enables_hcaptcha(api, superuser, hosts, settings):
    settings.HCAPTCHA_SITE_KEY = ""
    settings.HCAPTCHA_SECRET_KEY = ""
    settings.HCAPTCHA_ENABLED = False
    api.force_authenticate(superuser)
    response = api.patch(
        reverse("staff-integrations-section", kwargs={"section": "oauth"}),
        {
            "HCAPTCHA_SITE_KEY": "site-public",
            "HCAPTCHA_SECRET_KEY": "secret-private",
        },
        format="json",
    )
    assert response.status_code == 200, response.content
    assert settings.HCAPTCHA_ENABLED is True
    oauth = next(f for f in response.json()["oauth"]["fields"] if f["key"] == "HCAPTCHA_SECRET_KEY")
    assert oauth["configured"] is True
    assert "secret-private" not in str(response.json())


@pytest.mark.django_db
def test_applier_bumps_revision_and_refresh_reapplies(settings):
    import apps.staff.infrastructure.integrations as mod

    store = DjangoIntegrationConfigStore()
    applier = DjangoRuntimeSettingsApplier(store)
    store.save_section(SECTION_PAYMENTS, {"STRIPE_PUBLISHABLE_KEY": "pk_rev_1"})
    rev1 = applier.apply_section(SECTION_PAYMENTS)
    assert settings.STRIPE_PUBLISHABLE_KEY == "pk_rev_1"
    assert rev1 >= 1

    store.save_section(SECTION_PAYMENTS, {"STRIPE_PUBLISHABLE_KEY": "pk_rev_2"})
    # Simulate another worker bumping the cache without local apply
    cache.set(REV_CACHE_KEY, rev1 + 5, timeout=None)
    mod._local_rev = rev1
    mod._process_bootstrapped = True
    assert applier.refresh_if_stale() is True
    assert settings.STRIPE_PUBLISHABLE_KEY == "pk_rev_2"


@pytest.mark.django_db
def test_storage_patch_toggles_s3_backend(api, superuser, hosts, settings):
    settings.USE_S3 = False
    api.force_authenticate(superuser)
    response = api.patch(
        reverse("staff-integrations-section", kwargs={"section": "storage"}),
        {
            "USE_S3": True,
            "AWS_ACCESS_KEY_ID": "akid",
            "AWS_SECRET_ACCESS_KEY": "secret",
            "AWS_STORAGE_BUCKET_NAME": "pdl-media",
            "AWS_S3_ENDPOINT_URL": "https://example.r2.cloudflarestorage.com",
            "AWS_S3_CUSTOM_DOMAIN": "cdn.example.com",
            "AWS_LOCATION": "media",
        },
        format="json",
    )
    assert response.status_code == 200, response.content
    assert settings.USE_S3 is True
    assert settings.STORAGES["default"]["BACKEND"] == "common.storage_s3.MediaStorage"
    assert settings.MEDIA_URL.startswith("https://cdn.example.com/")
    assert "secret" not in str(response.json())


@pytest.mark.django_db
def test_payments_patch_methods_list(api, superuser, hosts, settings):
    api.force_authenticate(superuser)
    response = api.patch(
        reverse("staff-integrations-section", kwargs={"section": "payments"}),
        {"PAYMENT_METHODS": "stripe, mercadopago", "COINS_PER_USD": "7.50"},
        format="json",
    )
    assert response.status_code == 200, response.content
    assert settings.PAYMENT_METHODS == ["stripe", "mercadopago"]
    assert settings.COINS_PER_USD == "7.50"


@pytest.mark.django_db
def test_storage_test_local_ok(api, superuser, hosts, settings):
    settings.USE_S3 = False
    api.force_authenticate(superuser)
    response = api.post(
        reverse("staff-integrations-test", kwargs={"section": "storage"}),
        {},
        format="json",
    )
    assert response.status_code == 200
    assert response.json()["ok"] is True


def test_lineage_gateway_reset_engine_disposes_pool():
    class _FakeEngine:
        def __init__(self):
            self.disposed = False

        def dispose(self):
            self.disposed = True

    gateway = SqlAlchemyLineageGateway(queries={})  # type: ignore[arg-type]
    fake = _FakeEngine()
    gateway._engine = fake  # type: ignore[assignment]
    gateway.reset_engine()
    assert fake.disposed is True
    assert gateway._engine is None
