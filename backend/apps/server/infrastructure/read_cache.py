"""Cache curto de leituras públicas no banco Lineage.

Fica na infraestrutura: o caso de uso continua sem Django. O TTL evita martelar
``character_offline_trade`` a cada tecla da vitrine pública.
"""

from __future__ import annotations

from collections.abc import Callable

from django.core.cache import cache

GAME_STORES_TTL = 30


def cached_fetch[T](key: str, loader: Callable[[], T], ttl: int = GAME_STORES_TTL) -> T:
    """Devolve o valor memoizado ou executa ``loader`` e guarda o resultado."""

    cached = cache.get(key)
    if cached is not None:
        return cached
    value = loader()
    cache.set(key, value, ttl)
    return value
