"""Ganchos de fumaça da extensão de exemplo."""

from __future__ import annotations

import logging

from extensions.surface import HookEvent, HookNames, IHookHandler

logger = logging.getLogger(__name__)


class ExampleCheckoutHook(IHookHandler):
    """Registra no log que o overlay recebeu ``checkout.completed``."""

    names = frozenset({HookNames.CHECKOUT_COMPLETED})

    def handle(self, event: HookEvent) -> None:
        logger.info(
            "Extensão example: checkout concluído purchase_id=%s",
            event.payload.get("purchase_id"),
        )
