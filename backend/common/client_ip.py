"""Resolução segura do endereço IP do cliente considerando proxies reversos confiáveis."""

from __future__ import annotations

from ipaddress import ip_address
from typing import Any

from django.conf import settings


def extract_client_ip(request: Any) -> str | None:
    """Extrai o IP confiável do cliente considerando a cadeia de proxies reversos.

    Previne IP spoofing via cabeçalho forjado X-Forwarded-For pelo cliente: em vez de pegar
    o primeiro IP (controlado pelo atacante), lê o endereço confiável a partir da direita
    conforme TRUSTED_PROXY_COUNT (ou REST_FRAMEWORK['NUM_PROXIES']).
    """

    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        num_proxies = getattr(settings, "TRUSTED_PROXY_COUNT", 1)
        rest_framework = getattr(settings, "REST_FRAMEWORK", None)
        if isinstance(rest_framework, dict) and "NUM_PROXIES" in rest_framework:
            num_proxies = rest_framework["NUM_PROXIES"]
        parts = [part.strip() for part in forwarded.split(",") if part.strip()]
        if parts:
            idx = -min(max(int(num_proxies or 1), 1), len(parts))
            value = parts[idx]
        else:
            value = request.META.get("REMOTE_ADDR", "")
    else:
        value = request.META.get("REMOTE_ADDR", "")

    if not value:
        return None
    try:
        return str(ip_address(value.strip()))
    except ValueError:
        return None
