from apps.social.application.engagement import (
    CreateCommentUseCase,
    DeleteCommentUseCase,
    ListCommentsUseCase,
    TogglePostLikeUseCase,
)
from apps.social.application.use_cases import CreatePostUseCase, ListPublicPostsUseCase
from apps.social.domain.repositories import IPostRepository
from apps.social.infrastructure.repositories import DjangoPostRepository
from common.di.container import Container
from common.di.lifetime import Lifetime
from common.di.provider import AppProvider


class SocialProvider(AppProvider):
    def register(self, container: Container) -> None:
        container.register(IPostRepository, DjangoPostRepository, lifetime=Lifetime.SCOPED)
        for use_case in (
            ListPublicPostsUseCase,
            CreatePostUseCase,
            TogglePostLikeUseCase,
            ListCommentsUseCase,
            CreateCommentUseCase,
            DeleteCommentUseCase,
        ):
            container.register_self(use_case, lifetime=Lifetime.TRANSIENT)
