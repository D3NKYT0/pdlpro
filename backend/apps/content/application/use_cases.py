from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from apps.content.infrastructure.models import DownloadLink, Faq, News
from common.architecture.base import UseCase
from common.architecture.exceptions import EntityNotFoundError


@dataclass(frozen=True, slots=True)
class NewsDTO:
    id: UUID
    slug: str
    title: str
    excerpt: str
    body: str
    published_at: str


class ListNewsUseCase(UseCase[None, list[NewsDTO]]):
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
    slug: str


class GetNewsUseCase(UseCase[GetNewsInput, NewsDTO]):
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
    def execute(self, data: None = None) -> list[dict]:
        return [
            {"id": str(item.id), "question": item.question, "answer": item.answer}
            for item in Faq.objects.filter(is_published=True)
        ]


class ListDownloadsUseCase(UseCase[None, list[dict]]):
    def execute(self, data: None = None) -> list[dict]:
        return [
            {"id": str(item.id), "title": item.title, "url": item.url, "category": item.category}
            for item in DownloadLink.objects.filter(is_published=True)
        ]
