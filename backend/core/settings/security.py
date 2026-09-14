"""Validações de configuração exigidas antes de o processo aceitar tráfego real."""

from __future__ import annotations

from django.core.exceptions import ImproperlyConfigured

MINIMUM_SECRET_KEY_LENGTH = 50
INSECURE_SECRET_KEY_MARKERS = ("django-insecure", "change-me", "changeme")


def secret_key_rejection_reason(secret_key: str) -> str | None:
    """Explica por que a ``SECRET_KEY`` não serve para produção, ou ``None`` quando serve.

    Recusa valor vazio, os marcadores dos exemplos versionados (``django-insecure``,
    ``change-me``) e chaves curtas demais, porque assinam cookies JWT, tokens de CSRF, links
    de download LGPD e códigos de recuperação de senha.
    """

    value = (secret_key or "").strip()
    if not value:
        return "a chave está vazia"
    lowered = value.lower()
    for marker in INSECURE_SECRET_KEY_MARKERS:
        if marker in lowered:
            return f"a chave contém o marcador de exemplo '{marker}'"
    if len(value) < MINIMUM_SECRET_KEY_LENGTH:
        return f"a chave tem {len(value)} caracteres e o mínimo é {MINIMUM_SECRET_KEY_LENGTH}"
    return None


def require_production_secret_key(secret_key: str) -> None:
    """Interrompe a inicialização quando a ``SECRET_KEY`` de produção é previsível.

    Chamado pelos settings de produção. Levanta ``ImproperlyConfigured`` com a orientação de
    gerar a chave pelo configurador em vez de subir o serviço com o valor do ``.env.example``.
    """

    reason = secret_key_rejection_reason(secret_key)
    if reason is None:
        return
    raise ImproperlyConfigured(
        f"SECRET_KEY inválida para produção: {reason}. "
        "Gere uma chave forte com './setup.sh configure-production --rotate-secret-key' "
        "(ou scripts/configure-production.ps1) antes de iniciar o serviço."
    )
