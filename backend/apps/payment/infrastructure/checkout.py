"""Valida referências de checkout externo sem confiar em URLs do navegador."""

from urllib.parse import urlencode, urlsplit

from django.conf import settings

from apps.payment.domain.exceptions import PaymentGatewayError


def checkout_return_url(order_id) -> str:
    """Monta o retorno na instalação configurada; nunca recebe uma URL do comprador."""
    base = str(settings.PROJECT_URL).rstrip("/")
    parsed = urlsplit(base)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password:
        raise PaymentGatewayError("Não foi possível iniciar o pagamento externo.")
    return f"{base}/panel/wallet?{urlencode({'payment_return': str(order_id)})}"


def provider_checkout_url(value, provider: str) -> str:
    """Aceita somente HTTPS no domínio de checkout do provedor, sem credenciais."""
    if not isinstance(value, str):
        raise PaymentGatewayError("Não foi possível iniciar o pagamento externo.")
    parsed = urlsplit(value)
    domains = ("stripe.com",) if provider == "stripe" else ("mercadopago.com", "mercadopago.com.br")
    host = parsed.hostname or ""
    if parsed.scheme != "https" or parsed.username or parsed.password or not any(host == d or host.endswith("." + d) for d in domains):
        raise PaymentGatewayError("Não foi possível iniciar o pagamento externo.")
    return value
