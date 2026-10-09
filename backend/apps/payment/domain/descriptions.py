"""Renderiza descrições de cobrança sem avaliar expressões ou acessar infraestrutura."""
import re

from .entities import PaymentOrderEntity


def payment_description(template: str, order: PaymentOrderEntity, *, default: str, coin_name: str = "") -> str:
    """Substitui variáveis PT/EN/ES uma vez; preserva tokens desconhecidos e o fallback.

    Usa somente dados do pedido, sem interpretar valores substituídos como templates.
    """
    values = {
        "moeda": coin_name, "coin_name": coin_name, "moneda": coin_name,
        "quantidade": str(order.coins), "quantity": str(order.coins), "cantidad": str(order.coins),
        "pacote": order.package_code or "custom", "package": order.package_code or "custom",
        "paquete": order.package_code or "custom",
    }
    return re.sub(r"\{(quantidade|quantity|cantidad|pacote|package|paquete|moeda|coin_name|moneda)\}",
                  lambda match: values[match.group(1)], (template or "").strip() or default)
