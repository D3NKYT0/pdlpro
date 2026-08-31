from django.utils import timezone
import pytest
from rest_framework.test import APIClient

from apps.content.infrastructure.models import CalendarEvent, Faq, WikiPage


@pytest.fixture
def api():
    return APIClient()


@pytest.mark.django_db
def test_wiki_list_search_and_detail(api):
    WikiPage.objects.create(
        slug="comandos",
        title="Comandos",
        summary="Lista de comandos",
        body="Use .help no jogo.",
        category="commands",
    )
    WikiPage.objects.create(slug="raids", title="Raids", summary="Bosses", body="Antharas.", category="raids")
    listed = api.get("/api/v1/public/wiki/")
    assert listed.status_code == 200
    assert len(listed.data) == 2
    search = api.get("/api/v1/public/wiki/?q=antharas")
    assert search.status_code == 200
    assert search.data[0]["slug"] == "raids"
    detail = api.get("/api/v1/public/wiki/comandos/")
    assert detail.status_code == 200
    assert "help" in detail.data["body"]


@pytest.mark.django_db
def test_calendar_and_faq(api):
    now = timezone.now()
    CalendarEvent.objects.create(title="Siege", starts_at=now, ends_at=now, description="Castelos")
    Faq.objects.create(question="Como doar?", answer="Pela carteira.", is_published=True)
    calendar = api.get("/api/v1/public/calendar/")
    assert calendar.status_code == 200
    assert calendar.data[0]["title"] == "Siege"
    faq = api.get("/api/v1/public/faq/")
    assert faq.status_code == 200
    assert faq.data[0]["question"] == "Como doar?"
