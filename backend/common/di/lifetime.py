from __future__ import annotations

from enum import Enum


class Lifetime(str, Enum):
    """Define onde uma instância resolvida pelo container é reutilizada.

    SINGLETON pertence à raiz do processo, SCOPED ao container que resolve e TRANSIENT cria uma
    instância por resolução. Use SCOPED para dependências de requisição e não armazene dados do
    usuário em singletons.
    """

    SINGLETON = "singleton"
    SCOPED = "scoped"
    TRANSIENT = "transient"
