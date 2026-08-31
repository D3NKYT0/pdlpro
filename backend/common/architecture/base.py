from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Generic, TypeVar
from uuid import UUID

TInput = TypeVar("TInput")
TOutput = TypeVar("TOutput")
TEntity = TypeVar("TEntity")


class Entity(ABC):
    """Entidade de domínio. Identidade pública é sempre UUID."""

    id: UUID


@dataclass(frozen=True, slots=True)
class ValueObject:
    """Objeto de valor imutável."""


class UseCase(ABC, Generic[TInput, TOutput]):
    """Caso de uso: única porta de entrada da camada de aplicação."""

    @abstractmethod
    def execute(self, data: TInput) -> TOutput:
        raise NotImplementedError


class Repository(ABC, Generic[TEntity]):
    """Contrato de persistência. Implementações vivem em infrastructure."""

    @abstractmethod
    def get_by_id(self, entity_id: UUID) -> TEntity | None:
        raise NotImplementedError

    @abstractmethod
    def save(self, entity: TEntity) -> TEntity:
        raise NotImplementedError


class UnitOfWork(ABC):
    """Fronteira transacional. Use cases que mutam estado recebem esta porta."""

    @abstractmethod
    def __enter__(self) -> UnitOfWork:
        raise NotImplementedError

    @abstractmethod
    def __exit__(self, exc_type, exc, traceback) -> None:
        raise NotImplementedError

    @abstractmethod
    def commit(self) -> None:
        raise NotImplementedError

    @abstractmethod
    def rollback(self) -> None:
        raise NotImplementedError
