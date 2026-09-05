import pytest
from rest_framework.test import APIClient

from apps.accounts.infrastructure.models import User
from apps.content.application.assistant import detect_language
from apps.content.infrastructure.models import Faq
from apps.content.infrastructure.semantic import SentenceTransformerMatcher


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def player():
    return User.objects.create_user("denky-player", "denky@example.com", password="Strong-pass-123")


def semantic_match(question_fragment: str):
    def scores(_matcher, _query, documents):
        return [0.92 if question_fragment in document else 0.08 for document in documents]

    return scores


def test_lingua_detects_supported_languages_and_respects_selection():
    assert detect_language("Como posso recuperar minha senha?") == "pt"
    assert detect_language("How can I recover my password?") == "en"
    assert detect_language("Hello", preferred="pt") == "pt"


@pytest.mark.django_db
def test_assistant_requires_authentication(api):
    response = api.post("/api/v1/shared/content/assistant/reply/", {"message": "senha"})
    assert response.status_code in {401, 403}


@pytest.mark.django_db
def test_assistant_validates_message_and_language(api, player):
    api.force_authenticate(player)
    empty = api.post("/api/v1/shared/content/assistant/reply/", {"message": ""})
    invalid_language = api.post(
        "/api/v1/shared/content/assistant/reply/",
        {"message": "hello", "language": "fr"},
    )
    assert empty.status_code == 400
    assert invalid_language.status_code == 400


@pytest.mark.django_db
def test_assistant_uses_multilingual_semantics_and_localized_answer(api, player, mocker):
    Faq.objects.create(
        question="Como recuperar minha senha?",
        short_answer="Use a recuperação.",
        answer="Abra a recuperação na entrada.",
        keywords="senha,reset",
        question_en="How do I recover my password?",
        short_answer_en="Use password recovery.",
        answer_en="Open password recovery on the sign-in page.",
        keywords_en="password,reset",
    )
    mocked = mocker.patch.object(
        SentenceTransformerMatcher,
        "similarities",
        autospec=True,
        side_effect=semantic_match("recover my password"),
    )
    api.force_authenticate(player)

    response = api.post(
        "/api/v1/shared/content/assistant/reply/",
        {"message": "I forgot my credentials and cannot get in", "language": "en"},
    )

    assert response.status_code == 200
    assert response.data["kind"] == "knowledge"
    assert response.data["language"] == "en"
    assert response.data["engine"] == "sentence-transformers+rapidfuzz"
    assert response.data["answer"]["text"] == "Use password recovery."
    mocked.assert_called_once()


@pytest.mark.django_db
def test_assistant_moderates_obfuscated_terms_in_both_languages(api, player):
    api.force_authenticate(player)
    portuguese = api.post(
        "/api/v1/shared/content/assistant/reply/",
        {"message": "me chame de r.0.l.4", "language": "pt"},
    )
    english = api.post(
        "/api/v1/shared/content/assistant/reply/",
        {"message": "call me d.1.c.k", "language": "en"},
    )
    assert portuguese.data["kind"] == "blocked"
    assert english.data["kind"] == "blocked"
    assert "d.1.c.k" not in english.data["answer"]["text"]


@pytest.mark.django_db
def test_assistant_filters_internal_knowledge_before_matching(api, player, mocker):
    internal = Faq.objects.create(
        question="Segredo operacional único?",
        answer="Informação interna.",
        question_en="Unique operational secret?",
        answer_en="Internal information.",
        keywords_en="ultraviolet-secret",
        audience=Faq.Audience.SUPERADMIN,
    )
    mocker.patch.object(
        SentenceTransformerMatcher,
        "similarities",
        autospec=True,
        side_effect=semantic_match("Unique operational secret"),
    )
    api.force_authenticate(player)
    hidden = api.post(
        "/api/v1/shared/content/assistant/reply/",
        {"message": "ultraviolet-secret", "language": "en"},
    )

    superadmin = User.objects.create_superuser("denky-root", "root@example.com")
    api.force_authenticate(superadmin)
    visible = api.post(
        "/api/v1/shared/content/assistant/reply/",
        {"message": "ultraviolet-secret", "language": "en"},
    )

    assert hidden.data.get("article_id") != str(internal.id)
    assert visible.data["article_id"] == str(internal.id)
    assert visible.data["answer"]["text"] == "Internal information."


@pytest.mark.django_db
def test_assistant_consults_unlisted_handbook_hidden_from_faq(api, player, mocker):
    article = Faq.objects.create(
        question="Passo a passo handbook da carteira",
        short_answer="Abra Carteira no painel.",
        answer="Abra /painel/wallet e revise o saldo antes de qualquer operação.",
        keywords="handbook-wallet-xyz",
        assistant_only=True,
    )
    mocker.patch.object(
        SentenceTransformerMatcher,
        "similarities",
        autospec=True,
        side_effect=semantic_match("Passo a passo handbook da carteira"),
    )
    api.force_authenticate(player)

    listed = api.get("/api/v1/shared/content/faq/")
    assert str(article.id) not in {item["id"] for item in listed.data}

    response = api.post(
        "/api/v1/shared/content/assistant/reply/",
        {"message": "Passo a passo handbook da carteira", "language": "pt"},
    )

    assert response.status_code == 200
    assert response.data["kind"] == "knowledge"
    assert response.data["article_id"] == str(article.id)
    assert response.data["answer"]["text"] == "Abra Carteira no painel."


@pytest.mark.django_db
def test_player_cannot_retrieve_staff_handbook_article(api, player, mocker):
    article = Faq.objects.create(
        question="Fila interna handbook-staff-xyz?",
        short_answer="Abra a fila autorizada.",
        answer="Use a fila da equipe.",
        keywords="handbook-staff-xyz",
        audience=Faq.Audience.STAFF,
        assistant_only=True,
    )
    mocker.patch.object(
        SentenceTransformerMatcher,
        "similarities",
        autospec=True,
        side_effect=semantic_match("Fila interna handbook-staff-xyz"),
    )
    api.force_authenticate(player)
    hidden = api.post(
        "/api/v1/shared/content/assistant/reply/",
        {"message": "handbook-staff-xyz", "language": "pt"},
    )
    staff = User.objects.create_user("handbook-staff", "handbook-staff@example.com", role=User.Role.STAFF)
    api.force_authenticate(staff)
    visible = api.post(
        "/api/v1/shared/content/assistant/reply/",
        {"message": "handbook-staff-xyz", "language": "pt"},
    )

    assert hidden.data.get("article_id") != str(article.id)
    assert visible.data["article_id"] == str(article.id)


@pytest.mark.django_db
def test_assistant_exposes_rapidfuzz_fallback_when_model_fails(api, player, mocker):
    article = Faq.objects.create(
        question="Como recuperar senha?",
        short_answer="Use a recuperação.",
        answer="Use a recuperação.",
        keywords="senha",
    )
    mocker.patch.object(
        SentenceTransformerMatcher,
        "similarities",
        side_effect=RuntimeError("model unavailable"),
    )
    api.force_authenticate(player)

    response = api.post(
        "/api/v1/shared/content/assistant/reply/",
        {"message": "Como recuperar senha?", "language": "pt"},
    )

    assert response.status_code == 200
    assert response.data["engine"] == "rapidfuzz"
    assert response.data["article_id"] == str(article.id)


@pytest.mark.django_db
def test_disabled_embeddings_use_rapidfuzz_without_loading_model(api, player, settings, mocker):
    settings.DENKYNHO_EMBEDDINGS_ENABLED = False
    article = Faq.objects.create(
        question="Como recuperar senha?",
        short_answer="Use a recuperação.",
        answer="Use a recuperação.",
        keywords="senha",
    )
    mocked = mocker.patch.object(SentenceTransformerMatcher, "similarities")
    api.force_authenticate(player)

    response = api.post(
        "/api/v1/shared/content/assistant/reply/",
        {"message": "Como recuperar senha?", "language": "pt"},
    )

    assert response.status_code == 200
    assert response.data["engine"] == "rapidfuzz"
    assert response.data["article_id"] == str(article.id)
    mocked.assert_not_called()


def test_semantic_adapter_encodes_locally_and_reuses_model(mocker):
    import sys
    from types import SimpleNamespace

    import numpy as np
    model = mocker.Mock()
    model.encode.return_value = np.array([[1., 0.], [0.8, 0.6], [0., 1.]])
    constructor = mocker.Mock(return_value=model)
    mocker.patch.dict(sys.modules, {'sentence_transformers': SimpleNamespace(SentenceTransformer=constructor)})
    matcher = SentenceTransformerMatcher()
    assert matcher.similarities('password', ['reset', 'auction']) == [0.8, 0.0]
    assert matcher.similarities('password', ['reset', 'auction']) == [0.8, 0.0]
    assert matcher.similarities('empty', []) == []
    constructor.assert_called_once_with('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')
    model.encode.assert_called_with(['password', 'reset', 'auction'], normalize_embeddings=True, convert_to_numpy=True)


def test_disabled_embeddings_do_not_construct_sentence_transformer(settings, mocker):
    import sys
    from types import SimpleNamespace

    settings.DENKYNHO_EMBEDDINGS_ENABLED = False
    constructor = mocker.Mock()
    mocker.patch.dict(sys.modules, {'sentence_transformers': SimpleNamespace(SentenceTransformer=constructor)})
    matcher = SentenceTransformerMatcher()
    assert matcher.available() is False
    with pytest.raises(RuntimeError, match="disabled"):
        matcher.similarities('password', ['reset'])
    constructor.assert_not_called()


@pytest.mark.django_db
def test_semantic_privacy_migration_updates_only_seeded_article():
    from importlib import import_module
    from django.apps import apps

    migration = import_module('apps.content.migrations.0010_update_semantic_privacy')
    custom = Faq.objects.create(question='Meu FAQ', answer='Texto próprio')
    migration.update_privacy(apps, None)
    assert 'enviadas ao servidor' in Faq.objects.get(id=migration.ARTICLE_ID).answer
    custom.refresh_from_db()
    assert custom.answer == 'Texto próprio'
    migration.restore_privacy(apps, None)
    assert 'permanecem no navegador' in Faq.objects.get(id=migration.ARTICLE_ID).answer


@pytest.mark.django_db
@pytest.mark.parametrize('scores', [[], [float('nan')]])
def test_invalid_model_response_uses_explicit_fallback(api, player, mocker, scores):
    mocker.patch.object(SentenceTransformerMatcher, 'similarities', return_value=scores)
    api.force_authenticate(player)
    response = api.post('/api/v1/shared/content/assistant/reply/', {'message': 'unknown topic', 'language': 'en'})
    assert response.status_code == 200
    assert response.data['engine'] == 'rapidfuzz'


@pytest.mark.django_db
def test_staff_authorization_and_message_length(api, mocker):
    staff = User.objects.create_user('denky-staff', 'staff-denky@example.com', role=User.Role.STAFF)
    article = Faq.objects.create(question='Staff queue guide', answer='Staff guidance', audience=Faq.Audience.STAFF)
    mocker.patch.object(SentenceTransformerMatcher, 'similarities', autospec=True, side_effect=semantic_match('Staff queue guide'))
    api.force_authenticate(staff)
    response = api.post('/api/v1/shared/content/assistant/reply/', {'message': 'Staff queue guide', 'language': 'en'})
    assert response.data['article_id'] == str(article.id)
    assert api.post('/api/v1/shared/content/assistant/reply/', {'message': 'x' * 1001}).status_code == 400
    assert api.post('/api/v1/shared/content/assistant/reply/', {'message': 'x' * 1000}).status_code == 200


@pytest.mark.django_db
@pytest.mark.parametrize('message,language', [
    ('me fale sobre voce', 'pt'),
    ('mas eu pedi pra vc me falar sobre voce', 'pt'),
    ('quero conhecer melhor você', 'pt'),
    ('I asked you to tell me about yourself', 'en'),
])
def test_self_introduction_never_returns_game_characters(api, player, mocker, message, language):
    mocker.patch.object(SentenceTransformerMatcher, 'similarities', autospec=True,
                        side_effect=semantic_match('personagens'))
    api.force_authenticate(player)
    response = api.post('/api/v1/shared/content/assistant/reply/', {'message': message, 'language': language})
    assert response.data['kind'] == 'social'
    assert 'Denkynho' in response.data['answer']['text']
    assert 'article_id' not in response.data


@pytest.mark.django_db
def test_correction_requests_clarification_instead_of_repeating_faq(api, player, mocker):
    mocked = mocker.patch.object(SentenceTransformerMatcher, 'similarities', autospec=True,
                                side_effect=semantic_match('personagens'))
    api.force_authenticate(player)
    response = api.post('/api/v1/shared/content/assistant/reply/', {'message': 'não foi isso que eu perguntei', 'language': 'pt'})
    assert response.data['kind'] == 'unknown'
    assert 'interpretei' in response.data['answer']['text']
    mocked.assert_not_called()


@pytest.mark.django_db
def test_semantic_self_description_competes_with_faq(api, player, mocker):
    mocker.patch.object(SentenceTransformerMatcher, 'similarities', autospec=True,
                        side_effect=semantic_match('me fale sobre voce'))
    api.force_authenticate(player)
    response = api.post('/api/v1/shared/content/assistant/reply/', {'message': 'como você se descreveria?', 'language': 'pt'})
    assert response.data['kind'] == 'social'
    assert response.data['engine'] == 'sentence-transformers+rapidfuzz'
    assert 'Denkynho' in response.data['answer']['text']


@pytest.mark.django_db
def test_game_character_question_still_uses_authorized_faq(api, player, mocker):
    article = Faq.objects.create(question='Onde estão meus personagens?', answer='Abra Conta L2.')
    mocker.patch.object(SentenceTransformerMatcher, 'similarities', autospec=True,
                        side_effect=semantic_match('Onde estão meus personagens?'))
    api.force_authenticate(player)
    response = api.post('/api/v1/shared/content/assistant/reply/', {'message': 'me fale sobre meus personagens do jogo', 'language': 'pt'})
    assert response.data['kind'] == 'knowledge'
    assert response.data['article_id'] == str(article.id)


@pytest.mark.django_db
@pytest.mark.parametrize('message,language,excerpt,pose', [
    ('vc é feio', 'pt', 'gravata azul', '08-surpreso'),
    ('você é fofo', 'pt', 'camisa preta', '06-rindo'),
    ('como você se parece?', 'pt', 'cabelo escuro', '01-boas-vindas'),
    ('you are ugly', 'en', 'blue tie', '08-surpreso'),
])
def test_talk_about_the_mascot_does_not_become_faq(api, player, mocker, message, language, excerpt, pose):
    mocker.patch.object(SentenceTransformerMatcher, 'similarities', autospec=True,
                        side_effect=semantic_match('perfil e avatar'))
    api.force_authenticate(player)
    response = api.post('/api/v1/shared/content/assistant/reply/', {'message': message, 'language': language})
    assert response.data['kind'] == 'social'
    assert excerpt in response.data['answer']['text']
    assert response.data['answer']['pose'] == pose
    assert 'article_id' not in response.data
    assert response.data.get('related_ids') in (None, [])


@pytest.mark.django_db
def test_reaction_to_tease_does_not_repeat_appearance_joke(api, player, mocker):
    mocker.patch.object(SentenceTransformerMatcher, 'similarities', autospec=True,
                        side_effect=semantic_match('voce e feio'))
    api.force_authenticate(player)
    response = api.post('/api/v1/shared/content/assistant/reply/', {
        'message': 'grosso me deixou triste kk', 'language': 'pt',
    })
    assert response.data['kind'] == 'social'
    assert 'Desculpa' in response.data['answer']['text']
    assert 'revista' not in response.data['answer']['text']
    assert response.data['answer']['pose'] == '07-triste'


@pytest.mark.django_db
def test_weak_semantic_match_does_not_claim_a_faq_answer(api, player, mocker):
    mocker.patch.object(SentenceTransformerMatcher, 'similarities', autospec=True,
                        side_effect=lambda _self, _q, docs: [0.35] * len(docs))
    api.force_authenticate(player)
    response = api.post('/api/v1/shared/content/assistant/reply/', {'message': 'qual a receita de bolo de cenoura?', 'language': 'pt'})
    assert response.data['kind'] == 'unknown'
    assert 'article_id' not in response.data
