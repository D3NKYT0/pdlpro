from __future__ import annotations

from abc import ABC, abstractmethod
from decimal import Decimal
from typing import Any
from uuid import UUID


class IServicePriceRepository(ABC):
    """Porta de preços e disponibilidade dos serviços de personagem.

    Injete esta interface nos serviços de aplicação e registre o adaptador no provider. As
    assinaturas abaixo definem entradas e retornos; resultados opcionais usam None para
    ausência. Validação de negócio e autorização devem ocorrer no caso de uso que chama a porta.
    """

    @abstractmethod
    def get_price(self, code: str):
        raise NotImplementedError

    @abstractmethod
    def list_all(self) -> list[Any]:
        """Lista todos os preços cadastrados, inclusive inativos."""

        raise NotImplementedError

    @abstractmethod
    def upsert(
        self,
        *,
        code: str,
        name: str,
        price: Decimal,
        active: bool,
    ) -> Any:
        """Cria ou atualiza o preço pelo código e devolve a linha persistida."""

        raise NotImplementedError


class ILinkSlotRepository(ABC):
    """Porta de limites adicionais para vincular contas Lineage.

    Injete esta interface nos serviços de aplicação e registre o adaptador no provider. As
    assinaturas abaixo definem entradas e retornos; resultados opcionais usam None para
    ausência. Validação de negócio e autorização devem ocorrer no caso de uso que chama a porta.
    """

    @abstractmethod
    def extra_slots(self, user_id: UUID) -> int:
        raise NotImplementedError

    @abstractmethod
    def add_slots(self, user_id: UUID, quantity: int) -> int:
        raise NotImplementedError


class IManagedLineageAccountRepository(ABC):
    """Porta das referências locais de contas Lineage gerenciadas (ManagedLineageAccount).

    Injete nos casos de uso de conta e registre o adaptador no ServerProvider.
    """

    @abstractmethod
    def find_for_user(self, user_id: UUID, login: str) -> Any | None:
        """Referência local do usuário para o login (iexact), ou None."""

        raise NotImplementedError

    @abstractmethod
    def delete_for_user(self, user_id: UUID, login: str) -> None:
        raise NotImplementedError

    @abstractmethod
    def delete_by_login(self, login: str) -> None:
        raise NotImplementedError

    @abstractmethod
    def has_primary(self, user_id: UUID) -> bool:
        raise NotImplementedError

    @abstractmethod
    def promote_oldest_as_primary(self, user_id: UUID) -> None:
        """Promove a referência mais antiga a principal quando ainda não há primary."""

        raise NotImplementedError

    @abstractmethod
    def remember(self, user_id: UUID, login: str, *, primary: bool) -> None:
        """Cria ou atualiza a referência local; se primary, desmarca as demais."""

        raise NotImplementedError


class IIndexConfigRepository(ABC):
    """Porta da configuração ativa do painel (IndexConfig).

    Injete nos casos de uso de painel/staff e registre o adaptador no ServerProvider.
    """

    @abstractmethod
    def get_active(self) -> Any | None:
        """Retorna a configuração ativa mais recente, ou None."""

        raise NotImplementedError

    @abstractmethod
    def new(self) -> Any:
        """Instancia uma configuração ainda não persistida."""

        raise NotImplementedError

    @abstractmethod
    def save(self, row: Any) -> Any:
        """Persiste a configuração do painel e devolve a linha salva."""

        raise NotImplementedError


class ICustomItemRepository(ABC):
    """Porta administrativa do catálogo de itens customizados (CustomCatalogItem).

    Injete nos casos de uso de staff/server e registre o adaptador no ServerProvider.
    """

    @abstractmethod
    def list_filtered(self, *, search: str = "") -> list[Any]:
        """Lista itens, opcionalmente filtrados por nome ou ID numérico."""

        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, item_id: UUID) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def item_id_taken(self, item_id: int, *, exclude_id: UUID | None = None) -> bool:
        """Indica se o ID numérico do jogo já está cadastrado."""

        raise NotImplementedError

    @abstractmethod
    def new(self) -> Any:
        """Instancia um item customizado ainda não persistido."""

        raise NotImplementedError

    @abstractmethod
    def save(self, row: Any) -> Any:
        """Persiste o item e devolve a linha salva.

        Em conflito de ``item_id`` único, o adaptador levanta ``ConflictError``.
        """

        raise NotImplementedError

    @abstractmethod
    def delete_image_file(self, row: Any, *, old_name: str | None) -> None:
        """Remove arquivo de imagem órfão quando o save falhou após upload."""

        raise NotImplementedError


class ICharacterServiceOperationRepository(ABC):
    """Porta das reservas de serviço pago de personagem (CharacterServiceOperation).

    Injete em ``paid_services`` / casos de uso de personagem e registre no ServerProvider.
    """

    @abstractmethod
    def require_user_locked(self, user_id: UUID) -> Any:
        raise NotImplementedError

    @abstractmethod
    def get_locked(self, operation_id) -> Any:
        """Linha sob ``select_for_update``; propaga DoesNotExist se ausente."""

        raise NotImplementedError

    @abstractmethod
    def find_by_user_and_request_key(self, user, request_key) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def has_pending_for_character(self, *, login: str, character_id: int) -> bool:
        raise NotImplementedError

    @abstractmethod
    def create(
        self,
        *,
        user,
        request_key,
        login: str,
        character_id: int,
        service: str,
        value: str,
        amount,
        status: str,
    ) -> Any:
        raise NotImplementedError

    @abstractmethod
    def save(self, row: Any, *, update_fields: list[str]) -> None:
        raise NotImplementedError


class IItemObservationRepository(ABC):
    """Porta de persistência da observação administrativa de itens L2.

    Injete nos casos de uso de observação e registre o adaptador no ServerProvider.
    """

    @abstractmethod
    def list_categories(self) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def category_item_map(self) -> dict[int, str]:
        """Mapeia item_id → nome da primeira categoria na ordem de prioridade."""

        raise NotImplementedError

    @abstractmethod
    def get_category(self, category_id: UUID) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def create_category(self, validated_data: dict) -> Any:
        raise NotImplementedError

    @abstractmethod
    def update_category(self, category_id: UUID, validated_data: dict) -> Any:
        raise NotImplementedError

    @abstractmethod
    def delete_category(self, category_id: UUID) -> bool:
        """Remove a categoria. Retorna False se não existir."""

        raise NotImplementedError

    @abstractmethod
    def list_favorite_item_ids(self, *, user_id: UUID, source: str) -> set[int]:
        raise NotImplementedError

    @abstractmethod
    def set_favorite(self, *, user_id: UUID, source: str, item_id: int) -> None:
        raise NotImplementedError

    @abstractmethod
    def unset_favorite(self, *, user_id: UUID, source: str, item_id: int) -> None:
        raise NotImplementedError

    @abstractmethod
    def list_snapshots(self) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def get_snapshot(self, snapshot_id: UUID) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def delete_snapshot(self, snapshot_id: UUID) -> bool:
        raise NotImplementedError

    @abstractmethod
    def snapshot_exists_for_day(self, *, source: str, snapshot_date) -> bool:
        raise NotImplementedError

    @abstractmethod
    def create_snapshot_with_details(
        self,
        *,
        source: str,
        snapshot_date,
        created_by: Any,
        notes: str,
        totals: dict,
        details: list[dict],
    ) -> Any:
        """Persiste snapshot e detalhes em uma transação. Pode levantar IntegrityError."""

        raise NotImplementedError

    @abstractmethod
    def list_snapshot_details(self, snapshot: Any) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def site_item_aggregates(self) -> list[dict]:
        """Agrega quantidade/instâncias/donos dos itens no inventário do painel."""

        raise NotImplementedError
