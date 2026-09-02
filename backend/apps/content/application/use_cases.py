from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from django.db.models import Q

from apps.content.infrastructure.models import CalendarEvent, DownloadLink, Faq, News, WikiPage
from common.architecture.base import UseCase
from common.architecture.exceptions import EntityNotFoundError


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


class ListNewsUseCase(UseCase[None, list[NewsDTO]]):
    """Lista notícias publicadas como DTOs com data de publicação em formato ISO.

    Uso: resolva pelo container e chame ``execute(data)`` com ``None`` (ou omita o argumento). O
    retorno é ``list[NewsDTO]``.
    """

    def execute(self, data: None = None) -> list[NewsDTO]:
        return [
            NewsDTO(
                id=item.id,
                slug=item.slug,
                title=item.title,
                excerpt=item.excerpt,
                body=item.body,
                published_at=item.published_at.isoformat(),
            )
            for item in News.objects.filter(is_published=True)
        ]


@dataclass(frozen=True, slots=True)
class GetNewsInput:
    """Dados de entrada de ``GetNewsUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria.
    """

    slug: str


class GetNewsUseCase(UseCase[GetNewsInput, NewsDTO]):
    """Obtém uma notícia publicada pelo slug ou sinaliza recurso não encontrado.

    Uso: resolva pelo container e chame ``execute(data)`` com ``GetNewsInput``. O retorno é
    ``NewsDTO``.
    """

    def execute(self, data: GetNewsInput) -> NewsDTO:
        item = News.objects.filter(slug=data.slug, is_published=True).first()
        if item is None:
            raise EntityNotFoundError("Notícia não encontrada.")
        return NewsDTO(
            id=item.id,
            slug=item.slug,
            title=item.title,
            excerpt=item.excerpt,
            body=item.body,
            published_at=item.published_at.isoformat(),
        )


class ListFaqUseCase(UseCase[None, list[dict]]):
    """Lista perguntas e respostas marcadas como publicadas.

    Uso: resolva pelo container e chame ``execute(data)`` com ``None`` (ou omita o argumento). O
    retorno é ``list[dict]``.
    """

    def execute(self, data: None = None) -> list[dict]:
        return [
            {"id": str(item.id), "question": item.question, "answer": item.answer}
            for item in Faq.objects.filter(is_published=True)
        ]


class ListDownloadsUseCase(UseCase[None, list[dict]]):
    """Lista links de download publicados com título, categoria e URL.

    Uso: resolva pelo container e chame ``execute(data)`` com ``None`` (ou omita o argumento). O
    retorno é ``list[dict]``.
    """

    def execute(self, data: None = None) -> list[dict]:
        return [
            {"id": str(item.id), "title": item.title, "url": item.url, "category": item.category}
            for item in DownloadLink.objects.filter(is_published=True)
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


class ListWikiPagesUseCase(UseCase[None, list[WikiPageDTO]]):
    """Lista os metadados das páginas publicadas da wiki, deixando o corpo vazio na listagem.

    Uso: resolva pelo container e chame ``execute(data)`` com ``None`` (ou omita o argumento). O
    retorno é ``list[WikiPageDTO]``.
    """

    def execute(self, data: None = None) -> list[WikiPageDTO]:
        return [
            WikiPageDTO(
                id=item.id,
                slug=item.slug,
                title=item.title,
                summary=item.summary,
                body="",
                category=item.category,
                icon=item.icon,
                is_menu_item=item.is_menu_item,
            )
            for item in WikiPage.objects.filter(is_published=True)
        ]


@dataclass(frozen=True, slots=True)
class GetWikiPageInput:
    """Dados de entrada de ``GetWikiPageUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria.
    """

    slug: str


class GetWikiPageUseCase(UseCase[GetWikiPageInput, WikiPageDTO]):
    """Obtém o conteúdo completo de uma página publicada pelo slug.

    Uso: resolva pelo container e chame ``execute(data)`` com ``GetWikiPageInput``. O retorno é
    ``WikiPageDTO``.
    """

    def execute(self, data: GetWikiPageInput) -> WikiPageDTO:
        item = WikiPage.objects.filter(slug=data.slug, is_published=True).first()
        if item is None:
            raise EntityNotFoundError("Página do wiki não encontrada.")
        return WikiPageDTO(
            id=item.id,
            slug=item.slug,
            title=item.title,
            summary=item.summary,
            body=item.body,
            category=item.category,
            icon=item.icon,
            is_menu_item=item.is_menu_item,
        )


@dataclass(frozen=True, slots=True)
class SearchWikiInput:
    """Dados de entrada de ``SearchWikiUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria.
    """

    query: str


class SearchWikiUseCase(UseCase[SearchWikiInput, list[WikiPageDTO]]):
    """Pesquisa páginas publicadas e retorna até 30 resultados sem o corpo completo.

    Uso: resolva pelo container e chame ``execute(data)`` com ``SearchWikiInput``. O retorno é
    ``list[WikiPageDTO]``.
    """

    def execute(self, data: SearchWikiInput) -> list[WikiPageDTO]:
        query = data.query.strip()
        if len(query) < 2:
            return []
        rows = WikiPage.objects.filter(is_published=True).filter(
            Q(title__icontains=query) | Q(summary__icontains=query) | Q(body__icontains=query)
        )
        return [
            WikiPageDTO(
                id=item.id,
                slug=item.slug,
                title=item.title,
                summary=item.summary,
                body="",
                category=item.category,
                icon=item.icon,
                is_menu_item=item.is_menu_item,
            )
            for item in rows[:30]
        ]


class ListCalendarEventsUseCase(UseCase[None, list[dict]]):
    """Lista eventos publicados com datas de início e fim em formato ISO.

    Uso: resolva pelo container e chame ``execute(data)`` com ``None`` (ou omita o argumento). O
    retorno é ``list[dict]``.
    """

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
            for item in CalendarEvent.objects.filter(is_published=True)
        ]
