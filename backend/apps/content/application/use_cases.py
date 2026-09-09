from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID

from apps.content.domain.faq import FaqAudience
from apps.content.domain.repositories import IContentCatalogRepository
from common.architecture.base import UseCase
from common.architecture.exceptions import EntityNotFoundError
from common.i18n import localized_text, resolve_language


@dataclass(frozen=True, slots=True)
class NewsDTO:
    """Conteúdo público de uma notícia, com slug e data de publicação serializada.

    É um objeto de dados; não carrega métodos de persistência do ORM. Consulte os campos tipados
    abaixo ao montar ou consumir o resultado.
    """

    id: UUID
    slug: str
    title: str
    excerpt: str
    body: str
    published_at: str
    language: str = "pt"


@dataclass(frozen=True, slots=True)
class ListNewsInput:
    """Idioma solicitado para listar notícias publicadas."""

    language: str = "pt"


class ListNewsUseCase(UseCase[ListNewsInput | None, list[NewsDTO]]):
    """Lista notícias publicadas como DTOs com data de publicação em formato ISO.

    Uso: resolva pelo container e chame ``execute(data)`` com ``ListNewsInput`` ou ``None``. O
    retorno é ``list[NewsDTO]``.
    """

    def __init__(self, catalog: IContentCatalogRepository) -> None:
        self._catalog = catalog

    def execute(self, data: ListNewsInput | None = None) -> list[NewsDTO]:
        language = resolve_language(data.language if data else "pt")
        return [
            self._dump(item, language)
            for item in self._catalog.list_published_news()
        ]

    @staticmethod
    def _dump(item: Any, language: str) -> NewsDTO:
        return NewsDTO(
            id=item.id,
            slug=item.slug,
            title=localized_text(item, "title", language),
            excerpt=localized_text(item, "excerpt", language),
            body=localized_text(item, "body", language),
            published_at=item.published_at.isoformat(),
            language=language,
        )


@dataclass(frozen=True, slots=True)
class GetNewsInput:
    """Dados de entrada de ``GetNewsUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria.
    """

    slug: str
    language: str = "pt"


class GetNewsUseCase(UseCase[GetNewsInput, NewsDTO]):
    """Obtém uma notícia publicada pelo slug ou sinaliza recurso não encontrado.

    Uso: resolva pelo container e chame ``execute(data)`` com ``GetNewsInput``. O retorno é
    ``NewsDTO``.
    """

    def __init__(self, catalog: IContentCatalogRepository) -> None:
        self._catalog = catalog

    def execute(self, data: GetNewsInput) -> NewsDTO:
        item = self._catalog.get_published_news_by_slug(data.slug)
        if item is None:
            raise EntityNotFoundError("Notícia não encontrada.")
        language = resolve_language(data.language)
        return ListNewsUseCase._dump(item, language)


@dataclass(frozen=True, slots=True)
class ListFaqInput:
    """Maior audiência que a identidade autenticada pode consultar.

    ``for_assistant`` inclui o handbook interno usado só pelo Denkynho. As listagens HTTP
    omitem esses artigos para não misturá-los à página FAQ nem às sugestões da Ajuda.
    """

    audience: str = FaqAudience.PUBLIC
    language: str = "pt"
    for_assistant: bool = False


class ListFaqUseCase(UseCase[ListFaqInput, list[dict]]):
    """Lista artigos publicados com as três camadas usadas pela central de ajuda.

    Uso: resolva pelo container e chame ``execute(data)`` com ``None`` (ou omita o argumento). O
    retorno inclui categoria, rótulo, resposta rápida, detalhes e palavras-chave. Sem
    ``for_assistant``, artigos exclusivos do assistente ficam de fora.
    """

    def __init__(self, catalog: IContentCatalogRepository) -> None:
        self._catalog = catalog

    def execute(self, data: ListFaqInput | None = None) -> list[dict]:
        requested = data.audience if data else FaqAudience.PUBLIC
        language = resolve_language(data.language if data else "pt")
        allowed = {
            FaqAudience.PUBLIC: [FaqAudience.PUBLIC],
            FaqAudience.STAFF: [FaqAudience.PUBLIC, FaqAudience.STAFF],
            FaqAudience.SUPERADMIN: [
                FaqAudience.PUBLIC,
                FaqAudience.STAFF,
                FaqAudience.SUPERADMIN,
            ],
        }.get(requested, [FaqAudience.PUBLIC])
        assistant_only = None if (data and data.for_assistant) else False
        rows = self._catalog.list_published_faq(
            audiences=allowed,
            assistant_only=assistant_only,
        )
        return [self._dump(item, language) for item in rows]

    @staticmethod
    def _dump(item: Any, language: str) -> dict:
        effective = language
        if language == "en" and item.question_en and item.answer_en:
            question, short_answer, answer, keywords = (
                item.question_en,
                item.short_answer_en,
                item.answer_en,
                item.keywords_en,
            )
        elif language == "es" and item.question_es and item.answer_es:
            question, short_answer, answer, keywords = (
                item.question_es,
                item.short_answer_es,
                item.answer_es,
                item.keywords_es,
            )
        else:
            effective = "pt"
            question, short_answer, answer, keywords = (
                item.question,
                item.short_answer,
                item.answer,
                item.keywords,
            )
        category_labels_pt = {
            "getting_started": "Primeiros passos",
            "account_security": "Conta e segurança",
            "game_accounts": "Contas e personagens",
            "economy": "Carteira e inventário",
            "commerce": "Loja e comércio",
            "games_rewards": "Jogos e recompensas",
            "community": "Conteúdo e comunidade",
            "support": "Ajuda e atendimento",
        }
        category_labels_en = {
            "getting_started": "Getting started",
            "account_security": "Account and security",
            "game_accounts": "Game accounts and characters",
            "economy": "Wallet and inventory",
            "commerce": "Shop and commerce",
            "games_rewards": "Games and rewards",
            "community": "Community and content",
            "support": "Support and policies",
        }
        category_labels_es = {
            "getting_started": "Primeros pasos",
            "account_security": "Cuenta y seguridad",
            "game_accounts": "Cuentas y personajes",
            "economy": "Cartera e inventario",
            "commerce": "Tienda y comercio",
            "games_rewards": "Juegos y recompensas",
            "community": "Contenido y comunidad",
            "support": "Ayuda y atención",
        }
        audience_labels_pt = {
            FaqAudience.PUBLIC: "Todos os usuários",
            FaqAudience.STAFF: "Equipe",
            FaqAudience.SUPERADMIN: "Superadministradores",
        }
        audience_labels_en = {
            FaqAudience.PUBLIC: "All users",
            FaqAudience.STAFF: "Staff",
            FaqAudience.SUPERADMIN: "Superadministrators",
        }
        audience_labels_es = {
            FaqAudience.PUBLIC: "Todos los usuarios",
            FaqAudience.STAFF: "Equipo",
            FaqAudience.SUPERADMIN: "Superadministradores",
        }
        labels = {
            "pt": (category_labels_pt, audience_labels_pt),
            "en": (category_labels_en, audience_labels_en),
            "es": (category_labels_es, audience_labels_es),
        }
        category_labels, audience_labels = labels[effective]
        return {
            "id": str(item.id),
            "question": question,
            "short_answer": short_answer,
            "answer": answer,
            "category": item.category,
            "category_label": category_labels.get(item.category, item.category),
            "keywords": [keyword.strip() for keyword in keywords.split(",") if keyword.strip()],
            "audience": item.audience,
            "audience_label": audience_labels.get(item.audience, item.audience),
            "language": effective,
        }


class ListDownloadsUseCase(UseCase[None, list[dict]]):
    """Lista links de download publicados com título, categoria e URL.

    Uso: resolva pelo container e chame ``execute(data)`` com ``None`` (ou omita o argumento). O
    retorno é ``list[dict]``.
    """

    def __init__(self, catalog: IContentCatalogRepository) -> None:
        self._catalog = catalog

    def execute(self, data: None = None) -> list[dict]:
        return [
            {"id": str(item.id), "title": item.title, "url": item.url, "category": item.category}
            for item in self._catalog.list_published_downloads()
        ]


@dataclass(frozen=True, slots=True)
class WikiPageDTO:
    """Conteúdo ou metadados de uma página da wiki; listagens podem omitir o corpo.

    É um objeto de dados; não carrega métodos de persistência do ORM. Consulte os campos tipados
    abaixo ao montar ou consumir o resultado.
    """

    id: UUID
    slug: str
    title: str
    summary: str
    body: str
    category: str
    icon: str
    is_menu_item: bool
    language: str = "pt"


@dataclass(frozen=True, slots=True)
class ListWikiInput:
    """Idioma solicitado para listar páginas da wiki."""

    language: str = "pt"


class ListWikiPagesUseCase(UseCase[ListWikiInput | None, list[WikiPageDTO]]):
    """Lista os metadados das páginas publicadas da wiki, deixando o corpo vazio na listagem.

    Uso: resolva pelo container e chame ``execute(data)`` com ``ListWikiInput`` ou ``None``. O
    retorno é ``list[WikiPageDTO]``.
    """

    def __init__(self, catalog: IContentCatalogRepository) -> None:
        self._catalog = catalog

    def execute(self, data: ListWikiInput | None = None) -> list[WikiPageDTO]:
        language = resolve_language(data.language if data else "pt")
        return [
            self._dump(item, language, include_body=False)
            for item in self._catalog.list_published_wiki()
        ]

    @staticmethod
    def _dump(item: Any, language: str, *, include_body: bool) -> WikiPageDTO:
        return WikiPageDTO(
            id=item.id,
            slug=item.slug,
            title=localized_text(item, "title", language),
            summary=localized_text(item, "summary", language),
            body=localized_text(item, "body", language) if include_body else "",
            category=item.category,
            icon=item.icon,
            is_menu_item=item.is_menu_item,
            language=language,
        )


@dataclass(frozen=True, slots=True)
class GetWikiPageInput:
    """Dados de entrada de ``GetWikiPageUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria.
    """

    slug: str
    language: str = "pt"


class GetWikiPageUseCase(UseCase[GetWikiPageInput, WikiPageDTO]):
    """Obtém o conteúdo completo de uma página publicada pelo slug.

    Uso: resolva pelo container e chame ``execute(data)`` com ``GetWikiPageInput``. O retorno é
    ``WikiPageDTO``.
    """

    def __init__(self, catalog: IContentCatalogRepository) -> None:
        self._catalog = catalog

    def execute(self, data: GetWikiPageInput) -> WikiPageDTO:
        item = self._catalog.get_published_wiki_by_slug(data.slug)
        if item is None:
            raise EntityNotFoundError("Página do wiki não encontrada.")
        language = resolve_language(data.language)
        return ListWikiPagesUseCase._dump(item, language, include_body=True)


@dataclass(frozen=True, slots=True)
class SearchWikiInput:
    """Dados de entrada de ``SearchWikiUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria.
    """

    query: str
    language: str = "pt"


class SearchWikiUseCase(UseCase[SearchWikiInput, list[WikiPageDTO]]):
    """Pesquisa páginas publicadas e retorna até 30 resultados sem o corpo completo.

    Uso: resolva pelo container e chame ``execute(data)`` com ``SearchWikiInput``. O retorno é
    ``list[WikiPageDTO]``.
    """

    def __init__(self, catalog: IContentCatalogRepository) -> None:
        self._catalog = catalog

    def execute(self, data: SearchWikiInput) -> list[WikiPageDTO]:
        query = data.query.strip()
        if len(query) < 2:
            return []
        language = resolve_language(data.language)
        return [
            ListWikiPagesUseCase._dump(item, language, include_body=False)
            for item in self._catalog.search_published_wiki(query)
        ]


class ListCalendarEventsUseCase(UseCase[None, list[dict]]):
    """Lista eventos publicados com datas de início e fim em formato ISO.

    Uso: resolva pelo container e chame ``execute(data)`` com ``None`` (ou omita o argumento). O
    retorno é ``list[dict]``.
    """

    def __init__(self, catalog: IContentCatalogRepository) -> None:
        self._catalog = catalog

    def execute(self, data: None = None) -> list[dict]:
        return [
            {
                "id": str(item.id),
                "title": item.title,
                "description": item.description,
                "starts_at": item.starts_at.isoformat(),
                "ends_at": item.ends_at.isoformat(),
                "color": item.color,
            }
            for item in self._catalog.list_published_calendar()
        ]
