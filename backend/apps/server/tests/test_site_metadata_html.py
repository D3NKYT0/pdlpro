from html.parser import HTMLParser

import pytest
from rest_framework.test import APIClient

from apps.server.infrastructure.models import IndexConfig


class MetadataParser(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.meta = {}
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "meta":
            self.meta[attrs.get("property", attrs.get("name"))] = attrs.get("content")


@pytest.mark.django_db
def test_anonymous_html_metadata_reflects_saved_identity_without_javascript():
    row = IndexConfig.objects.create(
        name="Saga Club", seo_title="Saga — Lineage 2", seo_description="Servidor Saga",
        og_image="/media/saga.jpg", is_active=True,
    )
    api = APIClient()
    response = api.get("/api/v1/public/server/metadata/", HTTP_ACCEPT="text/html")
    assert response.status_code == 200
    assert response["Content-Type"].startswith("text/html")
    html = response.content.decode()
    meta = MetadataParser(html).meta
    assert "<title>Saga — Lineage 2</title>" in html
    assert meta["description"] == "Servidor Saga"
    assert meta["og:title"] == meta["twitter:title"] == "Saga — Lineage 2"
    assert meta["og:description"] == meta["twitter:description"] == "Servidor Saga"
    assert meta["og:image"] == meta["twitter:image"] == "http://testserver/media/saga.jpg"
    assert "no-store" in response["Cache-Control"]
    row.seo_title = "Saga atualizado"
    row.save()
    assert MetadataParser(api.get("/api/v1/public/server/metadata/").content.decode()).meta["og:title"] == "Saga atualizado"


@pytest.mark.django_db
def test_html_metadata_escapes_configured_markup_and_uses_absolute_default_image(settings):
    settings.SITE_SEO_TITLE = ""
    settings.SITE_SEO_DESCRIPTION = ""
    settings.PROJECT_TITLE = 'Saga <script>alert("x")</script>'
    settings.PROJECT_DESCRIPTION = 'Descrição & "aspas"'
    response = APIClient().get("/api/v1/public/server/metadata/", secure=True)
    assert response.status_code == 200
    html = response.content.decode()
    assert "<script>" not in html
    meta = MetadataParser(html).meta
    assert meta["og:title"] == settings.PROJECT_TITLE
    assert meta["description"] == settings.PROJECT_DESCRIPTION
    assert meta["og:image"] == "https://testserver/favicon/apple-touch-icon.png"


@pytest.mark.django_db
def test_html_metadata_rejects_writes():
    assert APIClient().post("/api/v1/public/server/metadata/", {}).status_code == 405


@pytest.mark.django_db
def test_project_identity_is_used_for_seo_without_separate_seo_fields(settings):
    settings.PROJECT_TITLE = "PDL PRO"
    settings.SITE_SEO_TITLE = ""
    settings.SITE_SEO_DESCRIPTION = ""
    IndexConfig.objects.create(name="L2 Nightmare", description="O pesadelo começa", is_active=True)
    response = APIClient().get("/api/v1/public/server/metadata/")
    html = response.content.decode()
    meta = MetadataParser(html).meta
    assert "<title>L2 Nightmare</title>" in html
    assert meta["description"] == "O pesadelo começa"
    assert "PDL PRO" not in html


@pytest.mark.django_db
def test_robots_uses_current_project_identity_and_plain_text():
    row = IndexConfig.objects.create(name="Nightmare\nDisallow: /", description="Servidor Nightmare", is_active=True)
    api = APIClient()
    response = api.get("/api/v1/public/server/robots/", HTTP_ACCEPT="text/plain")
    assert response.status_code == 200
    assert response["Content-Type"].startswith("text/plain")
    body = response.content.decode()
    assert "# Nightmare Disallow: /\n" in body
    assert "# Servidor Nightmare\n" in body
    assert "User-agent: *\nAllow: /\n" in body
    assert "\nDisallow: /\n" not in body
    assert "PDL PRO" not in body
    assert "no-store" in response["Cache-Control"]
    row.name = "Novo projeto"
    row.save()
    assert "# Novo projeto" in api.get("/api/v1/public/server/robots/").content.decode()
    assert api.head("/api/v1/public/server/robots/").status_code == 200
    assert api.post("/api/v1/public/server/robots/", {}).status_code == 405
