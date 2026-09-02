import pytest

from apps.content.infrastructure.models import News, WikiPage


@pytest.mark.django_db
@pytest.mark.parametrize("model", [News, WikiPage])
def test_slug_is_generated_once_and_remains_stable_when_title_changes(model):
    row = model.objects.create(title="Olá, aventureiro!", body="Conteúdo")
    assert row.slug == "ola-aventureiro"
    row.title = "Outro título"
    row.save()
    row.refresh_from_db()
    assert row.slug == "ola-aventureiro"


@pytest.mark.django_db
@pytest.mark.parametrize("model", [News, WikiPage])
def test_explicit_slug_is_preserved(model):
    row = model.objects.create(title="Título", body="Conteúdo", slug="link-publicado")
    assert row.slug == "link-publicado"
