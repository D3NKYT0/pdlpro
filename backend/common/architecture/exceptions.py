from __future__ import annotations

from typing import Any


class DomainError(Exception):
    """Erro de regra de negócio. A camada de apresentação mapeia para o contrato HTTP."""

    error_code: str = "DOMAIN_ERROR"
    status_code: int = 400
    message: str = "Não foi possível processar a solicitação."

    def __init__(
        self,
        message: str | None = None,
        *,
        error_code: str | None = None,
        details: dict[str, Any] | None = None,
        status_code: int | None = None,
    ) -> None:
        self.message = message or self.message
        if error_code:
            self.error_code = error_code
        if status_code is not None:
            self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class EntityNotFoundError(DomainError):
    error_code = "RESOURCE_NOT_FOUND"
    status_code = 404
    message = "O recurso solicitado não foi encontrado."


class ConflictError(DomainError):
    error_code = "CONFLICT"
    status_code = 409
    message = "A solicitação conflita com o estado atual do recurso."


class AuthorizationError(DomainError):
    error_code = "PERMISSION_DENIED"
    status_code = 403
    message = "Você não tem permissão para realizar esta ação."


class ValidationDomainError(DomainError):
    error_code = "VALIDATION_ERROR"
    status_code = 400
    message = "Verifique os dados informados e tente novamente."
