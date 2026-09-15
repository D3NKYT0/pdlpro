from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.communication.infrastructure.models import Notification
from apps.content.infrastructure.models import (
    CalendarEvent,
    DownloadLink,
    Faq,
    WikiPage,
)

User = get_user_model()


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def player(db):
    return User.objects.create_user(username="hero", email="hero@pdl.dev", password="Secret123")


@pytest.fixture
def staff(db):
    return User.objects.create_user(
        username="gm",
        email="gm@pdl.dev",
        password="Secret123",
        is_staff=True,
        role=User.Role.STAFF,
    )


@pytest.mark.django_db
@pytest.mark.parametrize(
    "path",
    [
        "/api/v1/staff/calendar/",
        "/api/v1/staff/faq/",
        "/api/v1/staff/wiki/",
        "/api/v1/staff/downloads/",
        "/api/v1/staff/notifications/",
    ],
)
def test_player_cannot_access_staff_cms(api, player, path):
    api.force_authenticate(user=player)
    assert api.get(path).status_code == 403


@pytest.mark.django_db
def test_staff_calendar_crud_and_public_visibility(api, staff):
    api.force_authenticate(user=staff)
    starts = timezone.now()
    ends = starts + timedelta(hours=2)
    created = api.post(
        "/api/v1/staff/calendar/",
        {
            "title": "Siege",
            "description": "Castelos",
            "starts_at": starts.isoformat(),
            "ends_at": ends.isoformat(),
            "color": "crimson",
            "is_published": True,
        },
        format="json",
    )
    assert created.status_code == 200, created.data
    assert created.data["title"] == "Siege"
    assert created.data["is_published"] is True
    event_id = created.data["id"]
    public = api.get("/api/v1/public/calendar/")
    assert public.status_code == 200
    assert public.data[0]["title"] == "Siege"

    hidden = api.put(
        "/api/v1/staff/calendar/",
        {
            "id": event_id,
            "title": "Siege",
            "description": "Rascunho",
            "starts_at": starts.isoformat(),
            "ends_at": ends.isoformat(),
            "is_published": False,
        },
        format="json",
    )
    assert hidden.status_code == 200
    assert api.get("/api/v1/public/calendar/").data == []
    listed = api.get("/api/v1/staff/calendar/")
    assert listed.data[0]["description"] == "Rascunho"
    deleted = api.delete("/api/v1/staff/calendar/", {"id": event_id}, format="json")
    assert deleted.status_code == 200
    assert CalendarEvent.objects.count() == 0


@pytest.mark.django_db
def test_staff_calendar_rejects_inverted_range(api, staff):
    api.force_authenticate(user=staff)
    starts = timezone.now()
    response = api.post(
        "/api/v1/staff/calendar/",
        {
            "title": "Siege",
            "starts_at": starts.isoformat(),
            "ends_at": (starts - timedelta(hours=1)).isoformat(),
        },
        format="json",
    )
    assert response.status_code == 400
    assert "término" in response.data["message"].lower()


@pytest.mark.django_db
def test_staff_faq_saves_translations_and_handbook_flag(api, staff):
    api.force_authenticate(user=staff)
    created = api.post(
        "/api/v1/staff/faq/",
        {
            "question": "Como doar?",
            "short_answer": "Abra a carteira.",
            "answer": "Pela carteira.",
            "question_en": "How to donate?",
            "short_answer_en": "Open the wallet.",
            "answer_en": "Use the wallet.",
            "category": "economy",
            "audience": "public",
            "keywords": "doar, moedas",
            "is_published": True,
        },
        format="json",
    )
    assert created.status_code == 200, created.data
    public_en = api.get("/api/v1/public/faq/?lang=en")
    article = next(item for item in public_en.data if item["id"] == created.data["id"])
    assert article["question"] == "How to donate?"
    handbook = api.post(
        "/api/v1/staff/faq/",
        {
            "question": "Passo interno",
            "answer": "Só o Denkynho.",
            "assistant_only": True,
            "audience": "staff",
            "is_published": True,
        },
        format="json",
    )
    assert handbook.status_code == 200
    public_ids = {item["id"] for item in api.get("/api/v1/public/faq/").data}
    assert created.data["id"] in public_ids
    assert handbook.data["id"] not in public_ids
    assert Faq.objects.filter(id=handbook.data["id"], assistant_only=True).exists()


@pytest.mark.django_db
def test_staff_faq_rejects_unknown_category(api, staff):
    api.force_authenticate(user=staff)
    response = api.post(
        "/api/v1/staff/faq/",
        {"question": "?", "answer": "!", "category": "unknown"},
        format="json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_staff_wiki_and_downloads_crud(api, staff):
    api.force_authenticate(user=staff)
    wiki = api.post(
        "/api/v1/staff/wiki/",
        {
            "title": "Comandos",
            "summary": "Lista",
            "body": "<p>Ajuda do chat.</p><script>alert(1)</script>",
            "category": "commands",
            "is_published": True,
        },
        format="json",
    )
    assert wiki.status_code == 200, wiki.data
    assert wiki.data["slug"] == "comandos"
    assert "<script>" not in wiki.data["body"]
    public_wiki = api.get("/api/v1/public/wiki/comandos/")
    assert public_wiki.status_code == 200
    assert "Ajuda do chat." in public_wiki.data["body"]

    collision = api.post(
        "/api/v1/staff/wiki/",
        {"title": "Outra", "body": "<p>Texto</p>", "slug": "comandos"},
        format="json",
    )
    assert collision.status_code == 400

    download = api.post(
        "/api/v1/staff/downloads/",
        {"title": "Cliente", "url": "https://files.pdl.dev/client.zip", "category": "client", "is_published": True},
        format="json",
    )
    assert download.status_code == 200, download.data
    public_downloads = api.get("/api/v1/public/downloads/")
    assert public_downloads.data[0]["url"] == "https://files.pdl.dev/client.zip"
    invalid = api.post(
        "/api/v1/staff/downloads/",
        {"title": "Ruim", "url": "javascript:alert(1)"},
        format="json",
    )
    assert invalid.status_code == 400
    removed = api.delete("/api/v1/staff/downloads/", {"id": download.data["id"]}, format="json")
    assert removed.status_code == 200
    assert DownloadLink.objects.count() == 0
    api.delete("/api/v1/staff/wiki/", {"id": wiki.data["id"]}, format="json")
    assert WikiPage.objects.count() == 0


@pytest.mark.django_db
def test_staff_notifications_send_to_user_broadcast_and_delete(api, staff, player):
    api.force_authenticate(user=staff)
    inactive = User.objects.create_user(
        username="ghost",
        email="ghost@pdl.dev",
        password="Secret123",
        is_active=False,
    )
    missing = api.post(
        "/api/v1/staff/notifications/",
        {"title": "Olá", "username": "nobody"},
        format="json",
    )
    assert missing.status_code == 400
    sent = api.post(
        "/api/v1/staff/notifications/",
        {"title": "Manutenção", "body": "Hoje às 22h", "kind": "info", "username": "hero", "link": "/news"},
        format="json",
    )
    assert sent.status_code == 200, sent.data
    assert sent.data["sent"] == 1
    assert sent.data["username"] == "hero"
    api.force_authenticate(user=player)
    inbox = api.get("/api/v1/customer/notifications/")
    assert inbox.data["unread"] == 1
    assert inbox.data["results"][0]["title"] == "Manutenção"

    api.force_authenticate(user=staff)
    broadcast = api.post(
        "/api/v1/staff/notifications/",
        {"title": "Aviso geral", "body": "Todos", "broadcast": True},
        format="json",
    )
    assert broadcast.status_code == 200, broadcast.data
    assert broadcast.data["sent"] == 2
    assert Notification.objects.filter(title="Aviso geral").count() == 2
    assert not Notification.objects.filter(user=inactive).exists()
    listed = api.get("/api/v1/staff/notifications/?q=hero")
    assert listed.status_code == 200
    assert listed.data
    deleted = api.delete("/api/v1/staff/notifications/", {"id": sent.data["id"]}, format="json")
    assert deleted.status_code == 200
    assert not Notification.objects.filter(id=sent.data["id"]).exists()
