from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.infrastructure.models import User
from apps.content.infrastructure.models import Banner


@pytest.fixture
def public_client():
    return APIClient()


@pytest.fixture
def staff_client(db):
    user = User.objects.create(
        username="staff_banner_tester",
        email="staff_banner@test.com",
        is_staff=True,
    )
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
def test_public_banner_list_filtering(public_client):
    now = timezone.now()
    # 1. Landing and coming soon banner
    b1 = Banner.objects.create(
        title="Grande Inauguração",
        title_en="Grand Opening",
        badge="IMPORTANTE",
        description="Venha conferir o lançamento!",
        display_type="popup",
        target_location="landing_and_coming_soon",
        is_active=True,
        order=1,
    )
    # 2. Only coming soon banner
    b2 = Banner.objects.create(
        title="Contagem Regressiva",
        badge="EM BREVE",
        target_location="coming_soon",
        is_active=True,
        order=2,
    )
    # 3. Only panel banner
    b3 = Banner.objects.create(
        title="Recarga em Dobro",
        target_location="panel",
        is_active=True,
        order=3,
    )
    # 4. Inactive banner
    b4 = Banner.objects.create(
        title="Banner Antigo Inativo",
        target_location="all",
        is_active=False,
    )
    # 5. Future banner
    b5 = Banner.objects.create(
        title="Banner Futuro",
        target_location="all",
        is_active=True,
        start_date=now + timedelta(days=5),
    )

    # Query for landing
    res_landing = public_client.get("/api/v1/public/banners/?location=landing")
    assert res_landing.status_code == 200
    landing_ids = [item["id"] for item in res_landing.data]
    assert str(b1.id) in landing_ids
    assert str(b2.id) not in landing_ids
    assert str(b3.id) not in landing_ids
    assert str(b4.id) not in landing_ids
    assert str(b5.id) not in landing_ids

    # Query for coming_soon
    res_cs = public_client.get("/api/v1/public/banners/?location=coming_soon")
    assert res_cs.status_code == 200
    cs_ids = [item["id"] for item in res_cs.data]
    assert str(b1.id) in cs_ids
    assert str(b2.id) in cs_ids
    assert str(b3.id) not in cs_ids

    # Query with lang=en
    res_en = public_client.get("/api/v1/public/banners/?location=landing&lang=en")
    assert res_en.status_code == 200
    b1_data = next(item for item in res_en.data if item["id"] == str(b1.id))
    assert b1_data["title"] == "Grand Opening"


@pytest.mark.django_db
def test_staff_banner_crud(staff_client):
    # 1. Create banner
    create_payload = {
        "title": "Promoção de Inauguração",
        "title_en": "Grand Opening Sale",
        "badge": "NOVO",
        "description": "Aproveite 20% de bônus.",
        "display_type": "popup",
        "target_location": "landing_and_coming_soon",
        "dismiss_policy": "days",
        "dismiss_days": 3,
        "auto_close": True,
        "auto_close_delay": 8,
        "link": "https://example.com/promo",
        "link_text": "Participar",
        "is_active": True,
        "order": 1,
    }
    create_res = staff_client.post("/api/v1/staff/banners/", create_payload, format="json")
    assert create_res.status_code == 200
    created = create_res.data
    banner_id = created["id"]
    assert created["title"] == "Promoção de Inauguração"
    assert created["dismiss_days"] == 3
    assert created["auto_close_delay"] == 8

    # 2. List banners
    list_res = staff_client.get("/api/v1/staff/banners/")
    assert list_res.status_code == 200
    assert any(b["id"] == banner_id for b in list_res.data)

    # 3. Update banner
    update_payload = {
        "id": banner_id,
        "title": "Promoção Encerrando",
        "badge": "ÚLTIMOS DIAS",
        "dismiss_policy": "session",
        "is_active": True,
    }
    update_res = staff_client.put("/api/v1/staff/banners/", update_payload, format="json")
    assert update_res.status_code == 200
    assert update_res.data["title"] == "Promoção Encerrando"
    assert update_res.data["dismiss_policy"] == "session"

    # 4. Delete banner
    del_res = staff_client.delete("/api/v1/staff/banners/", {"id": banner_id}, format="json")
    assert del_res.status_code == 200
    assert del_res.data["deleted"] is True

    # 5. Confirm deleted
    assert not Banner.objects.filter(id=banner_id).exists()


@pytest.mark.django_db
def test_staff_banner_image_upload_and_url(staff_client):
    from django.core.files.uploadedfile import SimpleUploadedFile

    # 1. Create banner with external URL
    res_url = staff_client.post(
        "/api/v1/staff/banners/",
        {
            "title": "Banner com URL Externa",
            "image": "https://cdn.example.com/banner.webp",
        },
        format="json",
    )
    assert res_url.status_code == 200
    banner_url_id = res_url.data["id"]
    assert res_url.data["image"] == "https://cdn.example.com/banner.webp"
    assert res_url.data["image_url"] == "https://cdn.example.com/banner.webp"

    # 2. Create banner with uploaded image file (multipart/form-data)
    dummy_img = SimpleUploadedFile(
        "flyer.png",
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82",
        content_type="image/png",
    )
    res_upload = staff_client.post(
        "/api/v1/staff/banners/",
        {
            "title": "Banner com Arquivo",
            "image": dummy_img,
            "display_type": "popup",
            "is_active": "true",
            "dismiss_days": "5",
        },
        format="multipart",
    )
    assert res_upload.status_code == 200
    banner_file_id = res_upload.data["id"]
    assert "banners/" in res_upload.data["image"]
    assert res_upload.data["is_active"] is True
    assert res_upload.data["dismiss_days"] == 5

    # 3. Clear image from banner
    res_clear = staff_client.put(
        "/api/v1/staff/banners/",
        {
            "id": banner_file_id,
            "title": "Banner com Arquivo Limpo",
            "clear_image": "true",
        },
        format="json",
    )
    assert res_clear.status_code == 200
    assert res_clear.data["image"] == ""
    assert res_clear.data["image_url"] == ""

    # Cleanup
    Banner.objects.filter(id__in=[banner_url_id, banner_file_id]).delete()
