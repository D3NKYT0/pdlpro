from __future__ import annotations

from uuid import UUID

from django.contrib.auth import get_user_model

from apps.accounts.domain.entities import UserEntity
from apps.accounts.domain.repositories import IUserRepository

User = get_user_model()


class DjangoUserRepository(IUserRepository):
    """Adaptador Django de ``IUserRepository`` para consulta, criação, credenciais e atualização de
    usuários do painel.

    Concentra consultas e escritas ORM da porta. Prefira resolver a interface pelo container; ao
    combinar alterações em uma operação de negócio, o chamador deve delimitar a transação com
    UnitOfWork.
    """

    def _to_entity(self, user) -> UserEntity:
        avatar_url = user.avatar.url if user.avatar else None
        return UserEntity(
            id=user.id,
            username=user.username,
            email=user.email,
            display_name=user.display_name or user.username,
            bio=user.bio,
            role=user.role,
            is_email_verified=user.is_email_verified,
            fichas=user.fichas,
            avatar_url=avatar_url,
            is_2fa_enabled=user.is_2fa_enabled,
            is_staff=bool(user.is_staff),
            is_superuser=bool(user.is_superuser),
            is_staff_member=bool(user.is_staff_member),
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

    def update_profile(
        self,
        user_id: UUID,
        *,
        display_name: str | None,
        bio: str | None,
        avatar: object | None = None,
    ) -> UserEntity:
        user = User.objects.get(id=user_id)
        update_fields = ["updated_at"]
        if display_name is not None:
            user.display_name = display_name
            update_fields.append("display_name")
        if bio is not None:
            user.bio = bio
            update_fields.append("bio")
        if avatar is not None:
            user.avatar = avatar
            update_fields.append("avatar")
        user.save(update_fields=update_fields)
        return self._to_entity(user)

    def mark_email_verified(self, user_id: UUID) -> UserEntity:
        user = User.objects.get(id=user_id)
        user.is_email_verified = True
        user.save(update_fields=["is_email_verified", "updated_at"])
        return self._to_entity(user)

    def set_password(self, user_id: UUID, password: str) -> None:
        user = User.objects.get(id=user_id)
        user.set_password(password)
        user.save(update_fields=["password", "updated_at"])

    def accept_terms(self, user_id: UUID, version: str) -> UserEntity:
        from django.utils import timezone

        user = User.objects.get(id=user_id)
        user.terms_accepted_at = timezone.now()
        user.terms_and_privacy_version = version
        user.save(update_fields=["terms_accepted_at", "terms_and_privacy_version", "updated_at"])
        return self._to_entity(user)
