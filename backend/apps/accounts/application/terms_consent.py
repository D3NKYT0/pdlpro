"""Helpers de aceite e versão dos documentos legais."""

from __future__ import annotations

from datetime import datetime
from ipaddress import ip_address

from django.conf import settings


def current_legal_docs_version() -> str:
    return getattr(settings, "LEGAL_DOCS_VERSION", "2026-09-10")


def user_needs_terms_acceptance(
    *,
    terms_accepted_at: datetime | None,
    terms_and_privacy_version: str | None,
) -> bool:
    if terms_accepted_at is None:
        return True
    accepted = (terms_and_privacy_version or "").strip()
    return accepted != current_legal_docs_version()


def client_ip(request) -> str | None:
    from common.client_ip import extract_client_ip

    return extract_client_ip(request)


def client_user_agent(request) -> str:
    return (request.META.get("HTTP_USER_AGENT") or "")[:500]
