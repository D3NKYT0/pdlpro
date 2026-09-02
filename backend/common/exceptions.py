from __future__ import annotations

import logging
from collections.abc import Mapping, Sequence
from typing import Any

from rest_framework.exceptions import APIException, ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler

from common.architecture.exceptions import DomainError

from .error_contract import (
    build_error_payload,
    extract_error_code,
    normalize_error_code,
    status_error_code,
)

logger = logging.getLogger(__name__)


def custom_exception_handler(exc: Exception, context: dict[str, Any]) -> Response:
    """Converte DomainError e exceções DRF para o envelope de erro do painel.

    Configure em REST_FRAMEWORK['EXCEPTION_HANDLER']. Exceções não tratadas são registradas com
    request_id e produzem uma resposta 500 genérica; erros previstos preservam código, mensagem
    e detalhes públicos.
    """

    if isinstance(exc, DomainError):
        exc = PdlAPIException(
            exc.message,
            error_code=exc.error_code,
            details=exc.details,
            status_code=exc.status_code,
        )

    response = exception_handler(exc, context)

    if response is None:
        request = context.get("request") if isinstance(context, dict) else None
        logger.exception(
            "Unhandled API exception request_id=%s path=%s",
            getattr(request, "request_id", ""),
            getattr(request, "path", ""),
        )
        response = Response(status=500)

    data = response.data
    specific_code = extract_error_code(data) or _get_exception_code(
        exc, response.status_code
    )
    details = getattr(exc, "details", None)
    if details is not None and isinstance(data, Mapping):
        data = {**data, "details": details}

    request = context.get("request") if isinstance(context, dict) else None
    response.data = build_error_payload(
        data,
        status_code=response.status_code,
        request_id=getattr(request, "request_id", None),
        error_code=specific_code,
    )
    return response


def _first_scalar_code(value: Any) -> str | None:
    if isinstance(value, str):
        return value
    if isinstance(value, Mapping):
        if "detail" in value:
            return _first_scalar_code(value["detail"])
        return None
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
        return _first_scalar_code(value[0]) if value else None
    return None


def _get_exception_code(exc: Exception, status_code: int) -> str:
    if isinstance(exc, ValidationError):
        return "VALIDATION_ERROR"
    explicit_code = getattr(exc, "error_code", None)
    if explicit_code:
        return normalize_error_code(explicit_code)
    if hasattr(exc, "get_codes"):
        if code := _first_scalar_code(exc.get_codes()):
            return normalize_error_code(code)
    default_code = getattr(exc, "default_code", None)
    if default_code:
        return normalize_error_code(default_code)
    return status_error_code(status_code)


class PdlAPIException(APIException):
    """Exceção DRF com código estável, mensagem pública e detalhes estruturados.

    Use na apresentação quando precisar personalizar status e ``error_code``. O código é
    normalizado e o exception handler monta o envelope com request_id. Na aplicação e no
    domínio, prefira ``DomainError`` e suas subclasses.
    """

    status_code = 400
    default_detail = "Não foi possível processar a solicitação."
    default_code = "API_ERROR"

    def __init__(
        self,
        message: str | None = None,
        *,
        error_code: str | None = None,
        details: Mapping[str, Any] | None = None,
        status_code: int | None = None,
    ) -> None:
        if status_code is not None:
            self.status_code = status_code
        self.error_code = normalize_error_code(error_code or self.default_code)
        self.details = dict(details or {})
        super().__init__(detail=message or self.default_detail, code=self.error_code)
