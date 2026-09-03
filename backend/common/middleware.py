from __future__ import annotations

import json
import logging
import re
from ipaddress import ip_address
from time import perf_counter
from uuid import uuid4

from django.core.serializers.json import DjangoJSONEncoder

from common.di.bootstrap import DependencyInjection
from common.error_contract import build_error_payload
from common.observability import bind_request_id, reset_request_id

logger = logging.getLogger(__name__)

_SAFE_REQUEST_ID = re.compile(r"^[A-Za-z0-9._:-]{1,128}$")


class RequestIdMiddleware:
    """Propaga um identificador de correlação em toda requisição e resposta.

    Aceita X-Request-ID com 1 a 128 caracteres alfanuméricos ou ``._:-``; quando ausente ou
    inválido, gera um UUID hexadecimal. Disponibiliza ``request.request_id`` para logs e para o
    contrato de erro da API.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        incoming = request.headers.get("X-Request-ID", "").strip()
        request.request_id = (
            incoming if _SAFE_REQUEST_ID.fullmatch(incoming) else uuid4().hex
        )
        token = bind_request_id(request.request_id)
        try:
            response = self.get_response(request)
            response["X-Request-ID"] = request.request_id
            return response
        finally:
            reset_request_id(token)


class ObservabilityMiddleware:
    """Record structured HTTP access events and persistent staff write audits.

    Request bodies, cookies and authorization headers are intentionally excluded. Audit failures
    never replace the response that was already produced for the user.
    """

    _write_methods = frozenset({"POST", "PUT", "PATCH", "DELETE"})
    _staff_prefix = "/api/v1/staff/"

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        started_at = perf_counter()
        response = self.get_response(request)
        duration_ms = round((perf_counter() - started_at) * 1000, 2)
        status_code = response.status_code
        level = logging.WARNING if status_code >= 400 else logging.INFO
        logger.log(
            level,
            "HTTP request completed",
            extra={
                "event": "http.request",
                "http_method": request.method,
                "http_path": self._route(request),
                "http_status": status_code,
                "duration_ms": duration_ms,
                "user_id": self._user_id(request),
            },
        )
        self._audit_staff_write(request, response)
        return response

    @staticmethod
    def _user_id(request) -> str | None:
        user = getattr(request, "user", None)
        return str(user.pk) if getattr(user, "is_authenticated", False) else None

    @staticmethod
    def _route(request) -> str:
        match = getattr(request, "resolver_match", None)
        route = getattr(match, "route", "")
        return f"/{route}" if route else request.path_info

    def _audit_staff_write(self, request, response) -> None:
        if request.method not in self._write_methods or not request.path_info.startswith(self._staff_prefix):
            return
        user = getattr(request, "user", None)
        if not getattr(user, "is_authenticated", False) or not (
            getattr(user, "is_staff", False) or getattr(user, "is_staff_member", False)
        ):
            return
        try:
            from apps.staff.infrastructure.models import AuditLog

            match = getattr(request, "resolver_match", None)
            view_name = getattr(match, "view_name", "") or "staff-api"
            route_kwargs = getattr(match, "kwargs", {}) or {}
            target_id = next(
                (str(value) for key, value in route_kwargs.items() if key.endswith("_id") or key.endswith("_uuid")),
                "",
            )
            AuditLog.objects.create(
                actor=user,
                action=f"{view_name}:{request.method.lower()}"[:80],
                request_id=getattr(request, "request_id", ""),
                ip_address=self._client_ip(request),
                method=request.method,
                path=request.path_info,
                status_code=response.status_code,
                target_type=view_name,
                target_id=target_id,
                payload={"outcome": "success" if response.status_code < 400 else "failure"},
            )
        except Exception:
            logger.exception("Failed to persist staff audit event")

    @staticmethod
    def _client_ip(request) -> str | None:
        forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
        value = (forwarded.split(",", 1)[0] if forwarded else request.META.get("REMOTE_ADDR", "")).strip()
        try:
            return str(ip_address(value))
        except ValueError:
            return None


class DependencyInjectionMiddleware:
    """Abre um container filho por requisição e o expõe em request.container.

    As views resolvem serviços SCOPED nesse filho, evitando compartilhar instâncias entre
    requisições. Ao terminar, inclusive em caso de exceção, remove a referência do request; não
    chama métodos de descarte dos serviços.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.container = DependencyInjection.root().create_scope()
        try:
            return self.get_response(request)
        finally:
            request.container = None


class ApiErrorContractMiddleware:
    """Uniformiza respostas de erro das rotas /api/ em JSON.

    Aplica ``build_error_payload`` a respostas não streaming com status >= 400, inclusive erros
    produzidos fora do DRF. Preserva status e request_id; ignora respostas de sucesso e rotas
    externas à API. Deve trabalhar junto com RequestIdMiddleware e com o exception handler do
    DRF.
    """

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
