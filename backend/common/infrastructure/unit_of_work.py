from __future__ import annotations

from django.db import transaction

from common.architecture.base import UnitOfWork


class DjangoUnitOfWork(UnitOfWork):
    """Implementa UnitOfWork com ``transaction.atomic()`` do Django.

    Use uma instância por escopo e um bloco ``with`` por operação. A saída normal deixa o Django
    confirmar o bloco; uma exceção provoca rollback. ``commit()`` é intencionalmente vazio: não
    antecipa a confirmação. ``rollback()`` marca o bloco ativo para reversão. Não reutilize a
    mesma instância em blocos aninhados, pois ela mantém apenas um contexto atomic. Chamadas
    SQLAlchemy ou HTTP não participam desta transação.
    """

    def __init__(self) -> None:
        self._atomic = None

    def __enter__(self) -> DjangoUnitOfWork:
        """Entra em um novo bloco atomic no banco padrão do Django."""

        self._atomic = transaction.atomic()
        self._atomic.__enter__()
        return self

    def __exit__(self, exc_type, exc, traceback) -> None:
        """Delega confirmação ou reversão à saída do bloco atomic."""

        if self._atomic is None:
            return
        self._atomic.__exit__(exc_type, exc, traceback)
        self._atomic = None

    def commit(self) -> None:
        """Não antecipa commit: a confirmação ocorre ao sair normalmente do bloco."""

        # Um commit aqui quebraria a composição com um atomic externo do Django.
        return None

    def rollback(self) -> None:
        """Marca a transação ativa do Django para rollback ao sair do bloco."""

        transaction.set_rollback(True)
