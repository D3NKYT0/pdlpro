from __future__ import annotations

import re
from collections.abc import Mapping, Sequence
from typing import Any


STATUS_ERROR_CODES = {
    400: "VALIDATION_ERROR",
    401: "AUTHENTICATION_REQUIRED",
    403: "PERMISSION_DENIED",
    404: "RESOURCE_NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    409: "CONFLICT",
    413: "PAYLOAD_TOO_LARGE",
    415: "UNSUPPORTED_MEDIA_TYPE",
    429: "RATE_LIMIT_EXCEEDED",
    500: "INTERNAL_SERVER_ERROR",
    502: "UPSTREAM_SERVICE_ERROR",
    503: "SERVICE_UNAVAILABLE",
    504: "UPSTREAM_TIMEOUT",
}

STATUS_ERROR_MESSAGES = {
    400: "Verifique os dados informados e tente novamente.",
    401: "Autenticação necessária.",
    403: "Você não tem permissão para realizar esta ação.",
    404: "O recurso solicitado não foi encontrado.",
    405: "Método não permitido.",
    409: "A solicitação conflita com o estado atual do recurso.",
    413: "O conteúdo enviado excede o tamanho permitido.",
    415: "Formato de conteúdo não suportado.",
    429: "Muitas tentativas. Aguarde um momento e tente novamente.",
    500: "Ocorreu um erro interno. Tente novamente em instantes.",
    502: "Um serviço necessário respondeu com erro.",
    503: "Serviço temporariamente indisponível.",
    504: "Um serviço necessário demorou demais para responder.",
}

ERROR_CODE_ALIASES = {
    "AUTHENTICATION_REQUIRED": "AUTHENTICATION_REQUIRED",
    "NOT_AUTHENTICATED": "AUTHENTICATION_REQUIRED",
    "AUTHENTICATION_FAILED": "AUTHENTICATION_FAILED",
    "PERMISSION_DENIED": "PERMISSION_DENIED",
    "NOT_FOUND": "RESOURCE_NOT_FOUND",
    "THROTTLED": "RATE_LIMIT_EXCEEDED",
    "PARSE_ERROR": "INVALID_PAYLOAD",
    "INVALID": "VALIDATION_ERROR",
    "REQUIRED": "VALIDATION_ERROR",
    "BLANK": "VALIDATION_ERROR",
    "NULL": "VALIDATION_ERROR",
    "INTERNAL_ERROR": "INTERNAL_SERVER_ERROR",
}

_NON_IDENTIFIER = re.compile(r"[^A-Z0-9]+")


def normalize_error_code(value: Any, *, fallback: str = "ERROR") -> str:
    raw = str(value or "").strip().upper()
    normalized = _NON_IDENTIFIER.sub("_", raw).strip("_")
    if not normalized:
        normalized = fallback
    return ERROR_CODE_ALIASES.get(normalized, normalized)


def status_error_code(status_code: int) -> str:
    return STATUS_ERROR_CODES.get(status_code, "ERROR")


def status_error_message(status_code: int) -> str:
    return STATUS_ERROR_MESSAGES.get(
        status_code, "Não foi possível processar a solicitação."
    )


def extract_error_code(data: Any) -> str | None:
    if not isinstance(data, Mapping):
        return None
    for key in ("error_code", "error", "code"):
        value = data.get(key)
        if isinstance(value, str) and value.strip():
            return normalize_error_code(value)
    return None


def _first_message(value: Any) -> str | None:
    if isinstance(value, str) and value.strip():
        return value
    if isinstance(value, Mapping):
        for key in ("message", "detail", "non_field_errors"):
            if key in value and (message := _first_message(value[key])):
                return message
        for nested in value.values():
            if message := _first_message(nested):
                return message
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
        for nested in value:
            if message := _first_message(nested):
                return message
    return None


def extract_error_message(data: Any, *, status_code: int) -> str:
    return _first_message(data) or status_error_message(status_code)


def _normalize_details(data: Any) -> dict[str, Any]:
    if isinstance(data, Mapping):
        if "details" in data:
            details = data["details"]
            if isinstance(details, Mapping):
                return dict(details)
            if isinstance(details, Sequence) and not isinstance(
                details, (str, bytes, bytearray)
            ):
                return {"errors": list(details)}
            if details is not None:
                return {"detail": details}
        return {
            str(key): value
            for key, value in data.items()
            if key not in {"error_code", "error", "message", "request_id"}
        }
    if isinstance(data, Sequence) and not isinstance(data, (str, bytes, bytearray)):
        return {"errors": list(data)}
    if data is not None:
        return {"detail": data}
    return {}


def build_error_payload(
    data: Any,
    *,
    status_code: int,
    request_id: str | None = None,
    error_code: str | None = None,
    message: str | None = None,
) -> dict[str, Any]:
    resolved_code = normalize_error_code(
        error_code or extract_error_code(data) or status_error_code(status_code)
    )
    resolved_message = message or extract_error_message(data, status_code=status_code)
    payload: dict[str, Any] = {
        "error_code": resolved_code,
        "message": resolved_message,
        "details": _normalize_details(data),
    }
    if request_id:
        payload["request_id"] = request_id
    payload["error"] = resolved_code.lower()
    return payload
