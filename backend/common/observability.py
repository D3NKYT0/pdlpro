from __future__ import annotations

import json
import logging
from contextvars import ContextVar, Token
from datetime import UTC, datetime
from typing import Any


request_id_context: ContextVar[str] = ContextVar("request_id", default="")

_STANDARD_LOG_RECORD_FIELDS = frozenset(
    logging.LogRecord("", 0, "", 0, "", (), None).__dict__
)
_SENSITIVE_KEYS = frozenset(
    {
        "authorization",
        "client_secret",
        "cookie",
        "password",
        "password1",
        "password2",
        "refresh",
        "secret",
        "set_cookie",
        "token",
    }
)


def bind_request_id(request_id: str) -> Token:
    """Bind a correlation identifier to the current synchronous or async context."""

    return request_id_context.set(request_id)


def reset_request_id(token: Token) -> None:
    """Restore the correlation context that preceded ``bind_request_id``."""

    request_id_context.reset(token)


def _is_sensitive(key: str) -> bool:
    normalized = key.lower().replace("-", "_")
    return any(part in normalized for part in _SENSITIVE_KEYS)


def redact(value: Any, *, key: str = "") -> Any:
    """Return a JSON-safe copy with credentials and oversized values removed."""

    if key and _is_sensitive(key):
        return "[REDACTED]"
    if isinstance(value, dict):
        return {str(item_key): redact(item_value, key=str(item_key)) for item_key, item_value in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [redact(item) for item in value]
    if isinstance(value, (str, int, float, bool)) or value is None:
        if isinstance(value, str) and len(value) > 2048:
            return f"{value[:2048]}...[TRUNCATED]"
        return value
    return str(value)


class RequestContextFilter(logging.Filter):
    """Attach the current request identifier without requiring every caller to pass it."""

    def filter(self, record: logging.LogRecord) -> bool:
        if not getattr(record, "request_id", None):
            record.request_id = request_id_context.get()
        return True


class JsonFormatter(logging.Formatter):
    """Emit one machine-readable JSON object per log record."""

    def __init__(self, *, service="pdl-backend", environment="development"):
        super().__init__()
        self.service = service
        self.environment = environment

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, tz=UTC).isoformat(timespec="milliseconds"),
            "level": record.levelname,
            "service": self.service,
            "environment": self.environment,
            "logger": record.name,
            "message": record.getMessage(),
            "source": {"module": record.module, "function": record.funcName, "line": record.lineno},
        }
        request_id = getattr(record, "request_id", "")
        if request_id:
            payload["request_id"] = request_id

        for key, value in record.__dict__.items():
            if key in _STANDARD_LOG_RECORD_FIELDS or key in {"message", "asctime", "request_id"} or key.startswith("_"):
                continue
            payload[key] = redact(value, key=key)

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False, separators=(",", ":"), default=str)
