from django.utils import timezone
import pytest
from rest_framework.test import APIClient

from apps.accounts.infrastructure.models import User
from apps.content.infrastructure.models import CalendarEvent, Faq, WikiPage


@pytest.mark.django_db
def test_initial_faq_catalog_is_published_in_response_layers(api):
    response = api.get("/api/v1/public/faq/")
    seeded = [item for item in response.data if item["id"].startswith("c0100000-")]
    assert len(seeded) == 38
    assert {item["category"] for item in seeded} == {
        "getting_started", "account_security", "game_accounts", "economy",
        "commerce", "games_rewards", "community", "support",
    }
    assert all(item["short_answer"] and item["answer"] and item["keywords"] for item in seeded)


@pytest.mark.django_db
def test_initial_internal_catalog_respects_staff_and_superadmin_audiences(api):
    staff = User.objects.create_user("helper", "helper@example.com", role=User.Role.STAFF)
    api.force_authenticate(user=staff)
    staff_response = api.get("/api/v1/shared/content/faq/")
    staff_seeded = {item["id"] for item in staff_response.data if item["id"].startswith("c0200000-")}
    assert len(staff_seeded) == 3

    superadmin = User.objects.create_superuser("roothelper", "roothelper@example.com")
    api.force_authenticate(user=superadmin)
    super_response = api.get("/api/v1/shared/content/faq/")
    super_seeded = {item["id"] for item in super_response.data if item["id"].startswith("c0200000-")}
    assert len(super_seeded) == 4


def test_denkynho_handbook_respects_field_limits():
    from apps.content.migrations.0013_seed_denkynho_handbook import HANDBOOK

    assert len(HANDBOOK) == 61
    assert {item[0] for item in HANDBOOK} == set(range(1, 62))
    assert sum(item[1] == "public" for item in HANDBOOK) == 45
    assert sum(item[1] == "staff" for item in HANDBOOK) == 13
    assert sum(item[1] == "superadmin" for item in HANDBOOK) == 3
    for item in HANDBOOK:
        _, _, category, question, short_answer, answer, keywords, question_en, short_en, answer_en, keywords_en = item
        assert category in {
            "getting_started", "account_security", "game_accounts", "economy",
            "commerce", "games_rewards", "community", "support",
        }
        assert 0 < len(question) <= 250 and 0 < len(short_answer) <= 400 and 0 < len(keywords) <= 500
        assert 0 < len(question_en) <= 250 and 0 < len(short_en) <= 400 and 0 < len(keywords_en) <= 500
        assert answer and answer_en


@pytest.mark.django_db
def test_denkynho_handbook_is_seeded_and_hidden_from_faq_listings(api):
    from uuid import UUID

    from apps.content.migrations.0013_seed_denkynho_handbook import HANDBOOK, PREFIX

    ids = [UUID(f"{PREFIX}{item[0]:012d}") for item in HANDBOOK]
    handbook = list(Faq.objects.filter(id__in=ids))
    assert len(handbook) == len(HANDBOOK)
    assert all(item.assistant_only and item.is_published and item.question_en and item.answer_en for item in handbook)

    public_ids = {item["id"] for item in api.get("/api/v1/public/faq/").data}
    assert not any(item_id.startswith("c0300000-") for item_id in public_ids)

    player = User.objects.create_user("handbook-player", "handbook-player@example.com")
    api.force_authenticate(player)
    player_ids = {item["id"] for item in api.get("/api/v1/shared/content/faq/").data}
    assert not any(item_id.startswith("c0300000-") for item_id in player_ids)

    superadmin = User.objects.create_superuser("handbook-root", "handbook-root@example.com")
    api.force_authenticate(superadmin)
    staff_ids = {item["id"] for item in api.get("/api/v1/shared/content/faq/").data}
    assert not any(item_id.startswith("c0300000-") for item_id in staff_ids)


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
    Faq.objects.create(
        question="Como doar?",
        short_answer="Abra a carteira.",
        answer="Pela carteira.",
        category=Faq.Category.ECONOMY,
        keywords="apoio, moedas",
        is_published=True,
    )
    calendar = api.get("/api/v1/public/calendar/")
    assert calendar.status_code == 200
    assert calendar.data[0]["title"] == "Siege"
    faq = api.get("/api/v1/public/faq/")
    assert faq.status_code == 200
    assert faq.data[0] == {
        "id": str(Faq.objects.get(question="Como doar?").id),
        "question": "Como doar?",
        "short_answer": "Abra a carteira.",
        "answer": "Pela carteira.",
        "category": "economy",
        "category_label": "Carteira e inventário",
        "keywords": ["apoio", "moedas"],
        "audience": "public",
        "audience_label": "Todos os usuários",
        "language": "pt",
    }


@pytest.mark.django_db
def test_faq_returns_english_layers_when_requested(api):
    Faq.objects.create(
        question="Como recuperar senha?",
        short_answer="Use a recuperação.",
        answer="Abra a recuperação.",
        keywords="senha",
        question_en="How do I recover my password?",
        short_answer_en="Use password recovery.",
        answer_en="Open password recovery on the sign-in page.",
        keywords_en="password,reset",
        category=Faq.Category.ACCOUNT_SECURITY,
    )

    response = api.get("/api/v1/public/faq/?lang=en")
    article = next(item for item in response.data if item["question"] == "How do I recover my password?")

    assert response.status_code == 200
    assert article["question"] == "How do I recover my password?"
    assert article["language"] == "en"
    assert article["category_label"] == "Account and security"


@pytest.mark.django_db
def test_public_faq_never_exposes_internal_articles(api):
    Faq.objects.create(question="Público", answer="Todos", audience=Faq.Audience.PUBLIC)
    Faq.objects.create(question="Equipe", answer="Interno", audience=Faq.Audience.STAFF)
    Faq.objects.create(question="Superadmin", answer="Restrito", audience=Faq.Audience.SUPERADMIN)

    response = api.get("/api/v1/public/faq/")

    assert response.status_code == 200
    questions = {item["question"] for item in response.data}
    assert "Público" in questions
    assert "Equipe" not in questions
    assert "Superadmin" not in questions


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("user_fields", "visible", "hidden"),
    [
        ({"role": User.Role.PLAYER}, {"Público"}, {"Equipe", "Superadmin"}),
        ({"role": User.Role.MODERATOR}, {"Público", "Equipe"}, {"Superadmin"}),
        ({"role": User.Role.STAFF}, {"Público", "Equipe"}, {"Superadmin"}),
        (
            {"role": User.Role.ADMIN, "is_staff": True, "is_superuser": True},
            {"Público", "Equipe", "Superadmin"},
            set(),
        ),
    ],
)
def test_authenticated_faq_filters_articles_by_trusted_role(api, user_fields, visible, hidden):
    for question, audience in (
        ("Público", Faq.Audience.PUBLIC),
        ("Equipe", Faq.Audience.STAFF),
        ("Superadmin", Faq.Audience.SUPERADMIN),
    ):
        Faq.objects.create(question=question, answer=question, audience=audience)
    user = User.objects.create_user(
        username=f"user{User.objects.count()}",
        email=f"user{User.objects.count()}@example.com",
        password="Strong-pass-123",
        **user_fields,
    )
    api.force_authenticate(user=user)

    response = api.get("/api/v1/shared/content/faq/")

    assert response.status_code == 200
    questions = {item["question"] for item in response.data}
    assert visible <= questions
    assert not (hidden & questions)


@pytest.mark.django_db
def test_authenticated_faq_rejects_anonymous_user(api):
    response = api.get("/api/v1/shared/content/faq/")
    assert response.status_code in {401, 403}


@pytest.mark.django_db
def test_legal_documents(api):
    listed = api.get("/api/v1/public/legal/")
    assert listed.status_code == 200
    slugs = {item["slug"] for item in listed.data["documents"]}
    assert slugs == {"terms", "privacy", "agreement"}
    terms = api.get("/api/v1/public/legal/terms/")
    assert terms.status_code == 200
    assert terms.data["title"]
    assert terms.data["body"]
