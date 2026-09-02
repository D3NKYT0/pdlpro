from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Generic, TypeVar
from uuid import UUID

TInput = TypeVar("TInput")
TOutput = TypeVar("TOutput")
TEntity = TypeVar("TEntity")


class Entity(ABC):
    """Base de identidade para entidades do domínio, sem dependência do ORM.

    Declare ``id`` como UUID nas entidades do painel. Esta base apenas expressa o contrato: não
    gera identificadores nem persiste objetos.
    """

    id: UUID


@dataclass(frozen=True, slots=True)
class ValueObject:
    """Base imutável para valores comparados pelo conteúdo.

    Use uma dataclass também marcada como ``frozen=True`` ao declarar novos campos. Não
    representa uma linha do banco nem possui identidade própria.
    """


class UseCase(ABC, Generic[TInput, TOutput]):
    """Contrato de entrada da aplicação: recebe TInput e produz TOutput.

    Implemente ``execute(data)`` com a regra de negócio e declare dependências no construtor com
    tipos registrados no provider. Na view, valide a entrada e use
    ``self.resolve(MeuUseCase).execute(entrada)``; em testes, injete fakes diretamente. A base
    não abre transações nem verifica permissões sozinha.
    """

    @abstractmethod
    def execute(self, data: TInput) -> TOutput:
        """Executa a regra com a entrada tipada e devolve o resultado da aplicação."""

        raise NotImplementedError


class Repository(ABC, Generic[TEntity]):
    """Contrato genérico de consulta por UUID e persistência de entidades.

    Implemente o acesso ao banco em ``infrastructure`` e registre o adaptador no provider.
    ``get_by_id`` retorna ``None`` quando não há entidade; ``save`` devolve a entidade
    persistida. Portas específicas dos apps podem definir contratos próprios sem herdar desta
    base.
    """

    @abstractmethod
    def get_by_id(self, entity_id: UUID) -> TEntity | None:
        """Consulta uma entidade pelo UUID público; retorna None se não existir."""

        raise NotImplementedError

    @abstractmethod
    def save(self, entity: TEntity) -> TEntity:
        """Persiste a entidade e retorna sua representação atualizada."""

        raise NotImplementedError


class UnitOfWork(ABC):
    """Porta para delimitar uma operação transacional da aplicação.

    Receba esta dependência no construtor e agrupe as escritas em ``with self._unit_of_work:``.
    A implementação determina o significado de commit e rollback; esta abstração não coordena
    transações distribuídas entre o banco do painel, o Lineage e serviços HTTP.
    """

    @abstractmethod
    def __enter__(self) -> UnitOfWork:
        """Abre a fronteira transacional e devolve a unidade de trabalho ativa."""

        raise NotImplementedError

    @abstractmethod
    def __exit__(self, exc_type, exc, traceback) -> None:
        """Encerra a fronteira, recebendo a exceção do bloco quando houver falha."""

        raise NotImplementedError

    @abstractmethod
    def commit(self) -> None:
        """Solicita confirmação conforme a semântica do adaptador transacional."""

        raise NotImplementedError

    @abstractmethod
    def rollback(self) -> None:
        """Solicita reversão conforme a semântica do adaptador transacional."""

        raise NotImplementedError
