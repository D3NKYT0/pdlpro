"""Disponibilidade independente dos indicadores e autorização do catálogo."""
import importlib

import pytest
from django.apps import apps
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.programs.models import SystemResource

pytestmark = pytest.mark.django_db
CODES = ("server-status", "players-online")


def test_migration_defaults_preserve_existing_preferences_and_reverse_only_own_rows():
    migration = importlib.import_module("apps.programs.migrations.0012_server_display_resources")
    SystemResource.objects.filter(code__in=CODES).delete()
    unrelated = SystemResource.objects.create(code="display-test-unrelated", name="Other", enabled=False)
    migration.forwards(apps, None)
    assert SystemResource.objects.filter(code__in=CODES, enabled=True).count() == 2
    SystemResource.objects.filter(code="players-online").update(enabled=False)
    migration.forwards(apps, None)
    assert SystemResource.objects.get(code="players-online").enabled is False
    migration.backwards(apps, None)
    assert not SystemResource.objects.filter(code__in=CODES).exists()
    assert SystemResource.objects.get(id=unrelated.id).enabled is False


@pytest.mark.parametrize("code", CODES)
def test_admin_can_toggle_each_indicator_independently_and_repeat(code):
    api = APIClient()
    api.force_authenticate(get_user_model().objects.create_superuser(username="display-admin", email="display@example.invalid", password="test"))
    row = SystemResource.objects.get(code=code)
    other = SystemResource.objects.get(code=next(item for item in CODES if item != code))
    for enabled in (False, False, True):
        response = api.patch(f"/api/v1/staff/resources/{row.id}/", {"enabled": enabled}, format="json")
        assert response.status_code == 200, response.data
        row.refresh_from_db()
        other.refresh_from_db()
        assert row.enabled is enabled
        assert other.enabled is True


@pytest.mark.parametrize("kind", ["anonymous", "player", "reader"])
def test_visibility_write_requires_resource_management(kind):
    from django.contrib.auth.models import Permission
    api = APIClient()
    if kind != "anonymous":
        user = get_user_model().objects.create_user(username=kind, email=f"{kind}@example.invalid")
        if kind == "reader":
            user.user_permissions.add(Permission.objects.get(codename="settings_view"))
        api.force_authenticate(user)
    for code in CODES:
        row = SystemResource.objects.get(code=code)
        response = api.patch(f"/api/v1/staff/resources/{row.id}/", {"enabled": False}, format="json")
        assert response.status_code in (401, 403)
        row.refresh_from_db()
        assert row.enabled is True


@pytest.mark.parametrize("language, label", [("en", "Server status"), ("es", "Estado del servidor")])
def test_public_catalog_exposes_translated_independent_preferences(language, label):
    SystemResource.objects.filter(code="server-status").update(enabled=False)
    response = APIClient().get("/api/v1/public/resources/", HTTP_ACCEPT_LANGUAGE=language)
    assert response.status_code == 200
    rows = {row["code"]: row for row in response.data}
    assert rows["server-status"]["name"] == label
    assert rows["server-status"]["category"] == ("Content" if language == "en" else "Contenido")
    assert rows["server-status"]["enabled"] is False
    assert rows["players-online"]["enabled"] is True
    # São controles de apresentação; a consulta técnica não depende de um indicador isolado.
    assert APIClient().get("/api/v1/public/server/status/").status_code == 200


@pytest.mark.parametrize("code", CODES)
def test_invalid_preference_does_not_change_the_indicator(code):
    api = APIClient()
    api.force_authenticate(get_user_model().objects.create_superuser(username="invalid-display", email="invalid-display@example.invalid", password="test"))
    row = SystemResource.objects.get(code=code)
    assert api.patch(f"/api/v1/staff/resources/{row.id}/", {"enabled": "invalid"}, format="json").status_code == 400
    row.refresh_from_db()
    assert row.enabled is True
