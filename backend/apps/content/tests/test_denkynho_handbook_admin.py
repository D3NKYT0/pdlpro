from django.urls import reverse

from apps.accounts.infrastructure.models import User
from apps.content.infrastructure.models import Faq


def test_handbook_admin_creates_assistant_only_articles_without_a_content_migration(client, db):
    user = User.objects.create_superuser("handbook-editor", "handbook-editor@example.com", password="test-password")
    client.force_login(user)
    url = reverse("admin:content_denkynhohandbook_add")
    assert client.get(url).status_code == 200
    listed = client.get(reverse("admin:content_denkynhohandbook_changelist"))
    assert listed.status_code == 200
    data = {
        "question": "Como abro a carteira pelo Denkynho?",
        "short_answer": "Abra Carteira no menu do painel.",
        "answer": "1) Abra o painel. 2) Escolha Carteira. 3) Confira o saldo na tela.",
        "question_en": "How do I open the wallet with Denkynho?",
        "short_answer_en": "Open Wallet in the panel menu.",
        "answer_en": "1) Open the panel. 2) Choose Wallet. 3) Check the balance on screen.",
        "category": "economy",
        "audience": "public",
        "order": "0",
        "is_published": "on",
        "_save": "1",
    }
    response = client.post(url, data)
    assert response.status_code == 302, getattr(response, "context", None) and response.context["adminform"].form.errors
    article = Faq.objects.get(question=data["question"])
    assert article.assistant_only is True
    assert article.is_published is True
    public = client.get("/api/v1/public/faq/")
    assert data["question"] not in {item["question"] for item in public.json()}
