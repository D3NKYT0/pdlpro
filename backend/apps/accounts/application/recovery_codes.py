"""Geração e normalização dos códigos de recuperação do 2FA."""

from __future__ import annotations

import secrets

RECOVERY_CODE_COUNT = 10
RECOVERY_CODE_LENGTH = 8
RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def generate_recovery_codes(count: int = RECOVERY_CODE_COUNT) -> list[str]:
    """Gera códigos ``XXXX-XXXX`` com alfabeto sem caracteres ambíguos."""

    codes: list[str] = []
    seen: set[str] = set()
    while len(codes) < count:
        raw = "".join(secrets.choice(RECOVERY_ALPHABET) for _ in range(RECOVERY_CODE_LENGTH))
        if raw in seen:
            continue
        seen.add(raw)
        codes.append(f"{raw[:4]}-{raw[4:]}")
    return codes


def normalize_recovery_code(code: str) -> str:
    """Remove hífens/espaços e padroniza em maiúsculas para comparação."""

    return "".join(ch for ch in (code or "").strip().upper() if ch.isalnum())
