from __future__ import annotations

from uuid import UUID

from apps.social.domain.entities import PostEntity
from apps.social.domain.repositories import IPostRepository
from apps.social.infrastructure.models import Post, PostLike


class DjangoPostRepository(IPostRepository):
    def _entity(self, row: Post, *, liked: bool = False) -> PostEntity:
        return PostEntity(
            id=row.id,
            author_id=row.author.id,
            author_username=row.author.username,
            body=row.body,
            created_at=row.created_at.isoformat(),
            likes_count=row.likes_count,
            comments_count=row.comments_count,
            liked=liked,
        )

    def list_published(self, *, viewer_id: UUID | None = None, limit: int = 50) -> list[PostEntity]:
        rows = list(Post.objects.select_related("author").filter(is_published=True).order_by("-created_at")[:limit])
        liked_ids: set[UUID] = set()
        if viewer_id and rows:
            liked_ids = set(
                PostLike.objects.filter(user__id=viewer_id, post__in=rows).values_list("post__id", flat=True)
            )
        return [self._entity(row, liked=row.id in liked_ids) for row in rows]

    def create(self, *, author_id: UUID, body: str) -> PostEntity:
        from django.contrib.auth import get_user_model

        author = get_user_model().objects.get(id=author_id)
        row = Post.objects.create(author=author, body=body)
        return self._entity(row)
