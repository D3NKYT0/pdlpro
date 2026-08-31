from __future__ import annotations

import json
import logging
import re
from uuid import uuid4

from django.core.serializers.json import DjangoJSONEncoder

from common.di.bootstrap import DependencyInjection
from common.error_contract import build_error_payload

logger = logging.getLogger(__name__)

_SAFE_REQUEST_ID = re.compile(r"^[A-Za-z0-9._:-]{1,128}$")


class RequestIdMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        incoming = request.headers.get("X-Request-ID", "").strip()
        request.request_id = (
            incoming if _SAFE_REQUEST_ID.fullmatch(incoming) else uuid4().hex
        )
        response = self.get_response(request)
        response["X-Request-ID"] = request.request_id
        return response


class DependencyInjectionMiddleware:
    """Abre um container SCOPED por request para resolver use cases."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.container = DependencyInjection.root().create_scope()
        try:
            return self.get_response(request)
        finally:
            request.container = None


class ApiErrorContractMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if response.status_code < 400 or not request.path_info.startswith("/api/"):
            return response
        if getattr(response, "streaming", False):
            return response
        try:
            data = self._response_data(response)
            payload = build_error_payload(
                data,
                status_code=response.status_code,
                request_id=getattr(request, "request_id", None),
            )
            response.data = payload
            response.content = json.dumps(
                payload,
                cls=DjangoJSONEncoder,
                ensure_ascii=False,
                separators=(",", ":"),
            ).encode("utf-8")
            response["Content-Type"] = "application/json; charset=utf-8"
            if response.has_header("Content-Length"):
                del response["Content-Length"]
        except Exception:
            logger.exception(
                "Falha ao aplicar contrato de erro request_id=%s path=%s",
                getattr(request, "request_id", ""),
                request.path_info,
            )
        return response

    @staticmethod
    def _response_data(response):
        data = getattr(response, "data", None)
        if data is not None:
            return data
        content_type = response.get("Content-Type", "")
        if "application/json" not in content_type:
            return None
        try:
            return json.loads(response.content.decode("utf-8") or "null")
        except (ValueError, UnicodeDecodeError):
            return None
