from __future__ import annotations

from typing import Any, cast

from django.http import HttpResponse
from rest_framework.authentication import CSRFCheck


def csrf_failed_reason(request) -> str | None:
    """Devolve o motivo da falha CSRF, ou None se a checagem passar."""

    def _noop(_request: Any) -> HttpResponse:
        return HttpResponse()

    check = CSRFCheck(_noop)
    check.process_request(request)
    result = check.process_view(request, cast(Any, None), (), {})
    if result is None:
        return None
    return str(getattr(result, "reason", result))
