from __future__ import annotations

from enum import Enum


class Lifetime(str, Enum):
    """Tempo de vida de um serviço no container."""

    SINGLETON = "singleton"
    SCOPED = "scoped"
    TRANSIENT = "transient"
