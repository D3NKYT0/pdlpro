from __future__ import annotations

from uuid import UUID

from apps.social.domain.entities import PostEntity
from apps.social.domain.repositories import IPostRepository
from apps.social.infrastructure.models import Post


class DjangoPostRepository(IPostRepository):
    def _entity(self, row: Post) -> PostEntity:
        return PostEntity(
            id=row.id,
            author_id=row.author.id,
            author_username=row.author.username,
            body=row.body,
            created_at=row.created_at.isoformat(),
        )

    def list_published(self, *, limit: int = 50) -> list[PostEntity]:
        rows = Post.objects.select_related("author").filter(is_published=True).order_by("-created_at")[:limit]
        return [self._entity(row) for row in rows]

    def create(self, *, author_id: UUID, body: str) -> PostEntity:
        from django.contrib.auth import get_user_model

        author = get_user_model().objects.get(id=author_id)
        row = Post.objects.create(author=author, body=body)
        return self._entity(row)
