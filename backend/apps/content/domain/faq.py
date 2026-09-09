"""Constantes de domínio do FAQ, sem dependência do ORM."""

from __future__ import annotations


class FaqAudience:
    """Audiência mínima autorizada a ver um artigo do FAQ."""

    PUBLIC = "public"
    STAFF = "staff"
    SUPERADMIN = "superadmin"

    ALL = (PUBLIC, STAFF, SUPERADMIN)
