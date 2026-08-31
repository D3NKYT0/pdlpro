from apps.social.application.use_cases import CreatePostUseCase, ListPublicPostsUseCase
from apps.social.domain.repositories import IPostRepository
from apps.social.infrastructure.repositories import DjangoPostRepository
from common.di.container import Container
from common.di.lifetime import Lifetime
from common.di.provider import AppProvider


class SocialProvider(AppProvider):
    def register(self, container: Container) -> None:
        container.register(IPostRepository, DjangoPostRepository, lifetime=Lifetime.SCOPED)
        container.register_self(ListPublicPostsUseCase, lifetime=Lifetime.TRANSIENT)
        container.register_self(CreatePostUseCase, lifetime=Lifetime.TRANSIENT)
