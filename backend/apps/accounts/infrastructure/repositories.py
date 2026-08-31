from __future__ import annotations

from uuid import UUID

from django.contrib.auth import get_user_model

from apps.accounts.domain.entities import UserEntity
from apps.accounts.domain.repositories import IUserRepository

User = get_user_model()


class DjangoUserRepository(IUserRepository):
    def _to_entity(self, user) -> UserEntity:
        avatar_url = user.avatar.url if user.avatar else None
        return UserEntity(
            id=user.id,
            username=user.username,
            email=user.email,
            display_name=user.display_name or user.username,
            role=user.role,
            is_email_verified=user.is_email_verified,
            fichas=user.fichas,
            avatar_url=avatar_url,
        )

    def get_by_id(self, user_id: UUID) -> UserEntity | None:
        user = User.objects.filter(id=user_id).first()
        return self._to_entity(user) if user else None

    def get_by_username(self, username: str) -> UserEntity | None:
        user = User.objects.filter(username__iexact=username).first()
        return self._to_entity(user) if user else None

    def get_by_email(self, email: str) -> UserEntity | None:
        user = User.objects.filter(email__iexact=email).first()
        return self._to_entity(user) if user else None

    def get_by_login(self, login: str) -> UserEntity | None:
        if "@" in login:
            return self.get_by_email(login)
        return self.get_by_username(login)

    def exists_username(self, username: str) -> bool:
        return User.objects.filter(username__iexact=username).exists()

    def exists_email(self, email: str) -> bool:
        return User.objects.filter(email__iexact=email).exists()

    def create(self, *, username: str, email: str, password: str, display_name: str = "") -> UserEntity:
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            display_name=display_name,
        )
        return self._to_entity(user)

    def check_password(self, user_id: UUID, password: str) -> bool:
        user = User.objects.filter(id=user_id).first()
        return bool(user and user.check_password(password))

    def update_profile(self, user_id: UUID, *, display_name: str | None, bio: str | None) -> UserEntity:
        user = User.objects.get(id=user_id)
        if display_name is not None:
            user.display_name = display_name
        if bio is not None:
            user.bio = bio
        user.save(update_fields=["display_name", "bio", "updated_at"])
        return self._to_entity(user)
