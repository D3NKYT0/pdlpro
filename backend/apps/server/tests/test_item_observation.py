from copy import deepcopy
from datetime import timedelta
from unittest.mock import MagicMock

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.core.exceptions import ValidationError
from django.contrib import admin
from django.urls import NoReverseMatch, reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from apps.accounts.infrastructure.authentication import get_access_cookie_name

from apps.inventory.infrastructure.models import Inventory, InventoryItem
from apps.server.application.item_observation import (
    ObservationUnavailable, capture_snapshot, compare_snapshots, observation_source, read_observation,
)
from apps.server.infrastructure.item_observation_models import (
    ItemObservationCategory, ItemObservationDetail, ItemObservationFavorite, ItemObservationSnapshot,
    validate_item_ids,
)
from apps.server.infrastructure.lineage.catalog import LineageQueryCatalog
from apps.server.infrastructure.null_gateway import NullLineageGateway
from apps.server.infrastructure.sqlalchemy_gateway import SqlAlchemyLineageGateway

pytestmark = pytest.mark.django_db
BASE = "/api/v1/staff/item-observation/"
RAW = {
    "items": [{"item_id": 57, "quantity": 300, "instances": 2, "unique_owners": 1}],
    "details": [{"item_id": 57, "location": "INVENTORY", "quantity": 300, "instances": 2, "unique_owners": 1}],
    "characters": [{"total": 10}],
}


@pytest.fixture
def enabled(settings, monkeypatch):
    settings.LINEAGE_DB_ENABLED = True
    settings.LINEAGE_DB_HOST = "test-l2"
    settings.LINEAGE_DB_NAME = "test-schema"
    settings.LINEAGE_DB_PORT = 3306
    settings.LINEAGE_QUERY_MODULE = "dreamv3"
    monkeypatch.setattr(NullLineageGateway, "observe_items", lambda self: deepcopy(RAW))


@pytest.fixture
def admin_user():
    return get_user_model().objects.create_superuser(username="observer", email="observer@example.invalid", password="test")


@pytest.fixture
def logged(client, admin_user):
    client = APIClient()
    client.force_authenticate(admin_user)
    return client


def gateway():
    result = MagicMock()
    result.observe_items.return_value = deepcopy(RAW)
    return result


def test_dashboard_and_permission_filtered_navigation(enabled, logged):
    response = logged.get(BASE)
    assert response.status_code == 200
    assert response.data["totals"]["total_quantity"] == "300"
    assert logged.get(BASE + "access/").data["capture"] is True
    assert not admin.site.is_registered(ItemObservationSnapshot)
    assert not admin.site.is_registered(ItemObservationCategory)
    with pytest.raises(NoReverseMatch):
        reverse("admin:server_itemobservationsnapshot_monitor")


def test_anonymous_player_and_staff_without_permission_cannot_observe(client):
    client = APIClient()
    assert client.get(BASE).status_code in (401, 403)
    user = get_user_model().objects.create_user(username="staff", email="staff@example.invalid", password="test", is_staff=True)
    client.force_authenticate(user)
    for name in ("", "compare/", "access/", "snapshots/", "categories/"):
        assert client.get(BASE + name).status_code == 403
    assert client.post(BASE + "snapshots/", {}, format="json").status_code == 403
    assert client.put(BASE + "favorites/57/", {"active": True}, format="json").status_code == 403
    user.is_staff = False
    user.save()
    assert client.get(BASE).status_code == 403


def test_view_permission_does_not_grant_snapshot_capture(enabled, client):
    client = APIClient()
    user = get_user_model().objects.create_user(username="reader", email="reader@example.invalid", password="test", is_staff=True)
    user.user_permissions.add(Permission.objects.get(codename="view_itemobservationsnapshot"))
    client.force_authenticate(user)
    assert client.get(BASE).status_code == 200
    assert client.get(BASE + "access/").data["capture"] is False
    assert client.post(BASE + "snapshots/", {}, format="json").status_code == 403
    assert client.post(BASE + "categories/", {"name": "Denied"}, format="json").status_code == 403
    category = ItemObservationCategory.objects.create(name="Existing")
    assert client.put(BASE + f"categories/{category.id}/", {"name": "Denied"}, format="json").status_code == 403
    assert client.delete(BASE + f"categories/{category.id}/").status_code == 403
    snapshot = ItemObservationSnapshot.objects.create(source="test", snapshot_date=timezone.localdate())
    assert client.delete(BASE + f"snapshots/{snapshot.id}/").status_code == 403
    snapshot.delete()
    assert ItemObservationSnapshot.objects.count() == 0


def test_mutations_require_post_and_csrf(enabled, logged, admin_user):
    assert logged.get(BASE + "favorites/57/").status_code == 405
    strict = APIClient(enforce_csrf_checks=True)
    strict.cookies[get_access_cookie_name()] = str(RefreshToken.for_user(admin_user).access_token)
    assert strict.get(BASE + "access/").status_code == 200
    assert strict.post(BASE + "snapshots/", {}, format="json").status_code == 403
    assert strict.put(BASE + "favorites/57/", {"active": True}, format="json").status_code == 403
    token = strict.get("/api/v1/auth/csrf/").data["csrfToken"]
    assert strict.put(BASE + "favorites/57/", {"active": True}, format="json", HTTP_X_CSRFTOKEN=token).status_code == 200


def test_category_crud_validation_and_filter(enabled, logged):
    url = BASE + "categories/"
    for invalid in ([True], [0], [57, 57], ["57"], [2147483648]):
        assert logged.post(url, {"name": "Invalid", "item_ids": invalid}, format="json").status_code == 400
    response = logged.post(url, {"name": "Moedas", "item_ids": [57], "order": 1}, format="json")
    assert response.status_code == 201
    category_url = url + response.data["id"] + "/"
    assert logged.get(BASE, {"category": "Moedas"}).data["count"] == 1
    assert logged.get(BASE, {"category": "Unknown"}).data["count"] == 0
    assert logged.put(category_url, {"name": "Coins", "item_ids": [57]}, format="json").status_code == 200
    assert logged.delete(category_url).status_code == 204
    assert logged.get(url).data == []


def test_history_available_with_game_disabled_and_delete_cascades(settings, logged):
    settings.LINEAGE_DB_ENABLED = False
    snapshot = ItemObservationSnapshot.objects.create(source="offline", snapshot_date=timezone.localdate())
    ItemObservationDetail.objects.create(snapshot=snapshot, item_id=57, item_name="Adena", location="SITE",
                                         quantity=10, instances=1, unique_owners=1)
    assert logged.get(BASE + "snapshots/").data["count"] == 1
    assert logged.get(BASE + f"snapshots/{snapshot.id}/").status_code == 200
    assert logged.delete(BASE + f"snapshots/{snapshot.id}/").status_code == 204
    assert not ItemObservationDetail.objects.exists()
    assert logged.get(BASE + f"snapshots/{snapshot.id}/").status_code == 404


def test_api_preserves_large_quantities_and_paginates(enabled, logged, monkeypatch):
    def many(self):
        data = deepcopy(RAW)
        data["items"] = [{"item_id": i, "quantity": 9007199254740993 + i,
                          "instances": 1, "unique_owners": 1} for i in range(1, 62)]
        return data
    monkeypatch.setattr(NullLineageGateway, "observe_items", many)
    response = logged.get(BASE, {"page": 2})
    assert response.status_code == 200
    assert response.data["count"] == 61
    assert len(response.data["results"]) == 11
    assert response.data["results"][-1]["quantity"] == "9007199254740994"
    assert logged.post(BASE + "snapshots/", {"notes": "x" * 2001}, format="json").status_code == 400
    assert logged.put(BASE + "favorites/0/", {"active": True}, format="json").status_code == 400


def test_favorites_are_personal_and_scoped_to_source(enabled, logged, admin_user, settings):
    other = get_user_model().objects.create_user(username="other", email="other@example.invalid", password="test")
    ItemObservationFavorite.objects.create(user=other, source=observation_source(), item_id=57)
    url = BASE + "favorites/57/"
    logged.put(url, {"active": True}, format="json")
    logged.put(url, {"active": True}, format="json")
    assert ItemObservationFavorite.objects.filter(user=admin_user).count() == 1
    response = logged.get(BASE, {"favorites": "true"})
    assert response.data["count"] == 1
    logged.put(url, {"active": False}, format="json")
    assert ItemObservationFavorite.objects.filter(user=other).count() == 1
    assert not ItemObservationFavorite.objects.filter(user=admin_user).exists()
    settings.LINEAGE_DB_NAME = "another-server"
    assert logged.get(BASE, {"favorites": "true"}).data["count"] == 0


def test_absent_favorite_is_visible_at_zero(enabled, logged, admin_user):
    ItemObservationFavorite.objects.create(user=admin_user, source=observation_source(), item_id=999999)
    response = logged.get(BASE, {"favorites": "true"})
    assert response.data["results"][0]["quantity"] == "0"


def test_filters_and_invalid_input(enabled, logged):
    url = BASE
    assert logged.get(url, {"search": "57"}).data["count"] == 1
    assert logged.get(url, {"minimum": "301"}).data["count"] == 0
    response = logged.get(url, {"minimum": "not-a-number", "sort": "__dict__"})
    assert response.status_code == 400
    assert logged.get(BASE, {"page": -1}).status_code == 400


def test_snapshot_includes_site_and_category_and_is_unique(enabled, logged, admin_user):
    category = ItemObservationCategory.objects.create(name="Moedas", item_ids=[57])
    inv = Inventory.objects.create(user=admin_user, character_name="Knight", account_name="test")
    InventoryItem.objects.create(inventory=inv, item_id=57, quantity=25)
    response = logged.post(BASE + "snapshots/", {"notes": "Baseline"}, format="json")
    assert response.status_code == 201
    snapshot = ItemObservationSnapshot.objects.get()
    assert snapshot.total_quantity == 300
    assert snapshot.site_quantity == 25
    assert snapshot.details.count() == 2
    site = snapshot.details.get(location="SITE")
    assert site.unique_owners == 1
    assert site.category_name == "Moedas"
    category.delete()
    site.refresh_from_db()
    assert site.category_name == "Moedas"
    assert response.data["id"] == str(snapshot.id)
    assert "seq_id" not in response.data
    assert logged.get(BASE + f"snapshots/{snapshot.id}/").data["count"] == 2
    assert logged.post(BASE + "snapshots/", {}, format="json").status_code == 409
    assert ItemObservationSnapshot.objects.count() == 1


def test_snapshot_failure_is_atomic(enabled, admin_user, monkeypatch):
    def fail(*args, **kwargs):
        raise RuntimeError("test write failure")
    monkeypatch.setattr(ItemObservationDetail.objects, "bulk_create", fail)
    with pytest.raises(RuntimeError):
        capture_snapshot(gateway(), admin_user)
    assert not ItemObservationSnapshot.objects.exists()


def test_connection_errors_do_not_leak_credentials_or_create_snapshot(enabled, logged, monkeypatch):
    def fail(self):
        raise RuntimeError("secret-db-password")
    monkeypatch.setattr(NullLineageGateway, "observe_items", fail)
    response = logged.get(BASE)
    assert response.status_code == 503
    assert "secret-db-password" not in response.content.decode()
    assert logged.post(BASE + "snapshots/", {}, format="json").status_code == 503
    assert not ItemObservationSnapshot.objects.exists()


def test_disabled_does_not_query_gateway(settings):
    settings.LINEAGE_DB_ENABLED = False
    reader = gateway()
    with pytest.raises(ObservationUnavailable):
        read_observation(reader)
    reader.observe_items.assert_not_called()


def test_comparison_disappearance_new_items_and_same_source(enabled, logged):
    day = timezone.localdate()
    old = ItemObservationSnapshot.objects.create(source=observation_source(), snapshot_date=day - timedelta(days=1))
    new = ItemObservationSnapshot.objects.create(source=observation_source(), snapshot_date=day)
    for snapshot, item_id, quantity in ((old, 57, 100), (new, 57, 150), (old, 10, 20), (new, 11, 30)):
        ItemObservationDetail.objects.create(snapshot=snapshot, item_id=item_id, item_name=f"Item {item_id}",
                                             location="INVENTORY", quantity=quantity, instances=1, unique_owners=1)
    rows = {row["item_id"]: row for row in compare_snapshots(old, new)}
    assert rows[57]["percentage"] == 50
    assert rows[10]["percentage"] == -100
    assert rows[11]["percentage"] is None
    response = logged.get(BASE + "compare/", {"before": old.id, "after": new.id})
    assert response.status_code == 200
    assert any(row["percentage"] is None for row in response.data["results"])
    assert logged.get(BASE + "compare/", {"before": new.id, "after": old.id}).status_code == 400
    assert logged.get(BASE + "compare/", {"before": old.pk, "after": new.pk}).status_code == 400
    with pytest.raises(ObservationUnavailable):
        compare_snapshots(new, old)
    new.source = "another-source"
    with pytest.raises(ObservationUnavailable):
        compare_snapshots(old, new)


@pytest.mark.parametrize("value", [[True], [0], [-1], [57, 57], ["57"], {}, "57"])
def test_category_ids_reject_invalid_values(value):
    with pytest.raises(ValidationError):
        validate_item_ids(value)


def test_gateway_uses_only_selects_in_read_only_transaction():
    reader = SqlAlchemyLineageGateway(LineageQueryCatalog.load("dreamv3"))
    engine, connection = MagicMock(), MagicMock()
    engine.connect.return_value.__enter__.return_value = connection
    connection.execute.return_value.mappings.return_value.all.return_value = []
    reader._engine = engine
    reader.observe_items()
    connection.exec_driver_sql.assert_called_once_with("START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY")
    assert connection.execute.call_count == 3
    assert all(str(call.args[0]).startswith("SELECT") for call in connection.execute.call_args_list)


def test_gateway_rejects_truncated_snapshot():
    reader = SqlAlchemyLineageGateway(LineageQueryCatalog.load("dreamv3"))
    reader._engine = MagicMock()
    connection = reader._engine.connect.return_value.__enter__.return_value
    connection.execute.return_value.mappings.return_value.all.return_value = [{}] * 100001
    with pytest.raises(ValueError, match="limite seguro"):
        reader.observe_items()
