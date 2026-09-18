import gzip
import json
from datetime import timedelta
from pathlib import Path

import pytest
from django.core import mail
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.infrastructure.models import DataExportLog, User


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user("lgpdhero", "lgpdhero@pdl.dev", password="Secret123!")


@pytest.fixture(autouse=True)
def clear_lgpd_throttle_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.mark.django_db
def test_export_data_creates_package_and_emails_link(api, user, settings, tmp_path):
    settings.PRIVATE_MEDIA_ROOT = tmp_path
    settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
    api.force_authenticate(user=user)

    response = api.post("/api/v1/shared/me/export-data/", {}, format="json")
    assert response.status_code == 200
    assert "Pacote LGPD" in response.data["detail"]
    assert response.data["download_url"]
    assert DataExportLog.objects.filter(user=user).count() == 1
    assert len(mail.outbox) == 1

    export = DataExportLog.objects.get(user=user)
    with export.export_file.open("rb") as handle:
        stored = handle.read()
    assert not stored.startswith(b"\x1f\x8b")
    from common.crypto import field_cipher_from_settings

    payload = json.loads(gzip.decompress(field_cipher_from_settings().unseal_bytes(stored)).decode("utf-8"))
    assert payload["user"]["email"] == "lgpdhero@pdl.dev"
    assert payload["user"]["username"] == "lgpdhero"

    reused = api.post("/api/v1/shared/me/export-data/", {}, format="json")
    assert reused.status_code == 200
    assert reused.data.get("download_url")
    assert DataExportLog.objects.filter(user=user).count() == 1


@pytest.mark.django_db
def test_delete_account_requires_valid_code_then_anonymizes(api, user, settings):
    settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
    api.force_authenticate(user=user)

    code_resp = api.post("/api/v1/shared/me/request-delete-code/", {}, format="json")
    assert code_resp.status_code == 202
    assert len(mail.outbox) == 1
    body = mail.outbox[0].body
    code = next(part for part in body.replace(".", " ").split() if part.isdigit() and len(part) == 6)

    bad = api.post("/api/v1/shared/me/delete-account/", {"code": "000000"}, format="json")
    assert bad.status_code == 400

    ok = api.post("/api/v1/shared/me/delete-account/", {"code": code}, format="json")
    assert ok.status_code == 200
    user.refresh_from_db()
    assert user.is_active is False
    assert user.email.endswith("@anonymized.local")
    assert user.username.startswith("anon")
    assert not user.has_usable_password()


@pytest.mark.django_db
def test_export_download_serves_signed_file(api, settings, tmp_path):
    settings.PRIVATE_MEDIA_ROOT = tmp_path
    settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
    user = User.objects.create_user("lgpddl", "lgpddl@pdl.dev", password="Secret123!")
    api.force_authenticate(user=user)
    created = api.post("/api/v1/shared/me/export-data/", {}, format="json")
    assert created.status_code == 200, created.data
    url = created.data["download_url"]
    path = url[url.find("/api/") :]
    download = APIClient().get(path)
    assert download.status_code == 200
    assert "gzip" in download["Content-Type"]
    payload = json.loads(gzip.decompress(download.content).decode("utf-8"))
    assert payload["user"]["username"] == "lgpddl"


@pytest.mark.django_db
def test_export_package_is_stored_outside_media_and_has_no_public_url(api, user, settings, tmp_path):
    private_root = tmp_path / "private"
    settings.PRIVATE_MEDIA_ROOT = private_root
    settings.MEDIA_ROOT = tmp_path / "media"
    settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
    api.force_authenticate(user=user)

    response = api.post("/api/v1/shared/me/export-data/", {}, format="json")
    assert response.status_code == 200, response.data

    export = DataExportLog.objects.get(user=user)
    stored = Path(export.export_file.path)
    assert stored.is_file()
    assert private_root in stored.parents
    assert not (tmp_path / "media").exists()
    # O nome não pode ser adivinhável a partir do horário da solicitação.
    assert len(stored.stem) > len("pdl-lgpd-2026-01-01T00-00-00")
    with pytest.raises(ValueError):
        _ = export.export_file.url


@pytest.mark.django_db
def test_export_download_refuses_tampered_and_expired_tokens(api, user, settings, tmp_path):
    settings.PRIVATE_MEDIA_ROOT = tmp_path
    settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
    api.force_authenticate(user=user)
    created = api.post("/api/v1/shared/me/export-data/", {}, format="json")
    url = created.data["download_url"]
    path = url[url.find("/api/") :]

    tampered = APIClient().get(path.replace(path[-8:-1], "0000000"))
    assert tampered.status_code == 404

    DataExportLog.objects.filter(user=user).update(expires_at=timezone.now() - timedelta(minutes=1))
    expired = APIClient().get(path)
    assert expired.status_code == 403
    assert "Content-Disposition" not in expired
