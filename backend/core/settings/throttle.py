"""Configuração de DRF throttle classes e rates via env."""

from __future__ import annotations

import os
from typing import Any


def get_throttle_rates(env: Any = None) -> dict[str, str]:
    """Retorna o dicionário de taxas de throttle para o Django REST Framework."""

    def _get(key: str, default: str) -> str:
        if env is not None:
            return str(env(key, default=default))
        return os.getenv(key, default)

    return {
        "anon": _get("THROTTLE_ANON", "1000/hour"),
        "user": _get("THROTTLE_USER", "10000/hour"),
        "anon_burst": _get("THROTTLE_ANON_BURST", "30/min"),
        "anon_sustained": _get("THROTTLE_ANON_SUSTAINED", "200/hour"),
        "user_burst": _get("THROTTLE_USER_BURST", "60/min"),
        "user_sustained": _get("THROTTLE_USER_SUSTAINED", "1000/hour"),
        "staff": _get("THROTTLE_STAFF", "300/min"),
        "webhook": _get("THROTTLE_WEBHOOK", "60/min"),
        "login": _get("THROTTLE_LOGIN", "10/minute"),
        "register": _get("THROTTLE_REGISTER", "10/hour"),
        "twofa": _get("THROTTLE_TWOFA", "10/minute"),
        "password_reset": _get("THROTTLE_PASSWORD_RESET", "5/hour"),
        "lgpd_export": _get("THROTTLE_LGPD_EXPORT", "5/hour"),
        "lgpd_delete": _get("THROTTLE_LGPD_DELETE", "10/hour"),
    }
