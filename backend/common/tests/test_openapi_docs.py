import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import Client, override_settings
from drf_spectacular.drainage import GENERATOR_STATS
from drf_spectacular.generators import SchemaGenerator
from rest_framework.response import Response

from common.swagger import pdl_swagger_tags


@override_settings(OPENAPI_DOCS_PUBLIC=True)
def test_openapi_schema_documents_every_operation():
    schema = SchemaGenerator().get_schema(request=None, public=True)
    assert schema is not None

    tag_docs = {
        tag["name"]: (tag.get("description") or "").strip() for tag in pdl_swagger_tags
    }
    used_tags: set[str] = set()
    missing_summary: list[str] = []
    missing_description: list[str] = []
    fallback_v1: list[str] = []

    for path, methods in schema["paths"].items():
        for method, operation in methods.items():
            if method.startswith("x-"):
                continue
            label = f"{method.upper()} {path}"
            tags = operation.get("tags") or []
            used_tags.update(tags)
            if "v1" in tags or not tags:
                fallback_v1.append(label)
            if not (operation.get("summary") or "").strip():
                missing_summary.append(label)
            if not (operation.get("description") or "").strip():
                missing_description.append(label)

    assert not fallback_v1, f"operações sem tag de domínio: {fallback_v1}"
    assert not missing_summary, f"operações sem summary: {missing_summary}"
    assert not missing_description, f"operações sem description: {missing_description}"

    undocumented = sorted(
        tag for tag in used_tags if tag not in tag_docs or not tag_docs[tag]
    )
    assert not undocumented, f"tags sem descrição em pdl_swagger_tags: {undocumented}"


@override_settings(OPENAPI_DOCS_PUBLIC=True)
def test_openapi_schema_generation_is_quiet():
    """Regressão: sem ERROR/WARN de serializer/auth/operationId no schema."""
    GENERATOR_STATS.reset()
    schema = SchemaGenerator().get_schema(request=None, public=True)
    assert schema is not None

    noisy = [
        msg
        for msg in list(GENERATOR_STATS._error_cache)
        + list(GENERATOR_STATS._warn_cache)
        if "unable to guess serializer" in msg
        or "could not resolve authenticator" in msg
        or "has collisions" in msg
    ]
    assert not noisy, f"ruído OpenAPI restante: {noisy}"

    schemes = (schema.get("components") or {}).get("securitySchemes") or {}
    assert "cookieJwtAuth" in schemes

    operation_ids = [
        op["operationId"]
        for methods in schema["paths"].values()
        for method, op in methods.items()
        if not method.startswith("x-")
    ]
    assert len(operation_ids) == len(set(operation_ids))


@override_settings(OPENAPI_DOCS_PUBLIC=True)
def test_swagger_ui_uses_pdl_theme():
    response = Client().get("/api/docs/swagger-ui/")
    assert response.status_code == 200
    body = response.content.decode()
    assert "pdl_admin/css/docs.css" in body
    assert "pdl_admin/css/buttons.css" in body
    assert "pdl-docs-topbar" in body
    assert 'id="pdl-docs-loader"' in body
    assert "pdl_admin/js/docs-loader.js" in body
    assert "Carregando documentação" in body or "Loading documentation" in body
    assert "PDL PRO" in body
    assert "Documentação da API" in body


@override_settings(OPENAPI_DOCS_PUBLIC=True)
def test_redoc_uses_pdl_theme():
    response = Client().get("/api/docs/redoc/")
    assert response.status_code == 200
    body = response.content.decode()
    assert "pdl_admin/css/docs.css" in body
    assert "pdl_admin/css/buttons.css" in body
    assert "pdl-docs-topbar" in body
    assert 'id="pdl-docs-loader"' in body
    assert "pdl_admin/js/docs-loader.js" in body
    assert "PDL PRO" in body
    assert 'aria-current="page"' in body


def test_docs_nav_active_uses_green_glow_not_outline():
    from pathlib import Path

    css = (Path(settings.BASE_DIR) / "static/pdl_admin/css/buttons.css").read_text(
        encoding="utf-8"
    )
    assert '.pdl-docs-nav .pdl-button[aria-current="page"]' in css
    assert "hue-rotate(65deg)" in css
    assert "text-shadow" in css
    assert "outline: 1px solid var(--pdl-gold" not in css


def test_docs_css_defines_branded_loader():
    from pathlib import Path

    css = (Path(settings.BASE_DIR) / "static/pdl_admin/css/docs.css").read_text(
        encoding="utf-8"
    )
    assert ".pdl-docs-loader" in css
    assert ".pdl-docs-loader--done" in css
    assert "pdl-docs-loader-spin" in css


@pytest.mark.django_db
@pytest.mark.parametrize(
    "path",
    ["/api/schema/", "/api/docs/swagger-ui/", "/api/docs/redoc/"],
)
@override_settings(OPENAPI_DOCS_PUBLIC=False)
def test_private_api_docs_reject_anonymous_and_non_staff(path):
    assert Client().get(path).status_code == 401
    user = get_user_model().objects.create_user(
        username=f"reader-{path.count('/')}",
        email=f"reader-{path.count('/')}@pdl.dev",
        password="Secret123",
    )
    browser = Client()
    assert browser.login(username=user.username, password="Secret123")
    assert browser.get(path).status_code == 403


@pytest.mark.django_db
@pytest.mark.parametrize(
    "path",
    ["/api/schema/", "/api/docs/swagger-ui/", "/api/docs/redoc/"],
)
@override_settings(OPENAPI_DOCS_PUBLIC=False)
def test_private_api_docs_allow_authenticated_staff(path, mocker):
    user = get_user_model().objects.create_user(
        username=f"staff-{path.count('/')}",
        email=f"staff-{path.count('/')}@pdl.dev",
        password="Secret123",
        is_staff=True,
    )
    browser = Client()
    assert browser.login(username=user.username, password="Secret123")
    if path == "/api/schema/":
        mocker.patch(
            "common.openapi_views.PdlSpectacularAPIView._get_schema_response",
            return_value=Response({"openapi": "3.0.3"}),
        )
    assert browser.get(path).status_code == 200
