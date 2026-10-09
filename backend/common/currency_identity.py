"""Identidade de exibição da moeda virtual compartilhada nas bordas do produto."""
from django.conf import settings
from django.utils.translation import gettext as _


def configured_coin_name() -> str:
    """Retorna somente a marca configurada, sem aplicar fallback de idioma."""
    return (getattr(settings, "WALLET_COIN_NAME", "") or "").strip()


def coin_display_name(*, title: bool = False) -> str:
    """Lê a marca da instalação ou o fallback traduzido, sem acessar banco ou alterar saldos."""
    return configured_coin_name() or (_("Moedas") if title else _("moedas"))
