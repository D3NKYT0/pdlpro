from __future__ import annotations

from typing import Any


class DomainError(Exception):
    """Erro de negócio transportável sem importar Django ou DRF.

    Defina ``message``, ``error_code`` e ``status_code`` na subclasse ou passe sobrescritas no
    construtor. ``details`` carrega informações estruturadas para o cliente. O exception handler
    converte o erro para o contrato HTTP; use detalhes públicos, pois eles podem aparecer na
    resposta da API.
    """

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
    """Falha de domínio: O recurso solicitado não foi encontrado.

    A apresentação expõe o código ``RESOURCE_NOT_FOUND`` com status HTTP 404. Lance esta exceção
    quando a condição ocorrer na regra de negócio.
    """

    error_code = "RESOURCE_NOT_FOUND"
    status_code = 404
    message = "O recurso solicitado não foi encontrado."


class ConflictError(DomainError):
    """Falha de domínio: A solicitação conflita com o estado atual do recurso.

    A apresentação expõe o código ``CONFLICT`` com status HTTP 409. Lance esta exceção quando a
    condição ocorrer na regra de negócio.
    """

    error_code = "CONFLICT"
    status_code = 409
    message = "A solicitação conflita com o estado atual do recurso."


class AuthorizationError(DomainError):
    """Falha de domínio: Você não tem permissão para realizar esta ação.

    A apresentação expõe o código ``PERMISSION_DENIED`` com status HTTP 403. Lance esta exceção
    quando a condição ocorrer na regra de negócio.
    """

    error_code = "PERMISSION_DENIED"
    status_code = 403
    message = "Você não tem permissão para realizar esta ação."


class ValidationDomainError(DomainError):
    """Falha de domínio: Verifique os dados informados e tente novamente.

    A apresentação expõe o código ``VALIDATION_ERROR`` com status HTTP 400. Lance esta exceção
    quando a condição ocorrer na regra de negócio.
    """

    error_code = "VALIDATION_ERROR"
    status_code = 400
    message = "Verifique os dados informados e tente novamente."
