from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID

from django.db import IntegrityError

from apps.server.domain.repositories import ICustomItemRepository
from apps.server.infrastructure.custom_item_models import ITEM_CATEGORIES, ITEM_GRADES
from apps.server.infrastructure.lineage.item_catalog import get_xml_catalog
from common.architecture.base import UseCase
from common.architecture.exceptions import EntityNotFoundError, ValidationDomainError


@dataclass(frozen=True, slots=True)
class ListCustomItemsInput:
    search: str = ""
    page: int = 1
    page_size: int = 24


@dataclass(frozen=True, slots=True)
class ListCustomItemsResult:
    rows: list[Any]
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


def _assert_item_id_available(item_id: int, *, active: bool, instance=None) -> None:
    if instance is not None and item_id != instance.item_id:
        raise ValidationDomainError(
            "O ID não pode ser alterado após o cadastro.",
            details={"item_id": "O ID não pode ser alterado após o cadastro."},
        )
    if active and get_xml_catalog().get(item_id):
        raise ValidationDomainError(
            "Este ID já pertence ao catálogo XML.",
            details={"item_id": "Este ID já pertence ao catálogo XML."},
        )


def _paginate(rows: list[Any], page_number: int, page_size: int) -> ListCustomItemsResult:
    count = len(rows)
    pages = max(1, (count + page_size - 1) // page_size) if count else 1
    page = min(max(page_number, 1), pages)
    start = (page - 1) * page_size
    return ListCustomItemsResult(rows=rows[start : start + page_size], count=count, page=page, pages=pages)


class ListCustomItemsUseCase(UseCase[ListCustomItemsInput, ListCustomItemsResult]):
    """Pesquisa e pagina itens customizados do catálogo administrativo.

    Uso: resolva pelo container e chame ``execute`` com ``ListCustomItemsInput``.
    """

    def __init__(self, items: ICustomItemRepository) -> None:
        self._items = items

    def execute(self, data: ListCustomItemsInput) -> ListCustomItemsResult:
        return _paginate(self._items.list_filtered(search=data.search), data.page, data.page_size)


class GetCustomItemUseCase(UseCase[UUID, Any]):
    """Retorna um item customizado pelo UUID público.

    Uso: resolva pelo container e chame ``execute`` com o UUID. Levanta ``EntityNotFoundError``
    quando o registro não existe.
    """

    def __init__(self, items: ICustomItemRepository) -> None:
        self._items = items

    def execute(self, data: UUID) -> Any:
        row = self._items.get_by_id(data)
        if row is None:
            raise EntityNotFoundError("Item customizado não encontrado.")
        return row


class UpsertCustomItemUseCase(UseCase[UpsertCustomItemInput, Any]):
    """Cria ou atualiza um item customizado após validar conflito com o catálogo XML.

    Uso: resolva pelo container e chame ``execute`` com ``UpsertCustomItemInput``. ``validated_data``
    já deve ter passado pela sanitização de imagem/campos da apresentação.
    """

    def __init__(self, items: ICustomItemRepository) -> None:
        self._items = items

    def execute(self, data: UpsertCustomItemInput) -> Any:
        instance = None
        if data.item_id is not None:
            instance = self._items.get_by_id(data.item_id)
            if instance is None:
                raise EntityNotFoundError("Item customizado não encontrado.")
        payload = dict(data.validated_data)
        item_id = payload.get("item_id", instance.item_id if instance else None)
        active = payload.get("active", instance.active if instance else True)
        _assert_item_id_available(item_id, active=active, instance=instance)
        row = instance if instance is not None else self._items.new()
        old_image = row.image.name if row.image else None
        for key, value in payload.items():
            setattr(row, key, value)
        try:
            return self._items.save(row)
        except IntegrityError:
            self._items.delete_image_file(row, old_name=old_image)
            raise ValidationDomainError(
                "Este ID já está cadastrado.",
                details={"item_id": "Este ID já está cadastrado."},
            ) from None
