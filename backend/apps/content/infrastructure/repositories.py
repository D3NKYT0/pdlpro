from __future__ import annotations

from uuid import UUID

from apps.content.domain.repositories import INewsAdminRepository
from apps.content.infrastructure.models import News


class DjangoNewsAdminRepository(INewsAdminRepository):
    """Adaptador Django de ``INewsAdminRepository`` para notícias do painel."""

    def list_all(self) -> list[News]:
        return list(News.objects.all().order_by("-published_at", "-created_at"))

    def get_by_id(self, news_id: UUID) -> News | None:
        return News.objects.filter(id=news_id).first()

    def slug_exists(self, slug: str, *, exclude_id: UUID | None = None) -> bool:
        qs = News.objects.filter(slug=slug)
        if exclude_id is not None:
            qs = qs.exclude(id=exclude_id)
        return qs.exists()

    def new(self, **fields) -> News:
        return News(**fields)

    def save(self, row: News) -> News:
        row.save()
        return row
