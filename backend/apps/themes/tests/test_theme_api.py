import io
import json
import os
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
        "id": "default", "package_id": None, "name": "PDL Classic", "version": "2.0.0",
        "author": "PDL", "description": "Visual clássico do PDL PRO — Aden, tipografia e a identidade original.",
        "active": True, "builtin": True, "base_url": "/theme/default/",
        "stylesheet_url": None, "assets": {},
        "presentation": None, "layout": None, "metadata": None,
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
                "actionTo": "/info", "items": [
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
@pytest.mark.skipif(os.name == "nt", reason="umask e modo POSIX não se aplicam no Windows")
def test_installed_theme_is_readable_by_the_web_nginx_user(api, admin, tmp_path, settings):
    settings.MEDIA_ROOT = tmp_path
    api.force_authenticate(admin)
    previous = os.umask(0o077)
    try:
        installed = api.post(
            "/api/v1/staff/themes/",
            {"package": SimpleUploadedFile("valorem.zip", theme_zip(), content_type="application/zip")},
            format="multipart",
        )
    finally:
        os.umask(previous)
    assert installed.status_code == 201, installed.data
    storage = tmp_path / "themes" / ThemePackage.objects.get().storage_path
    css = storage / "theme.css"
    assert css.is_file()
    assert css.stat().st_mode & 0o004
    assert storage.stat().st_mode & 0o001
    assert (tmp_path / "themes").stat().st_mode & 0o001
    assert tmp_path.stat().st_mode & 0o001


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

    live = tmp_path / "themes" / storage_path / "theme.json"
    payload = json.loads(live.read_text(encoding="utf-8"))
    payload["assets"]["images/pdl-symbol.svg"] = "images/pdl-symbol.png"
    live.write_text(json.dumps(payload), encoding="utf-8")
    (tmp_path / "themes" / storage_path / "images").mkdir(exist_ok=True)
    (tmp_path / "themes" / storage_path / "images" / "pdl-symbol.png").write_bytes(b"crest")
    published = api.get("/api/v1/public/theme/").data
    assert published["assets"]["images/pdl-symbol.svg"].endswith("images/pdl-symbol.png")

    cannot_delete = api.delete(f"/api/v1/staff/themes/{package_id}/")
    assert cannot_delete.status_code == 409
    restored = api.post("/api/v1/staff/themes/default/activate/")
    assert restored.data["id"] == "default"
    removed = api.delete(f"/api/v1/staff/themes/{package_id}/")
    assert removed.status_code == 204
    assert ThemePackage.objects.count() == 0
    assert not (tmp_path / "themes" / storage_path).exists()


@pytest.mark.django_db
def test_package_can_include_hero_mp4(api, admin, tmp_path, settings):
    settings.MEDIA_ROOT = tmp_path
    api.force_authenticate(admin)
    archive = theme_zip(
        extra={"images/video.mp4": b"hero-mp4"},
        manifest_overrides={
            "assets": {
                "images/logo.png": "assets/logo.png",
                "images/video.mp4": "images/video.mp4",
            }
        },
    )
    installed = api.post(
        "/api/v1/staff/themes/",
        {"package": SimpleUploadedFile("valorem.zip", archive, content_type="application/zip")},
        format="multipart",
    )
    assert installed.status_code == 201, installed.data
    storage = tmp_path / "themes" / ThemePackage.objects.get().storage_path
    assert (storage / "images" / "video.mp4").read_bytes() == b"hero-mp4"
    activated = api.post(f"/api/v1/staff/themes/{installed.data['package_id']}/activate/")
    assert activated.status_code == 200
    published = api.get("/api/v1/public/theme/").data
    assert published["assets"]["images/video.mp4"].endswith("images/video.mp4")


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


@pytest.mark.django_db
def test_layout_block_is_validated_and_published(api, admin, tmp_path, settings):
    settings.MEDIA_ROOT = tmp_path
    layout = {
        "panel": {"sidebarWidth": 288, "density": "compact", "radius": 6},
        "public": {"headerHeight": 72, "containerWidth": 1200},
        "surfaces": {
            "buttonPrimary": "images/logo.png",
            "buttonSecondary": "images/logo.png",
            "buttonTab": "images/logo.png",
        },
    }
    api.force_authenticate(admin)
    installed = api.post(
        "/api/v1/staff/themes/",
        {"package": SimpleUploadedFile(
            "valorem.zip", theme_zip(manifest_overrides={"layout": layout}),
            content_type="application/zip",
        )},
        format="multipart",
    )
    assert installed.status_code == 201, installed.data
    assert installed.data["layout"] == layout


@pytest.mark.django_db
@pytest.mark.parametrize(
    "layout",
    [
        {"panel": {"sidebarWidth": 100}},
        {"panel": {"density": "huge"}},
        {"surfaces": {"buttonPrimary": "images/missing.png"}},
        {"unknown": True},
    ],
)
def test_layout_rejects_invalid_knobs(api, admin, tmp_path, settings, layout):
    settings.MEDIA_ROOT = tmp_path
    api.force_authenticate(admin)
    response = api.post(
        "/api/v1/staff/themes/",
        {"package": SimpleUploadedFile(
            "bad.zip", theme_zip(manifest_overrides={"layout": layout}),
            content_type="application/zip",
        )},
        format="multipart",
    )
    assert response.status_code == 400
    assert ThemePackage.objects.count() == 0


@pytest.mark.django_db
def test_club_renderer_accepts_cinematic_home_contract(api, admin, tmp_path, settings):
    settings.MEDIA_ROOT = tmp_path
    presentation = {
        "renderer": "club-v1",
        "navigation": [{"label": "HOME", "to": "/"}],
        "home": {
            "hero": {
                "title": "Saga Club", "kicker": "LINEAGE 2", "subtitle": "INTERLUDE 20X",
                "description": "Classic spirit", "countdownLabel": "OPENING IN",
                "countdownAt": "2027-01-01T18:00:00Z", "actionLabel": "PLAY NOW",
                "actionTo": "/register", "secondaryLabel": "LEARN MORE", "secondaryTo": "/info",
            },
            "features": {
                "title": "Why", "subtitle": "Balance", "actionLabel": "SEE ALL",
                "actionTo": "/info", "items": [
                    {"title": "Interlude", "description": "Golden era", "asset": "images/logo.png"},
                ],
            },
            "ranking": {
                "title": "Top", "subtitle": "Names", "actionLabel": "FULL",
                "actionTo": "/rankings", "tabs": [{"id": "pvp", "label": "PVP", "kind": "pvp"}],
            },
            "cta": {"title": "Join", "description": "Now", "actionLabel": "CREATE", "actionTo": "/register"},
            "news": {"title": "NEWS"},
            "stats": {"items": [
                {"id": "online", "label": "Online", "kind": "online"},
                {"id": "rates", "label": "Rates", "kind": "custom", "value": "20x"},
            ]},
            "pillars": {"title": "Pillars", "items": [{"title": "PvP", "description": "Skill wins"}]},
            "sections": ["hero", "stats", "features", "pillars", "cta"],
        },
        "footer": {"tagline": "Club", "copyright": "Saga"},
    }
    api.force_authenticate(admin)
    installed = api.post(
        "/api/v1/staff/themes/",
        {"package": SimpleUploadedFile(
            "saga.zip", theme_zip(slug="saga", manifest_overrides={"presentation": presentation}),
            content_type="application/zip",
        )},
        format="multipart",
    )
    assert installed.status_code == 201, installed.data
    assert installed.data["presentation"]["renderer"] == "club-v1"
    assert installed.data["presentation"]["home"]["stats"]["items"][1]["value"] == "20x"


@pytest.mark.django_db
def test_club_renderer_rejects_portal_only_section_abuse(api, admin, tmp_path, settings):
    settings.MEDIA_ROOT = tmp_path
    api.force_authenticate(admin)
    response = api.post(
        "/api/v1/staff/themes/",
        {"package": SimpleUploadedFile(
            "bad.zip",
            theme_zip(manifest_overrides={
                "presentation": {
                    "renderer": "portal-v1",
                    "navigation": [{"label": "HOME", "to": "/"}],
                    "home": {
                        "hero": {
                            "title": "Welcome", "description": "Valorem", "countdownLabel": "OPENING IN",
                            "countdownAt": "2027-01-01T18:00:00Z", "actionLabel": "CONNECT",
                            "actionTo": "/downloads",
                        },
                        "features": {
                            "title": "Systems", "subtitle": "Exclusive", "actionLabel": "SEE ALL",
                            "actionTo": "/info",
                            "items": [{"title": "Economy", "description": "Balanced", "asset": "images/logo.png"}],
                        },
                        "ranking": {
                            "title": "Rating", "subtitle": "Info", "actionLabel": "FULL",
                            "actionTo": "/rankings", "tabs": [{"id": "pvp", "label": "PVP", "kind": "pvp"}],
                        },
                        "cta": {"title": "Ready", "description": "Join", "actionLabel": "GO", "actionTo": "/register"},
                        "news": {"title": "NEWS"},
                        "sections": ["stats"],
                    },
                    "footer": {"tagline": "X", "copyright": "Y"},
                },
            }),
            content_type="application/zip",
        )},
        format="multipart",
    )
    assert response.status_code == 400
    assert ThemePackage.objects.count() == 0


@pytest.mark.django_db
def test_presentation_sections_order_is_published(api, admin, tmp_path, settings):
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
                "actionTo": "/info", "items": [
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
            "sections": ["cta", "hero", "features"],
        },
        "footer": {"tagline": "A unique server", "copyright": "PDL"},
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
    assert installed.data["presentation"]["home"]["sections"] == ["cta", "hero", "features"]


@pytest.mark.django_db
def test_presentation_rejects_duplicate_or_unknown_sections(api, admin, tmp_path, settings):
    settings.MEDIA_ROOT = tmp_path
    api.force_authenticate(admin)
    response = api.post(
        "/api/v1/staff/themes/",
        {"package": SimpleUploadedFile(
            "bad.zip",
            theme_zip(manifest_overrides={
                "presentation": {
                    "renderer": "portal-v1",
                    "navigation": [{"label": "HOME", "to": "/"}],
                    "home": {
                        "hero": {
                            "title": "Welcome", "description": "Valorem", "countdownLabel": "OPENING IN",
                            "countdownAt": "2027-01-01T18:00:00Z", "actionLabel": "CONNECT",
                            "actionTo": "/downloads",
                        },
                        "features": {
                            "title": "Systems", "subtitle": "Exclusive", "actionLabel": "SEE ALL",
                            "actionTo": "/info",
                            "items": [{"title": "Economy", "description": "Balanced", "asset": "images/logo.png"}],
                        },
                        "ranking": {
                            "title": "Rating", "subtitle": "Info", "actionLabel": "FULL",
                            "actionTo": "/rankings", "tabs": [{"id": "pvp", "label": "TOP PVP", "kind": "pvp"}],
                        },
                        "cta": {
                            "title": "Ready?", "description": "Join", "actionLabel": "CREATE",
                            "actionTo": "/register",
                        },
                        "news": {"title": "NEWS"},
                        "sections": ["hero", "hero"],
                    },
                    "footer": {"tagline": "tag", "copyright": "c"},
                },
            }),
            content_type="application/zip",
        )},
        format="multipart",
    )
    assert response.status_code == 400
    assert ThemePackage.objects.count() == 0


def _site_metadata():
    return {
        "schemaVersion": 1,
        "site": {"name": "Cruma", "slogan": "A Torre", "description": "Pedra antiga"},
        "seo": {"title": "Cruma SEO", "ogImage": "images/logo.png"},
        "social": {"discordUrl": "https://discord.gg/cruma", "trailerYoutubeId": "abcdefghijk"},
        "server": {"chronicle": "Interlude", "maxLevel": 77, "rates": {"xp": "x10"}},
    }


@pytest.mark.django_db
def test_metadata_file_is_validated_and_published(api, admin, tmp_path, settings):
    settings.MEDIA_ROOT = tmp_path
    metadata = _site_metadata()
    api.force_authenticate(admin)
    installed = api.post(
        "/api/v1/staff/themes/",
        {
            "package": SimpleUploadedFile(
                "valorem.zip",
                theme_zip(
                    extra={"metadados.json": json.dumps(metadata)},
                    manifest_overrides={"metadata": "metadados.json"},
                ),
                content_type="application/zip",
            )
        },
        format="multipart",
    )
    assert installed.status_code == 201, installed.data
    assert installed.data["metadata"]["site"]["name"] == "Cruma"
    assert installed.data["metadata"]["seo"]["ogImage"] == "images/logo.png"
    activated = api.post(f"/api/v1/staff/themes/{installed.data['package_id']}/activate/")
    assert activated.status_code == 200
    public = api.get("/api/v1/public/theme/").data
    assert public["metadata"]["social"]["discordUrl"] == "https://discord.gg/cruma"
    info = api.get("/api/v1/public/server/info/").data
    assert info["name"] == "Cruma"
    assert info["seo_title"] == "Cruma SEO"
    assert info["discord_url"] == "https://discord.gg/cruma"
    assert info["rates"]["xp"] == "x10"
    assert info["site_name_customized"] is True
    from apps.server.infrastructure.models import IndexConfig
    IndexConfig.objects.create(name="Imperium", seo_title="Admin SEO", is_active=True)
    overridden = api.get("/api/v1/public/server/info/").data
    assert overridden["name"] == "Imperium"
    assert overridden["seo_title"] == "Admin SEO"
    assert overridden["discord_url"] == "https://discord.gg/cruma"


@pytest.mark.django_db
def test_metadata_live_reload_updates_public_overlay(api, admin, tmp_path, settings):
    settings.MEDIA_ROOT = tmp_path
    api.force_authenticate(admin)
    installed = api.post(
        "/api/v1/staff/themes/",
        {
            "package": SimpleUploadedFile(
                "valorem.zip",
                theme_zip(
                    extra={"metadados.json": json.dumps(_site_metadata())},
                    manifest_overrides={"metadata": "metadados.json"},
                ),
                content_type="application/zip",
            )
        },
        format="multipart",
    )
    api.post(f"/api/v1/staff/themes/{installed.data['package_id']}/activate/")
    storage = tmp_path / "themes" / ThemePackage.objects.get().storage_path
    live = json.loads((storage / "metadados.json").read_text(encoding="utf-8"))
    live["site"]["name"] = "Cruma Live"
    (storage / "metadados.json").write_text(json.dumps(live), encoding="utf-8")
    assert api.get("/api/v1/public/theme/").data["metadata"]["site"]["name"] == "Cruma Live"
    assert api.get("/api/v1/public/server/info/").data["name"] == "Cruma Live"


@pytest.mark.django_db
@pytest.mark.parametrize(
    "archive, message",
    [
        (
            theme_zip(extra={"metadados.json": json.dumps({"schemaVersion": 1, "site": {"name": "X"}})}),
            "aponta",
        ),
        (
            theme_zip(manifest_overrides={"metadata": "metadados.json"}),
            "não está no pacote",
        ),
        (
            theme_zip(
                extra={"metadados.json": json.dumps({"schemaVersion": 1, "unknown": True})},
                manifest_overrides={"metadata": "metadados.json"},
            ),
            "desconhecidas",
        ),
        (
            theme_zip(extra={"extra.json": "{}"}),
            "formato JSON",
        ),
    ],
)
def test_metadata_contract_is_enforced(api, admin, tmp_path, settings, archive, message):
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
