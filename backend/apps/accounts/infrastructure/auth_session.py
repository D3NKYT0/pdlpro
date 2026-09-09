"""Serviço fino de sessão auth: ORM só na infraestrutura para cookies JWT."""

from __future__ import annotations

from uuid import UUID

from rest_framework.response import Response

from apps.accounts.domain.repositories import IUserRepository
from apps.accounts.infrastructure.authentication import build_auth_response


class AuthSessionService:
    """Carrega o usuário ORM exigido por ``RefreshToken.for_user`` e monta a resposta.

    Views de presentation resolvem este serviço em vez de chamar ``get_user_model().objects``.
    """

    def __init__(self, users: IUserRepository) -> None:
        self._users = users

    def require_user(self, user_id: UUID):
        return self._users.require_orm_user(user_id)

    def build_auth_response(self, request, user_id: UUID) -> Response:
        return build_auth_response(request, self.require_user(user_id))
