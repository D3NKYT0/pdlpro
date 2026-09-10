import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import Client, override_settings
from django.urls import reverse


def test_jazzmin_language_chooser_is_enabled():
    assert settings.JAZZMIN_SETTINGS.get("language_chooser") is True


@pytest.mark.django_db
def test_admin_login_exposes_language_selector_and_sync_script(client):
    response = client.get(reverse("admin:login"))
    assert response.status_code == 200
    body = response.content.decode()
    assert 'data-pdl-language-form' in body
    assert 'name="language"' in body
    assert "pdl_admin/js/language-sync.js" in body
    assert reverse("set_language") in body or "/i18n/setlang/" in body


@pytest.mark.django_db
def test_admin_shell_exposes_language_chooser_when_authenticated(client):
    user = get_user_model().objects.create_superuser(
        username="lang-admin",
        email="lang-admin@example.com",
        password="test-password",
    )
    client.force_login(user)
    response = client.get(reverse("admin:index"))
    assert response.status_code == 200
    body = response.content.decode()
    assert "pdl-language-menu" in body or 'name="language"' in body
    assert "pdl_admin/js/language-sync.js" in body
    assert "/i18n/setlang/" in body


@override_settings(OPENAPI_DOCS_PUBLIC=True)
def test_swagger_topbar_exposes_language_selector_and_localized_schema_url():
    response = Client().get("/api/docs/swagger-ui/")
    assert response.status_code == 200
    body = response.content.decode().replace("\\u003D", "=")
    assert 'data-pdl-language-form' in body
    assert "pdl_admin/js/language-sync.js" in body
    assert 'id="pdl-docs-language"' in body
    assert "lang=pt" in body or "lang=en" in body or "lang=es" in body


@override_settings(OPENAPI_DOCS_PUBLIC=True)
def test_swagger_schema_url_follows_django_language_cookie():
    browser = Client()
    browser.cookies["django_language"] = "en"
    response = browser.get("/api/docs/swagger-ui/")
    assert response.status_code == 200
    body = response.content.decode().replace("\\u003D", "=")
    assert "lang=en" in body
    assert "API documentation" in body


@override_settings(OPENAPI_DOCS_PUBLIC=True)
def test_openapi_schema_translates_with_lang_query():
    headers = {"HTTP_ACCEPT": "application/json"}
    pt = Client().get("/api/schema/?lang=pt", **headers).json()
    en = Client().get("/api/schema/?lang=en", **headers).json()
    assert pt["info"]["title"]
    assert en["info"]["title"]
    pt_tags = {tag["name"]: tag.get("description", "") for tag in pt.get("tags", [])}
    en_tags = {tag["name"]: tag.get("description", "") for tag in en.get("tags", [])}
    shared = set(pt_tags) & set(en_tags)
    assert shared
    assert any(pt_tags[name] != en_tags[name] for name in shared)
