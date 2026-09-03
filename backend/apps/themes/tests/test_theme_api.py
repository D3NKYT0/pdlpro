import io
import json
import zipfile

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from apps.themes.infrastructure.models import ThemePackage

User = get_user_model()


def theme_zip(*, slug="valorem", version="1.0.0", extra=None, manifest_overrides=None):
    manifest = {
        "schemaVersion": 1,
        "pdlVersion": 2,
        "id": slug,
        "name": "Valorem",
        "version": version,
        "author": "PDL Team",
        "description": "Tema de teste",
        "entrypoint": "theme.css",
        "assets": {"images/logo.png": "assets/logo.png"},
    }
    manifest.update(manifest_overrides or {})
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("theme.json", json.dumps(manifest))
        archive.writestr("theme.css", ':root { --pdl-color-primary: #d4af61; background-image: url("assets/logo.png"); }')
        archive.writestr("assets/logo.png", b"not-an-executable")
        for name, content in (extra or {}).items():
            archive.writestr(name, content)
    return output.getvalue()


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def admin(db):
    return User.objects.create_superuser("root", "root@pdl.dev", "Secret123")


@pytest.mark.django_db
def test_default_is_public_and_preserved_when_no_package_is_active(api):
    response = api.get("/api/v1/public/theme/")
    assert response.status_code == 200
    assert response.data == {
        "id": "default", "package_id": None, "name": "PDL Default", "version": "2.0.0",
        "author": "PDL", "description": "Tema original preservado do PDL PRO.",
        "active": True, "builtin": True, "base_url": "/theme/default/",
        "stylesheet_url": None, "assets": {},
        "presentation": None,
    }
    assert "max-age=0" in response["Cache-Control"]
    assert "must-revalidate" in response["Cache-Control"]


@pytest.mark.django_db
def test_declarative_presentation_is_validated_and_published(api, admin, tmp_path, settings):
    settings.MEDIA_ROOT = tmp_path
    presentation = {
        "renderer": "portal-v1",
        "navigation": [{"label": "HOME", "to": "/"}],
        "home": {
            "hero": {
                "title": "Welcome", "description": "Valorem", "countdownLabel": "OPENING IN",
                "countdownAt": "2027-01-01T18:00:00Z", "actionLabel": "CONNECT", "actionTo": "/downloads",
            },
            "features": {
                "title": "Systems", "subtitle": "Exclusive mechanics", "actionLabel": "SEE ALL",
                "actionTo": "/informacoes", "items": [
                    {"title": "Economy", "description": "Balanced", "asset": "images/logo.png"},
                ],
            },
            "ranking": {
                "title": "Rating", "subtitle": "Server information", "actionLabel": "FULL RATING",
                "actionTo": "/rankings", "tabs": [{"id": "pvp", "label": "TOP PVP", "kind": "pvp"}],
            },
            "cta": {
                "title": "Ready?", "description": "Join now", "actionLabel": "CREATE ACCOUNT",
                "actionTo": "/register",
            },
            "news": {"title": "NEWS"},
        },
        "footer": {"tagline": "A unique server", "copyright": "PDL"},
        "shells": {
            "auth": {"kicker": "ENTER THE REALM", "brand": "VALOREM"},
            "panel": {"kicker": "WARRIOR'S SANCTUM", "brand": "VALOREM"},
            "admin": {"kicker": "ROYAL COMMAND", "brand": "VALOREM ADMIN"},
        },
    }
    api.force_authenticate(admin)
    installed = api.post(
        "/api/v1/staff/themes/",
        {"package": SimpleUploadedFile(
            "valorem.zip", theme_zip(manifest_overrides={"presentation": presentation}),
            content_type="application/zip",
        )},
        format="multipart",
    )
    assert installed.status_code == 201, installed.data
    assert installed.data["presentation"] == presentation


@pytest.mark.django_db
def test_presentation_rejects_executable_or_external_navigation(api, admin, tmp_path, settings):
    settings.MEDIA_ROOT = tmp_path
    api.force_authenticate(admin)
    response = api.post(
        "/api/v1/staff/themes/",
        {"package": SimpleUploadedFile(
            "unsafe.zip",
            theme_zip(manifest_overrides={
                "presentation": {
                    "renderer": "javascript", "navigation": [{"label": "BAD", "to": "https://evil.test"}],
                    "home": {}, "footer": {},
                },
            }),
            content_type="application/zip",
        )},
        format="multipart",
    )
    assert response.status_code == 400
    assert ThemePackage.objects.count() == 0


@pytest.mark.django_db
def test_only_superadmin_can_install_theme(api, tmp_path, settings):
    settings.MEDIA_ROOT = tmp_path
    player = User.objects.create_user("hero", "hero@pdl.dev", "Secret123", is_staff=True)
    api.force_authenticate(player)
    response = api.post(
        "/api/v1/staff/themes/",
        {"package": SimpleUploadedFile("valorem.zip", theme_zip(), content_type="application/zip")},
        format="multipart",
    )
    assert response.status_code == 403
    assert ThemePackage.objects.count() == 0


@pytest.mark.django_db
def test_install_activate_restore_default_and_delete(api, admin, tmp_path, settings):
    settings.MEDIA_ROOT = tmp_path
    api.force_authenticate(admin)
    installed = api.post(
        "/api/v1/staff/themes/",
        {"package": SimpleUploadedFile("valorem.zip", theme_zip(), content_type="application/zip")},
        format="multipart",
    )
    assert installed.status_code == 201, installed.data
    package_id = installed.data["package_id"]
    storage_path = ThemePackage.objects.get().storage_path
    assert installed.data["active"] is False
    assert (tmp_path / "themes" / ThemePackage.objects.get().storage_path / "theme.css").is_file()

    activated = api.post(f"/api/v1/staff/themes/{package_id}/activate/")
    assert activated.status_code == 200
    assert activated.data["id"] == "valorem"
    assert api.get("/api/v1/public/theme/").data["stylesheet_url"].endswith("/theme.css")

    cannot_delete = api.delete(f"/api/v1/staff/themes/{package_id}/")
    assert cannot_delete.status_code == 409
    restored = api.post("/api/v1/staff/themes/default/activate/")
    assert restored.data["id"] == "default"
    removed = api.delete(f"/api/v1/staff/themes/{package_id}/")
    assert removed.status_code == 204
    assert ThemePackage.objects.count() == 0
    assert not (tmp_path / "themes" / storage_path).exists()


@pytest.mark.django_db
def test_duplicate_version_is_rejected_without_overwriting(api, admin, tmp_path, settings):
    settings.MEDIA_ROOT = tmp_path
    api.force_authenticate(admin)
    def upload():
        return SimpleUploadedFile("valorem.zip", theme_zip(), content_type="application/zip")
    assert api.post("/api/v1/staff/themes/", {"package": upload()}, format="multipart").status_code == 201
    repeated = api.post("/api/v1/staff/themes/", {"package": upload()}, format="multipart")
    assert repeated.status_code == 409
    assert ThemePackage.objects.count() == 1


@pytest.mark.django_db
@pytest.mark.parametrize(
    "archive, message",
    [
        (theme_zip(slug="default"), "reservado"),
        (theme_zip(manifest_overrides={"pdlVersion": 1}), "compatível"),
        (b"not-a-zip", "ZIP válido"),
        (theme_zip(extra={"../escape.css": "body{}"}), "caminho"),
        (theme_zip(extra={"payload.js": "alert(1)"}), "tipo de arquivo"),
    ],
)
def test_invalid_or_unsafe_package_is_rejected(api, admin, tmp_path, settings, archive, message):
    settings.MEDIA_ROOT = tmp_path
    api.force_authenticate(admin)
    response = api.post(
        "/api/v1/staff/themes/",
        {"package": SimpleUploadedFile("theme.zip", archive, content_type="application/zip")},
        format="multipart",
    )
    assert response.status_code == 400
    assert message.lower() in response.data["message"].lower()
    assert ThemePackage.objects.count() == 0
    assert not any((tmp_path / "themes").glob(".*")) if (tmp_path / "themes").exists() else True
