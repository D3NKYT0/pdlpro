from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from apps.accounts.application.progress import add_xp
from apps.social.domain.entities import PostEntity
from apps.social.domain.repositories import IPostRepository
from common.architecture.base import UseCase
from common.architecture.exceptions import ValidationDomainError


class ListPublicPostsUseCase(UseCase[UUID | None, list[PostEntity]]):
    def __init__(self, posts: IPostRepository) -> None:
        self._posts = posts

    def execute(self, data: UUID | None = None) -> list[PostEntity]:
        return self._posts.list_published(viewer_id=data)


@dataclass(frozen=True, slots=True)
class CreatePostInput:
    author_id: UUID
    body: str


class CreatePostUseCase(UseCase[CreatePostInput, PostEntity]):
    def __init__(self, posts: IPostRepository) -> None:
        self._posts = posts

    def execute(self, data: CreatePostInput) -> PostEntity:
        body = data.body.strip()
        if len(body) < 1:
            raise ValidationDomainError("Escreva algo para publicar.")
        if len(body) > 2000:
            raise ValidationDomainError("O post pode ter no máximo 2000 caracteres.")
        post = self._posts.create(author_id=data.author_id, body=body)
        from django.contrib.auth import get_user_model

        add_xp(get_user_model().objects.get(id=data.author_id), 10)
        return post
