"""Identidade do controlador de dados (placeholders configuráveis por deploy)."""

from __future__ import annotations

from dataclasses import dataclass

from django.conf import settings


@dataclass(frozen=True, slots=True)
class LegalIdentity:
    """Dados do operador/controlador interpolados nos documentos legais."""

    controller_name: str
    trade_name: str
    cnpj: str
    address: str
    contact_email: str
    dpo_email: str
    legal_email: str
    forum: str


def get_legal_identity() -> LegalIdentity:
    """Lê a identidade legal das settings Django (env)."""

    return LegalIdentity(
        controller_name=getattr(settings, "LEGAL_CONTROLLER_NAME", "Operador do servidor"),
        trade_name=getattr(settings, "LEGAL_TRADE_NAME", "PDL PRO"),
        cnpj=getattr(settings, "LEGAL_CNPJ", "00.000.000/0000-00"),
        address=getattr(settings, "LEGAL_ADDRESS", "Brasil"),
        contact_email=getattr(settings, "LEGAL_CONTACT_EMAIL", "contato@example.com"),
        dpo_email=getattr(settings, "LEGAL_DPO_EMAIL", "dpo@example.com"),
        legal_email=getattr(settings, "LEGAL_LEGAL_EMAIL", "juridico@example.com"),
        forum=getattr(settings, "LEGAL_FORUM", "Brasil"),
    )


def identity_placeholders(identity: LegalIdentity | None = None) -> dict[str, str]:
    """Mapa de placeholders usados nos corpos HTML dos documentos."""

    identity = identity or get_legal_identity()
    return {
        "controller_name": identity.controller_name,
        "trade_name": identity.trade_name,
        "cnpj": identity.cnpj,
        "address": identity.address,
        "contact_email": identity.contact_email,
        "dpo_email": identity.dpo_email,
        "legal_email": identity.legal_email,
        "forum": identity.forum,
        "contact_mailto": f"mailto:{identity.contact_email}",
        "dpo_mailto": f"mailto:{identity.dpo_email}",
        "legal_mailto": f"mailto:{identity.legal_email}",
    }
