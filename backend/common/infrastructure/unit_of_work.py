from __future__ import annotations

from django.db import transaction

from common.architecture.base import UnitOfWork


class DjangoUnitOfWork(UnitOfWork):
    def __init__(self) -> None:
        self._atomic = None

    def __enter__(self) -> DjangoUnitOfWork:
        self._atomic = transaction.atomic()
        self._atomic.__enter__()
        return self

    def __exit__(self, exc_type, exc, traceback) -> None:
        if self._atomic is None:
            return
        self._atomic.__exit__(exc_type, exc, traceback)
        self._atomic = None

    def commit(self) -> None:
        return None

    def rollback(self) -> None:
        transaction.set_rollback(True)
