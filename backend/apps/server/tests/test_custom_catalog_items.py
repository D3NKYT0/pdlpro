import json
from io import BytesIO

import pytest
from PIL import Image
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.infrastructure.authentication import get_access_cookie_name
from apps.server.infrastructure.custom_item_models import CustomCatalogItem
from apps.server.infrastructure.lineage.item_catalog import get_item_catalog, item_catalog_scope, item_metadata, item_is_tradeable

pytestmark = pytest.mark.django_db
BASE = "/api/v1/staff/custom-items/"
CATALOG = "/api/v1/public/items/catalog/"


def picture(size=(32, 32)):
    image = BytesIO()
    Image.new("RGBA", size, (200, 160, 90, 255)).save(image, format="PNG")
    return SimpleUploadedFile("untrusted-name.png", image.getvalue(), content_type="image/png")


@pytest.fixture(autouse=True)
def xml(tmp_path, settings):
    (tmp_path / "items.xml").write_text('<list><etcitem id="57" name="Adena"><set name="tradeable" value="true"/></etcitem></list>', encoding="utf-8")
    settings.LINEAGE_ITEM_XML_DIR = str(tmp_path)
    settings.LINEAGE_DB_ENABLED = False
    get_item_catalog.cache_clear()
    yield tmp_path
    get_item_catalog.cache_clear()


@pytest.fixture
def staff():
    return get_user_model().objects.create_superuser(username="custom-admin", email="custom@example.invalid", password="test")


@pytest.fixture
def client(staff):
    api = APIClient()
    api.force_authenticate(staff)
    return api


def create(client, **overrides):
    data = {"item_id": 900001, "name": "Medalha Custom", "image": picture(), "grade": "S", "category": "COMUM",
            "metadata": json.dumps({"raridade": "raro", "nivel": 80}), "tradeable": "true", "active": "true"}
    data.update(overrides)
    return client.post(BASE, data, format="multipart")


def test_create_upload_merge_and_live_changes(client):
    response = create(client)
    assert response.status_code == 201, response.data
    row = CustomCatalogItem.objects.get()
    assert response.data["id"] == str(row.id)
    assert "seq_id" not in response.data
    assert row.image.name.startswith("custom-items/900001/")
    assert "untrusted-name" not in row.image.name
    assert row.image.storage.exists(row.image.name)
    with row.image.open("rb") as stream:
        assert Image.open(stream).format == "PNG"
    catalog = APIClient().get(CATALOG).data
    items = {item["id"]: item for item in catalog["items"]}
    assert set(items) == {"57", "900001"}
    assert items["900001"]["name"] == "Medalha Custom"
    assert items["900001"]["source"] == "custom"
    assert items["900001"]["icon_url"] == row.image.url
    assert items["900001"]["metadata"] == {"raridade": "raro", "nivel": 80}
    url = BASE + str(row.id) + "/"
    assert client.patch(url, {"name": "Novo nome", "tradeable": False}, format="json").status_code == 200
    assert APIClient().get(CATALOG).data["items"][1]["name"] == "Novo nome"
    assert item_is_tradeable(row.item_id) is False
    assert client.patch(url, {"active": False}, format="json").status_code == 200
    assert len(APIClient().get(CATALOG).data["items"]) == 1
    assert row.image.storage.exists(row.image.name)
    assert CustomCatalogItem.objects.count() == 1
    assert client.delete(url).status_code == 405
    assert client.patch(url, {"active": True}, format="json").status_code == 200
    assert len(APIClient().get(CATALOG).data["items"]) == 2


def test_duplicate_xml_id_custom_id_and_id_mutation_rejected(client):
    assert create(client, item_id=57).status_code == 400
    created = create(client)
    assert created.status_code == 201
    assert create(client).status_code == 400
    url = BASE + created.data["id"] + "/"
    assert client.patch(url, {"item_id": 900002}, format="json").status_code == 400
    assert client.patch(url, {"active": False}, format="json").status_code == 200
    assert create(client).status_code == 400
    assert CustomCatalogItem.objects.count() == 1


@pytest.mark.parametrize("payload", [
    {"item_id": 0}, {"item_id": -1}, {"item_id": 2147483648}, {"category": "INVALID"},
    {"grade": "INVALID"}, {"metadata": "[]"}, {"metadata": '{"bad"'}, {"name": ""},
    {"metadata": json.dumps({"large": "x" * 17000})},
])
def test_validation(client, payload):
    assert create(client, **payload).status_code == 400
    assert not CustomCatalogItem.objects.exists()


def test_image_validation(client):
    assert create(client, image=SimpleUploadedFile("attack.svg", b'<svg onload="alert(1)"/>', content_type="image/svg+xml")).status_code == 400
    assert create(client, image=picture((1025, 2))).status_code == 400
    assert create(client, image=SimpleUploadedFile("fake.png", b"not an image", content_type="image/png")).status_code == 400
    # A decodable image with an oversized appended payload is still refused.
    img = picture()
    huge = SimpleUploadedFile("huge.png", img.read() + b"x" * (2 * 1024 * 1024), content_type="image/png")
    assert create(client, image=huge).status_code == 400
    assert client.post(BASE, {"item_id": 900001, "name": "Missing image"}, format="json").status_code == 400


def test_permissions_and_cookie_csrf(client, staff):
    api = APIClient()
    assert api.get(BASE).status_code in (401, 403)
    reader = get_user_model().objects.create_user(username="custom-reader", email="reader@example.invalid", is_staff=True)
    api.force_authenticate(reader)
    assert api.get(BASE).status_code == 403
    reader.user_permissions.add(Permission.objects.get(codename="view_customcatalogitem"))
    reader = get_user_model().objects.get(pk=reader.pk)
    api.force_authenticate(reader)
    assert api.get(BASE).status_code == 200
    assert create(api).status_code == 403
    created = create(client)
    assert api.patch(BASE + created.data["id"] + "/", {"active": False}, format="json").status_code == 403
    strict = APIClient(enforce_csrf_checks=True)
    strict.cookies[get_access_cookie_name()] = str(RefreshToken.for_user(staff).access_token)
    assert strict.get(BASE).status_code == 200
    assert create(strict, item_id=900002).status_code == 403
    token = strict.get("/api/v1/auth/csrf/").data["csrfToken"]
    assert strict.post(BASE, {"item_id": 900002, "name": "CSRF verified", "image": picture()}, format="multipart", HTTP_X_CSRFTOKEN=token).status_code == 201


def test_one_custom_query_per_catalog_request_and_no_global_staleness(client):
    create(client)
    with CaptureQueriesContext(connection) as queries:
        assert APIClient().get(CATALOG).status_code == 200
    reads = [row for row in queries if "server_customcatalogitem" in row["sql"] and row["sql"].lstrip().startswith("SELECT")]
    assert len(reads) == 1
    with item_catalog_scope():
        assert item_metadata(900001)["name"] == "Medalha Custom"
        CustomCatalogItem.objects.filter(item_id=900001).update(name="Updated outside request")
        assert item_metadata(900001)["name"] == "Medalha Custom"
    assert item_metadata(900001)["name"] == "Updated outside request"


def test_xml_added_later_wins_and_conflict_is_visible(client, xml):
    created = create(client)
    (xml / "new.xml").write_text('<list><etcitem id="900001" name="Official item"></etcitem></list>', encoding="utf-8")
    get_item_catalog.cache_clear()
    assert item_metadata(900001)["source"] == "xml"
    assert item_metadata(900001)["name"] == "Official item"
    assert client.get(BASE).data["results"][0]["conflicts_with_xml"] is True
    assert client.patch(BASE + created.data["id"] + "/", {"active": False}, format="json").status_code == 200


def test_search_pagination_and_image_replacement_preserve_prior_file(client):
    created = create(client)
    row = CustomCatalogItem.objects.get()
    prior_image = row.image.name
    assert client.get(BASE, {"search": "Medalha"}).data["count"] == 1
    assert client.get(BASE, {"search": "900001"}).data["count"] == 1
    assert client.get(BASE, {"search": "Other"}).data["count"] == 0
    assert client.get(BASE, {"page": 0}).status_code == 400
    response = client.patch(BASE + created.data["id"] + "/", {"image": picture((16, 16))}, format="multipart")
    assert response.status_code == 200
    row.refresh_from_db()
    assert row.image.name != prior_image
    assert row.image.storage.exists(prior_image)
