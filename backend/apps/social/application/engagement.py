from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from django.db.models import F

from apps.social.infrastructure.models import Comment, Post, PostLike
from common.architecture.base import UseCase
from common.architecture.exceptions import AuthorizationError, EntityNotFoundError, ValidationDomainError


@dataclass(frozen=True, slots=True)
class TogglePostLikeInput:
    user_id: UUID
    post_id: UUID


class TogglePostLikeUseCase(UseCase[TogglePostLikeInput, dict]):
    def execute(self, data: TogglePostLikeInput) -> dict:
        from django.contrib.auth import get_user_model

        post = Post.objects.filter(id=data.post_id, is_published=True).first()
        if post is None:
            raise EntityNotFoundError("Publicação não encontrada.")
        user = get_user_model().objects.get(id=data.user_id)
        like = PostLike.objects.filter(post=post, user=user).first()
        if like:
            like.delete()
            Post.objects.filter(pk=post.pk, likes_count__gt=0).update(likes_count=F("likes_count") - 1)
            liked = False
        else:
            PostLike.objects.create(post=post, user=user)
            Post.objects.filter(pk=post.pk).update(likes_count=F("likes_count") + 1)
            liked = True
        post.refresh_from_db()
        return {"liked": liked, "likes_count": post.likes_count}


@dataclass(frozen=True, slots=True)
class ListCommentsInput:
    post_id: UUID


class ListCommentsUseCase(UseCase[ListCommentsInput, list[dict]]):
    def execute(self, data: ListCommentsInput) -> list[dict]:
        post = Post.objects.filter(id=data.post_id).first()
        if post is None:
            raise EntityNotFoundError("Publicação não encontrada.")
        return [
            {
                "id": str(row.id),
                "author_username": row.author.username,
                "author_id": str(row.author.id),
                "body": row.body,
                "created_at": row.created_at.isoformat(),
            }
            for row in post.comments.select_related("author")
        ]


@dataclass(frozen=True, slots=True)
class CreateCommentInput:
    user_id: UUID
    post_id: UUID
    body: str


class CreateCommentUseCase(UseCase[CreateCommentInput, dict]):
    def execute(self, data: CreateCommentInput) -> dict:
        from django.contrib.auth import get_user_model

        body = data.body.strip()
        if not body:
            raise ValidationDomainError("Escreva um comentário.")
        post = Post.objects.filter(id=data.post_id, is_published=True).first()
        if post is None:
            raise EntityNotFoundError("Publicação não encontrada.")
        user = get_user_model().objects.get(id=data.user_id)
        row = Comment.objects.create(post=post, author=user, body=body[:500])
        Post.objects.filter(pk=post.pk).update(comments_count=F("comments_count") + 1)
        return {
            "id": str(row.id),
            "author_username": user.username,
            "author_id": str(user.id),
            "body": row.body,
            "created_at": row.created_at.isoformat(),
        }


@dataclass(frozen=True, slots=True)
class DeleteCommentInput:
    user_id: UUID
    comment_id: UUID


class DeleteCommentUseCase(UseCase[DeleteCommentInput, dict]):
    def execute(self, data: DeleteCommentInput) -> dict:
        row = Comment.objects.select_related("post", "post__author", "author").filter(id=data.comment_id).first()
        if row is None:
            raise EntityNotFoundError("Comentário não encontrado.")
        if row.author.id != data.user_id and row.post.author.id != data.user_id:
            raise AuthorizationError()
        post = row.post
        row.delete()
        Post.objects.filter(pk=post.pk, comments_count__gt=0).update(comments_count=F("comments_count") - 1)
        return {"deleted": True}
