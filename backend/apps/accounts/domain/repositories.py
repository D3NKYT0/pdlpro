from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any
from uuid import UUID

from apps.accounts.domain.entities import UserEntity


@dataclass(frozen=True, slots=True)
class TotpState:
    """Estado TOTP necessário aos casos de uso de segundo fator, sem expor o ORM."""

    user_id: UUID
    username: str
    is_2fa_enabled: bool
    totp_secret: str
    is_active: bool


@dataclass(frozen=True, slots=True)
class SessionRecord:
    """Sessão de refresh ativa serializável para a API de sessões."""

    id: str
    created_at: datetime | None
    expires_at: datetime
    current: bool


@dataclass(frozen=True, slots=True)
class WebAuthnCredentialRecord:
    """Metadados públicos de uma credencial passkey."""

    id: UUID
    user_id: UUID
    credential_id: bytes
    public_key: bytes
    sign_count: int
    transports: list
    aaguid: str
    nickname: str
    created_at: datetime | None
    last_used_at: datetime | None


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
    def has_usable_password(self, user_id: UUID) -> bool:
        raise NotImplementedError

    @abstractmethod
    def update_username(self, user_id: UUID, username: str) -> UserEntity:
        raise NotImplementedError

    @abstractmethod
    def accept_terms(self, user_id: UUID, version: str) -> UserEntity:
        raise NotImplementedError

    @abstractmethod
    def get_totp_state(self, user_id: UUID) -> TotpState | None:
        raise NotImplementedError

    @abstractmethod
    def set_totp_secret(self, user_id: UUID, secret: str) -> None:
        raise NotImplementedError

    @abstractmethod
    def enable_2fa(self, user_id: UUID) -> None:
        raise NotImplementedError

    @abstractmethod
    def disable_2fa(self, user_id: UUID) -> None:
        raise NotImplementedError

    @abstractmethod
    def make_password_reset_token(self, user_id: UUID) -> str | None:
        """Devolve ``uid:token`` para o link de redefinição, ou None se o usuário não existir."""

        raise NotImplementedError

    @abstractmethod
    def consume_password_reset_token(self, raw_token: str, password: str) -> bool:
        """Valida o token sob bloqueio, grava a senha e indica se o consumo foi aceito."""

        raise NotImplementedError


class ISessionStore(ABC):
    """Porta de rotação, listagem e revogação de refresh tokens JWT."""

    @abstractmethod
    def rotate_refresh(self, raw: str) -> Any:
        """Consome um refresh válido e devolve o sucessor (objeto SimpleJWT RefreshToken)."""

        raise NotImplementedError

    @abstractmethod
    def revoke_refresh(self, raw: str, user_id: UUID) -> None:
        raise NotImplementedError

    @abstractmethod
    def list_sessions(self, user_id: UUID, *, current_jti: str | None = None) -> list[SessionRecord]:
        raise NotImplementedError

    @abstractmethod
    def revoke_session(self, user_id: UUID, jti: str, *, current_jti: str | None = None) -> bool:
        """Revoga a sessão; devolve se a sessão corrente foi encerrada."""

        raise NotImplementedError

    @abstractmethod
    def revoke_other_sessions(self, user_id: UUID, *, current_jti: str) -> int:
        raise NotImplementedError


class IWebAuthnCredentialRepository(ABC):
    """Porta de persistência das credenciais passkey/WebAuthn."""

    @abstractmethod
    def list_for_user(self, user_id: UUID) -> list[WebAuthnCredentialRecord]:
        raise NotImplementedError

    @abstractmethod
    def list_raw_for_user(self, user_id: UUID) -> list[Any]:
        """Linhas ORM/adaptador usadas na montagem de descriptors WebAuthn."""

        raise NotImplementedError

    @abstractmethod
    def create(
        self,
        user_id: UUID,
        *,
        credential_id: bytes,
        public_key: bytes,
        sign_count: int,
        transports: list,
        aaguid: str,
        nickname: str,
    ) -> WebAuthnCredentialRecord:
        raise NotImplementedError

    @abstractmethod
    def find_by_credential_id(self, credential_id: bytes) -> tuple[WebAuthnCredentialRecord, Any] | None:
        """Credencial e usuário ORM ativo associado, ou None."""

        raise NotImplementedError

    @abstractmethod
    def mark_used(self, credential_pk: UUID, *, sign_count: int, last_used_at: datetime) -> None:
        raise NotImplementedError

    @abstractmethod
    def delete_for_user(self, credential_id: UUID, user_id: UUID) -> bool:
        raise NotImplementedError

    @abstractmethod
    def find_active_user_by_login(self, login: str) -> Any | None:
        """Usuário ORM ativo para montar allowCredentials no login por passkey."""

        raise NotImplementedError
