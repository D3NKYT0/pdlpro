from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from apps.social.domain.entities import PostEntity
from apps.social.domain.repositories import IPostRepository
from common.architecture.base import UseCase
from common.architecture.exceptions import ValidationDomainError


class ListPublicPostsUseCase(UseCase[None, list[PostEntity]]):
    def __init__(self, posts: IPostRepository) -> None:
        self._posts = posts

    def execute(self, data: None = None) -> list[PostEntity]:
        return self._posts.list_published()


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
        return self._posts.create(author_id=data.author_id, body=body)
