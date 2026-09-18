"""Leitura do segredo TOTP em claro para o admin Django, sem expor o campo no formulário."""

from __future__ import annotations

from apps.accounts.application.twofa import _verify
from apps.accounts.domain.repositories import ITwoFactorRecoveryCodeRepository
from common.crypto import field_cipher_from_settings
from common.di.bootstrap import DependencyInjection


def plaintext_totp_secret(user) -> str:
    """Abre o segredo TOTP persistido (Fernet ou legado em Base32)."""

    return field_cipher_from_settings().unseal_text(getattr(user, "totp_secret", "") or "")


def accept_admin_second_factor(user, code: str) -> bool:
    """Aceita TOTP ou um código de recuperação ainda não usado."""

    if _verify(plaintext_totp_secret(user), code or ""):
        return True
    repo = DependencyInjection.root().create_scope().resolve(ITwoFactorRecoveryCodeRepository)
    return repo.consume(user.id, code or "")
