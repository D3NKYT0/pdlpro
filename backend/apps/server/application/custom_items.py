from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from apps.server.application.item_catalog_use_cases import serialize_custom_item
from apps.server.domain.item_catalog import ITEM_CATEGORIES, ITEM_GRADES, IItemCatalog
from apps.server.domain.repositories import ICustomItemRepository
from common.architecture.base import UseCase
from common.architecture.exceptions import (
    ConflictError,
    EntityNotFoundError,
    ValidationDomainError,
)


@dataclass(frozen=True, slots=True)
class ListCustomItemsInput:
    search: str = ""
    page: int = 1
    page_size: int = 24


@dataclass(frozen=True, slots=True)
class ListCustomItemsResult:
    rows: list[dict]
    count: int
    page: int
    pages: int


@dataclass(frozen=True, slots=True)
class UpsertCustomItemInput:
    validated_data: dict
    item_id: UUID | None = None


def catalog_choices() -> dict:
    """Opções estáticas de categoria e grau para formulários administrativos."""

    return {
        "categories": [{"value": key, "label": label} for key, label in ITEM_CATEGORIES],
        "grades": [{"value": key, "label": label} for key, label in ITEM_GRADES],
    }


def _assert_item_id_available(
    catalog: IItemCatalog, item_id: int, *, active: bool, instance=None
) -> None:
    if instance is not None and item_id != instance.item_id:
        raise ValidationDomainError(
            "O ID não pode ser alterado após o cadastro.",
            details={"item_id": "O ID não pode ser alterado após o cadastro."},
        )
    if active and catalog.xml_contains(item_id):
        raise ValidationDomainError(
            "Este ID já pertence ao catálogo XML.",
            details={"item_id": "Este ID já pertence ao catálogo XML."},
        )


def _paginate(rows: list[dict], page_number: int, page_size: int) -> ListCustomItemsResult:
    count = len(rows)
    pages = max(1, (count + page_size - 1) // page_size) if count else 1
    page = min(max(page_number, 1), pages)
    start = (page - 1) * page_size
    return ListCustomItemsResult(rows=rows[start : start + page_size], count=count, page=page, pages=pages)


class ListCustomItemsUseCase(UseCase[ListCustomItemsInput, ListCustomItemsResult]):
    """Pesquisa e pagina itens customizados do catálogo administrativo."""

    def __init__(self, items: ICustomItemRepository, catalog: IItemCatalog) -> None:
        self._items = items
        self._catalog = catalog

    def execute(self, data: ListCustomItemsInput) -> ListCustomItemsResult:
        rows = [
            serialize_custom_item(row, catalog=self._catalog)
            for row in self._items.list_filtered(search=data.search)
        ]
        return _paginate(rows, data.page, data.page_size)


class GetCustomItemUseCase(UseCase[UUID, dict]):
    """Retorna um item customizado pelo UUID público."""

    def __init__(self, items: ICustomItemRepository, catalog: IItemCatalog) -> None:
        self._items = items
        self._catalog = catalog

    def execute(self, data: UUID) -> dict:
        row = self._items.get_by_id(data)
        if row is None:
            raise EntityNotFoundError("Item customizado não encontrado.")
        return serialize_custom_item(row, catalog=self._catalog)


class UpsertCustomItemUseCase(UseCase[UpsertCustomItemInput, dict]):
    """Cria ou atualiza um item customizado após validar conflito com o catálogo XML."""

    def __init__(self, items: ICustomItemRepository, catalog: IItemCatalog) -> None:
        self._items = items
        self._catalog = catalog

    def execute(self, data: UpsertCustomItemInput) -> dict:
        instance = None
        if data.item_id is not None:
            instance = self._items.get_by_id(data.item_id)
            if instance is None:
                raise EntityNotFoundError("Item customizado não encontrado.")
        payload = dict(data.validated_data)
        item_id = payload.get("item_id", instance.item_id if instance else None)
        active = payload.get("active", instance.active if instance else True)
        _assert_item_id_available(self._catalog, item_id, active=active, instance=instance)
        if self._items.item_id_taken(
            item_id, exclude_id=instance.id if instance is not None else None
        ):
            raise ValidationDomainError(
                "Este ID já está cadastrado.",
                details={"item_id": "Este ID já está cadastrado."},
            )
        row = instance if instance is not None else self._items.new()
        for key, value in payload.items():
            setattr(row, key, value)
        try:
            saved = self._items.save(row)
        except ConflictError:
            # IntegrityError já quebrou a transação; não consultar o banco aqui.
            raise ValidationDomainError(
                "Este ID já está cadastrado.",
                details={"item_id": "Este ID já está cadastrado."},
            ) from None
        return serialize_custom_item(saved, catalog=self._catalog)
