"""Estilos opcionais de página declarados pelo tema (`pages.info` / `pages.comingSoon`)."""

import copy

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from apps.themes.infrastructure.models import ThemePackage
from apps.themes.tests.test_theme_api import _presentation, theme_zip


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def admin(db):
    return get_user_model().objects.create_superuser("root", "root@pdl.dev", "Secret123")


GUIDE = {
    "style": "guide",
    "heroImage": "images/logo.png",
    "categories": [
        {"id": "general", "icon": "compass", "items": ["fairPlay", "farm"], "aliases": ["geral"]},
        {"id": "combat", "icon": "swords", "items": ["pvpZones"], "aliases": ["pvp"]},
    ],
}
MEMORIES = {
    "style": "memories",
    "timeZone": "America/Sao_Paulo",
    "background": "images/logo.png",
    "scenes": [
        {"id": "first-steps", "asset": "images/logo.png"},
        {"id": "siege", "asset": "images/logo.png", "focus": "50% 45%"},
    ],
}


def _install(api, admin, pages, *, presentation=None, version="1.0.0"):
    overrides = {"pages": pages}
    if presentation is not None:
        overrides["presentation"] = presentation
    api.force_authenticate(admin)
    return api.post(
        "/api/v1/staff/themes/",
        {"package": SimpleUploadedFile(
            "styles.zip",
            theme_zip(version=version, manifest_overrides=overrides),
            content_type="application/zip",
        )},
        format="multipart",
    )


def _with(**styles):
    return copy.deepcopy(styles)


@pytest.mark.django_db
def test_page_styles_are_validated_and_published_to_the_public_theme(api, admin, tmp_path, settings):
    settings.MEDIA_ROOT = tmp_path
    installed = _install(api, admin, _with(info=GUIDE, comingSoon=MEMORIES))
    assert installed.status_code == 201, installed.data
    assert installed.data["pages"] == {"info": GUIDE, "comingSoon": MEMORIES}
    assert installed.data["presentation"] is None

    api.post(f"/api/v1/staff/themes/{installed.data['package_id']}/activate/", {}, format="json")
    api.force_authenticate(None)
    public = api.get("/api/v1/public/theme/")
    assert public.status_code == 200
    assert public.data["pages"]["info"]["categories"][0]["aliases"] == ["geral"]
    assert public.data["pages"]["comingSoon"]["scenes"][1]["focus"] == "50% 45%"


@pytest.mark.django_db
def test_page_styles_coexist_with_a_renderer_presentation(api, admin, tmp_path, settings):
    settings.MEDIA_ROOT = tmp_path
    installed = _install(api, admin, _with(info=GUIDE), presentation=_presentation())
    assert installed.status_code == 201, installed.data
    assert installed.data["presentation"]["renderer"]
    assert installed.data["pages"]["info"]["style"] == "guide"


@pytest.mark.django_db
def test_theme_without_pages_and_default_theme_publish_null_pages(api, admin, tmp_path, settings):
    settings.MEDIA_ROOT = tmp_path
    api.force_authenticate(admin)
    installed = api.post(
        "/api/v1/staff/themes/",
        {"package": SimpleUploadedFile("plain.zip", theme_zip(), content_type="application/zip")},
        format="multipart",
    )
    assert installed.status_code == 201, installed.data
    assert installed.data["pages"] is None
    api.force_authenticate(None)
    assert api.get("/api/v1/public/theme/").data["pages"] is None


@pytest.mark.django_db
def test_presentation_rejects_page_styles_outside_pages(api, admin, tmp_path, settings):
    settings.MEDIA_ROOT = tmp_path
    presentation = {**_presentation(), "info": GUIDE}
    api.force_authenticate(admin)
    response = api.post(
        "/api/v1/staff/themes/",
        {"package": SimpleUploadedFile(
            "bad.zip", theme_zip(manifest_overrides={"presentation": presentation}),
            content_type="application/zip",
        )},
        format="multipart",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_classic_styles_need_no_content(api, admin, tmp_path, settings):
    settings.MEDIA_ROOT = tmp_path
    installed = _install(api, admin, _with(info={"style": "classic"}, comingSoon={"style": "classic"}))
    assert installed.status_code == 201, installed.data


def _guide(**changes):
    value = copy.deepcopy(GUIDE)
    value.update(changes)
    return value


def _memories(**changes):
    value = copy.deepcopy(MEMORIES)
    value.update(changes)
    return value


@pytest.mark.django_db
@pytest.mark.parametrize(
    "styles",
    [
        {"info": {"style": "cards"}},
        {"info": {"style": "guide"}},
        {"info": _guide(categories=[])},
        {"info": _guide(heroImage="images/missing.webp")},
        {"info": _guide(extra=True)},
        {"info": _guide(categories=[{"id": "Bad Id", "icon": "compass", "items": ["a"]}])},
        {"info": _guide(categories=[{"id": "general", "icon": "skull", "items": ["a"]}])},
        {"info": _guide(categories=[{"id": "general", "icon": "compass", "items": []}])},
        {"info": _guide(categories=[{"id": "general", "icon": "compass", "items": ["a", "a"]}])},
        {"info": _guide(categories=[{"id": "general", "icon": "compass", "items": ["<script>"]}])},
        {"info": _guide(categories=[
            {"id": "general", "icon": "compass", "items": ["a"]},
            {"id": "general", "icon": "coins", "items": ["b"]},
        ])},
        {"info": _guide(categories=[
            {"id": "general", "icon": "compass", "items": ["a"], "aliases": ["pvp"]},
            {"id": "pvp", "icon": "swords", "items": ["b"]},
        ])},
        {"info": _guide(categories=[{"id": "general", "icon": "compass", "items": ["a"]}] * 9)},
        {"comingSoon": {"style": "slideshow"}},
        {"comingSoon": {"style": "memories"}},
        {"comingSoon": _memories(scenes=[{"id": "vila", "asset": "images/missing.png"}])},
        {"comingSoon": _memories(scenes=[{"id": "vila", "asset": "images/logo.png", "focus": "left top"}])},
        {"comingSoon": _memories(scenes=[{"id": "vila", "asset": "images/logo.png", "focus": "150% 40%"}])},
        {"comingSoon": _memories(scenes=[
            {"id": "vila", "asset": "images/logo.png"}, {"id": "vila", "asset": "images/logo.png"},
        ])},
        {"comingSoon": _memories(timeZone="GMT-3; drop")},
        {"comingSoon": _memories(background="images/missing.jpg")},
        {"unknown": {"style": "guide"}},
    ],
)
def test_invalid_page_styles_are_rejected_without_installing(api, admin, tmp_path, settings, styles):
    settings.MEDIA_ROOT = tmp_path
    response = _install(api, admin, _with(**styles))
    assert response.status_code == 400
    assert ThemePackage.objects.count() == 0
    assert not (tmp_path / "themes" / "valorem").exists()


@pytest.mark.django_db
def test_only_superadmin_can_install_a_theme_with_page_styles(api, tmp_path, settings, django_user_model):
    settings.MEDIA_ROOT = tmp_path
    staff = django_user_model.objects.create_user("staff", "staff@pdl.dev", "Secret123", is_staff=True)
    response = _install(api, staff, _with(info=GUIDE))
    assert response.status_code in {401, 403}
    assert ThemePackage.objects.count() == 0


def _music_zip(asset_path):
    return theme_zip(
        extra={"audio/theme.mp3": b"ID3-fake", "audio/theme.wav": b"RIFF-fake"},
        manifest_overrides={
            "assets": {
                "images/logo.png": "assets/logo.png",
                "audio/theme.mp3": "audio/theme.mp3",
                "audio/theme.wav": "audio/theme.wav",
            },
            "pages": {"comingSoon": {"style": "classic", "music": asset_path}},
        },
    )


@pytest.mark.django_db
def test_coming_soon_music_accepts_declared_mp3_and_publishes_it(api, admin, tmp_path, settings):
    settings.MEDIA_ROOT = tmp_path
    api.force_authenticate(admin)
    archive = theme_zip(
        extra={"audio/theme.mp3": b"ID3-fake"},
        manifest_overrides={
            "assets": {"images/logo.png": "assets/logo.png", "audio/theme.mp3": "audio/theme.mp3"},
            "pages": {"comingSoon": {"style": "classic", "music": "audio/theme.mp3"}},
        },
    )
    response = api.post(
        "/api/v1/staff/themes/",
        {"package": SimpleUploadedFile("music.zip", archive, content_type="application/zip")},
        format="multipart",
    )
    assert response.status_code == 201, response.data
    assert response.data["pages"]["comingSoon"]["music"] == "audio/theme.mp3"
    assert response.data["assets"]["audio/theme.mp3"].endswith("/audio/theme.mp3")


@pytest.mark.django_db
@pytest.mark.parametrize("asset_path", ["audio/missing.mp3", "images/logo.png"])
def test_coming_soon_music_rejects_undeclared_or_non_mp3_asset(api, admin, tmp_path, settings, asset_path):
    settings.MEDIA_ROOT = tmp_path
    api.force_authenticate(admin)
    archive = theme_zip(
        extra={"audio/theme.mp3": b"ID3-fake"},
        manifest_overrides={
            "assets": {"images/logo.png": "assets/logo.png", "audio/theme.mp3": "audio/theme.mp3"},
            "pages": {"comingSoon": {"style": "classic", "music": asset_path}},
        },
    )
    response = api.post(
        "/api/v1/staff/themes/",
        {"package": SimpleUploadedFile("music.zip", archive, content_type="application/zip")},
        format="multipart",
    )
    assert response.status_code == 400
    assert ThemePackage.objects.count() == 0


@pytest.mark.django_db
def test_other_audio_formats_stay_blocked_in_the_package(api, admin, tmp_path, settings):
    settings.MEDIA_ROOT = tmp_path
    api.force_authenticate(admin)
    response = api.post(
        "/api/v1/staff/themes/",
        {"package": SimpleUploadedFile("wav.zip", _music_zip("audio/theme.mp3"), content_type="application/zip")},
        format="multipart",
    )
    assert response.status_code == 400
