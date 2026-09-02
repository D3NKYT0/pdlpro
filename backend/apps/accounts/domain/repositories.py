from __future__ import annotations

from abc import ABC, abstractmethod
from uuid import UUID

from apps.accounts.domain.entities import UserEntity


class IUserRepository(ABC):
    """Porta de consulta, criação, credenciais e atualização de usuários do painel.

    Injete esta interface nos serviços de aplicação e registre o adaptador no provider. As
    assinaturas abaixo definem entradas e retornos; resultados opcionais usam None para
    ausência. Validação de negócio e autorização devem ocorrer no caso de uso que chama a porta.
    """

    @abstractmethod
    def get_by_id(self, user_id: UUID) -> UserEntity | None:
        raise NotImplementedError

    @abstractmethod
    def get_by_username(self, username: str) -> UserEntity | None:
        raise NotImplementedError

    @abstractmethod
    def get_by_email(self, email: str) -> UserEntity | None:
        raise NotImplementedError

    @abstractmethod
    def get_by_login(self, login: str) -> UserEntity | None:
        raise NotImplementedError

    @abstractmethod
    def exists_username(self, username: str) -> bool:
        raise NotImplementedError

    @abstractmethod
    def exists_email(self, email: str) -> bool:
        raise NotImplementedError

    @abstractmethod
    def create(self, *, username: str, email: str, password: str, display_name: str = "") -> UserEntity:
        raise NotImplementedError

    @abstractmethod
    def check_password(self, user_id: UUID, password: str) -> bool:
        raise NotImplementedError

    @abstractmethod
    def update_profile(
        self,
        user_id: UUID,
        *,
        display_name: str | None,
        bio: str | None,
        avatar: object | None = None,
    ) -> UserEntity:
        raise NotImplementedError

    @abstractmethod
    def mark_email_verified(self, user_id: UUID) -> UserEntity:
        raise NotImplementedError

    @abstractmethod
    def set_password(self, user_id: UUID, password: str) -> None:
        raise NotImplementedError

    @abstractmethod
    def accept_terms(self, user_id: UUID, version: str) -> UserEntity:
        raise NotImplementedError
