"""Validações de configuração exigidas antes de o processo aceitar tráfego real."""

from __future__ import annotations

from django.core.exceptions import ImproperlyConfigured

_CSP_SCRIPT_HOSTS = (
    "https://cdn.jsdelivr.net https://js.stripe.com https://sdk.mercadopago.com "
    "https://hcaptcha.com https://*.hcaptcha.com"
)
_CSP_STYLE = (
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net "
    "https://fonts.googleapis.com https://cdnjs.cloudflare.com https://hcaptcha.com "
    "https://*.hcaptcha.com"
)
_CSP_REST = (
    "font-src 'self' data: https://fonts.gstatic.com "
    "https://cdnjs.cloudflare.com; img-src 'self' data: blob: https:; connect-src 'self' "
    "https: ws: wss:; frame-src 'self' https://*.stripe.com https://*.mercadopago.com "
    "https://*.mercadopago.com.br https://www.youtube-nocookie.com https://hcaptcha.com "
    "https://*.hcaptcha.com; media-src 'self' blob:; worker-src 'self' blob:; "
    "manifest-src 'self';"
)


def build_content_security_policy(
    *,
    script_unsafe_inline: bool = False,
    upgrade_insecure_requests: bool = False,
) -> str:
    """Monta a CSP. ``script_unsafe_inline`` fica só em HTML de admin/Swagger.

    A SPA e as respostas JSON da API usam ``script-src`` sem ``'unsafe-inline'``.
    Jazzmin e Spectacular ainda injetam script inline, então a política HTML
    conserva essa exceção. ``style-src 'unsafe-inline'`` permanece nas duas
    variantes (folhas do tema, hCaptcha e o CSS de bootstrap da SPA).
    """

    inline = " 'unsafe-inline'" if script_unsafe_inline else ""
    script_src = f"script-src 'self'{inline} {_CSP_SCRIPT_HOSTS}"
    policy = (
        "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; "
        f"form-action 'self'; {script_src}; {_CSP_STYLE}; {_CSP_REST}"
    )
    if upgrade_insecure_requests:
        return f"{policy} upgrade-insecure-requests;"
    return policy


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
