"""Argumentos SSLAlchemy/PyMySQL para o banco Lineage 2."""

from __future__ import annotations

import ssl
from typing import Any


def build_lineage_connect_args(
    *,
    ssl_enabled: bool,
    verify: bool = True,
    ca: str = "",
    cert: str = "",
    key: str = "",
) -> dict[str, Any]:
    """Monta ``connect_args`` do SQLAlchemy para TLS opcional no MySQL do jogo.

    ``ssl_enabled=False`` preserva o comportamento atual (sem TLS). Com TLS ligado,
    ``verify=True`` usa o CA informado ou o estoque do sistema; ``verify=False``
    cifra o canal sem validar o certificado (aceitável só em rede isolada).
    """

    if not ssl_enabled:
        return {}
    ssl_ctx: dict[str, Any] = {}
    if ca:
        ssl_ctx["ca"] = ca
    if cert:
        ssl_ctx["cert"] = cert
    if key:
        ssl_ctx["key"] = key
    if verify:
        ssl_ctx["check_hostname"] = True
        ssl_ctx["verify_mode"] = ssl.CERT_REQUIRED
    else:
        ssl_ctx["check_hostname"] = False
        ssl_ctx["verify_mode"] = ssl.CERT_NONE
    return {"ssl": ssl_ctx}


def lineage_connect_args_from_settings(django_settings) -> dict[str, Any]:
    """Lê ``LINEAGE_DB_SSL*`` dos settings Django."""

    return build_lineage_connect_args(
        ssl_enabled=bool(getattr(django_settings, "LINEAGE_DB_SSL", False)),
        verify=bool(getattr(django_settings, "LINEAGE_DB_SSL_VERIFY", True)),
        ca=str(getattr(django_settings, "LINEAGE_DB_SSL_CA", "") or ""),
        cert=str(getattr(django_settings, "LINEAGE_DB_SSL_CERT", "") or ""),
        key=str(getattr(django_settings, "LINEAGE_DB_SSL_KEY", "") or ""),
    )
