"""Todas as rotas privadas registradas devem rejeitar visitantes e proteger staff.

Deriva somente o inventário de URLs do router. A política esperada é fixa: os
prefixos customer/shared exigem sessão e staff exige privilégio de equipe.
Novas rotas nesses prefixos entram automaticamente nesta matriz.
"""
import re

import pytest
from django.contrib.auth import get_user_model
from django.urls import URLResolver, get_resolver
from rest_framework.test import APIClient


def private_endpoints(patterns=None, prefix=""):
    for pattern in patterns if patterns is not None else get_resolver().url_patterns:
        route = prefix + str(pattern.pattern)
        if isinstance(pattern, URLResolver):
            if route.startswith("admin/"):
                continue
            yield from private_endpoints(pattern.url_patterns, route)
            continue
        if not route.startswith(("api/v1/customer/", "api/v1/shared/", "api/v1/staff/")):
            continue
        view = getattr(pattern.callback, "view_class", None) or getattr(pattern.callback, "cls", None)
        if view is None:
            raise AssertionError(f"Inclua a view funcional na matriz: {route}")
        def substitute(match):
            kind = match.group(1) or "str"
            values = {"uuid": "12345678-1234-5678-1234-567812345678", "int": "1", "str": "sample", "slug": "sample", "path": "sample"}
            return values[kind]
        path = "/" + re.sub(r"<(?:(\w+):)?\w+>", substitute, route)
        for method in ("get", "post", "put", "patch", "delete"):
            if hasattr(view, method):
                yield method, path


# Aliases legados de consultas públicas, declarados AllowAny nas respectivas views.
# A lista é explícita: uma nova view AllowAny em rota privada deve falhar aqui.
PUBLIC_ALIASES = {
    ("get", "/api/v1/shared/shop/catalog/"),
    ("get", "/api/v1/shared/content/news/"),
    ("get", "/api/v1/customer/server/status/"),
}
ENDPOINTS = [endpoint for endpoint in private_endpoints() if endpoint not in PUBLIC_ALIASES]


@pytest.mark.django_db
@pytest.mark.parametrize("method,path", ENDPOINTS, ids=[f"{method.upper()} {path}" for method, path in ENDPOINTS])
def test_private_endpoint_rejects_anonymous_request(method, path):
    response = getattr(APIClient(), method)(path, {}, format="json")
    assert response.status_code in (401, 403), (method, path, response.status_code)


STAFF_ENDPOINTS = [(method, path) for method, path in ENDPOINTS if path.startswith("/api/v1/staff/")]


@pytest.mark.django_db
@pytest.mark.parametrize("method,path", STAFF_ENDPOINTS, ids=[f"{method.upper()} {path}" for method, path in STAFF_ENDPOINTS])
def test_staff_endpoint_rejects_regular_player(method, path):
    user = get_user_model().objects.create_user(username="regular", email="regular@test.dev")
    client = APIClient()
    client.force_authenticate(user)
    response = getattr(client, method)(path, {}, format="json")
    assert response.status_code == 403, (method, path, response.status_code)


def test_matrix_covers_all_private_prefixes():
    assert all(any(path.startswith(f"/api/v1/{prefix}/") for _, path in ENDPOINTS) for prefix in ("shared", "customer", "staff"))


@pytest.mark.django_db
@pytest.mark.parametrize("method,path", sorted(PUBLIC_ALIASES))
def test_legacy_public_alias_remains_readable(method, path):
    assert getattr(APIClient(), method)(path).status_code == 200
