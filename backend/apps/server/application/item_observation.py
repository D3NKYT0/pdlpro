from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from decimal import Decimal
from typing import Any
from uuid import UUID

from django.conf import settings
from django.utils import timezone

from apps.server.application.item_catalog_use_cases import (
    serialize_observation_category,
    serialize_observation_snapshot,
)
from apps.server.domain.gateways import ILineageGateway
from apps.server.domain.item_catalog import IItemCatalog
from apps.server.domain.repositories import IItemObservationRepository
from common.architecture.base import UseCase
from common.architecture.exceptions import ConflictError, DomainError, EntityNotFoundError


class ObservationUnavailable(DomainError):
    """Sinaliza que a captura de itens não está disponível na integração atual.

    A apresentação expõe ``ITEM_OBSERVATION_UNAVAILABLE`` com status HTTP 503 por padrão.
    """

    error_code = "ITEM_OBSERVATION_UNAVAILABLE"
    status_code = 503
    message = "Observação de itens indisponível."


@dataclass(frozen=True, slots=True)
class LiveObservationInput:
    user_id: UUID
    search: str = ""
    minimum: int = 0
    category: str = ""
    favorites: bool = False
    sort: str = "quantity"
    page: int = 1
    page_size: int = 50


@dataclass(frozen=True, slots=True)
class SetFavoriteInput:
    user_id: UUID
    item_id: int
    active: bool


@dataclass(frozen=True, slots=True)
class PageInput:
    page: int = 1
    page_size: int = 50


@dataclass(frozen=True, slots=True)
class CaptureSnapshotInput:
    user: Any
    notes: str = ""


@dataclass(frozen=True, slots=True)
class SnapshotDetailInput:
    snapshot_id: UUID
    page: int = 1
    page_size: int = 50


@dataclass(frozen=True, slots=True)
class CompareSnapshotsInput:
    before_id: UUID
    after_id: UUID
    page: int = 1
    page_size: int = 50


@dataclass(frozen=True, slots=True)
class UpsertCategoryInput:
    validated_data: dict
    category_id: UUID | None = None


def observation_source() -> str:
    return (
        f"{settings.LINEAGE_DB_HOST}:{settings.LINEAGE_DB_PORT}/"
        f"{settings.LINEAGE_DB_NAME} ({settings.LINEAGE_QUERY_MODULE})"
    )


def item_metadata(catalog: IItemCatalog, item_id: int) -> dict:
    item = catalog.metadata(item_id)
    return {
        "catalog_found": item["catalog_found"],
        "item_type": item["category"],
        "grade": item["grade"],
        "tradeable": item["tradeable"],
        "icon_url": item["icon_url"],
        "source": item["source"],
    }


def _paginate(rows: list, page_number: int, page_size: int, serialize=lambda row: row) -> dict:
    count = len(rows)
    pages = max(1, (count + page_size - 1) // page_size) if count else 1
    page = min(max(page_number, 1), pages)
    start = (page - 1) * page_size
    slice_rows = rows[start : start + page_size]
    return {
        "results": [serialize(row) for row in slice_rows],
        "count": count,
        "page": page,
        "pages": pages,
    }


def _serialize_item_row(catalog: IItemCatalog, row: dict) -> dict:
    return {
        **row,
        **item_metadata(catalog, row["item_id"]),
        **{key: str(row[key]) for key in ("quantity", "instances", "unique_owners")},
    }


def read_observation(
    gateway: ILineageGateway,
    observation: IItemObservationRepository,
    catalog: IItemCatalog,
) -> dict:
    if not settings.LINEAGE_DB_ENABLED:
        raise ObservationUnavailable(
            "O banco L2 está desativado. Ative LINEAGE_DB_ENABLED para consultar os itens."
        )
    data = gateway.observe_items()
    categories = observation.category_item_map()

    def enrich(row):
        item_id = int(row["item_id"])
        return {
            **row,
            "item_id": item_id,
            "item_name": catalog.display_name(item_id),
            "category_name": categories.get(item_id, ""),
            **{key: int(row[key] or 0) for key in ("quantity", "instances", "unique_owners")},
        }

    items = [enrich(row) for row in data["items"]]
    details = [enrich(row) for row in data["details"]]
    site = [enrich({**row, "location": "SITE"}) for row in observation.site_item_aggregates()]
    locations: dict = defaultdict(lambda: {"quantity": 0, "instances": 0, "types": 0})
    for row in details + site:
        location = locations[row["location"]]
        location["quantity"] += row["quantity"]
        location["instances"] += row["instances"]
        location["types"] += 1
    return {
        "source": observation_source(),
        "items": items,
        "details": details + site,
        "locations": [{"location": key, **value} for key, value in sorted(locations.items())],
        "total_characters": int(data["characters"][0]["total"]),
        "total_instances": sum(row["instances"] for row in items),
        "total_quantity": sum(row["quantity"] for row in items),
        "site_quantity": sum(row["quantity"] for row in site),
    }


def capture_snapshot(
    gateway: ILineageGateway,
    user: Any,
    notes: str = "",
    *,
    observation: IItemObservationRepository,
    catalog: IItemCatalog,
) -> Any:
    source, today = observation_source(), timezone.localdate()
    if observation.snapshot_exists_for_day(source=source, snapshot_date=today):
        raise ObservationUnavailable("Já existe um snapshot de hoje para esta origem.")
    data = read_observation(gateway, observation, catalog)
    try:
        return observation.create_snapshot_with_details(
            source=source,
            snapshot_date=today,
            created_by=user,
            notes=notes,
            totals={
                key: data[key]
                for key in ("total_characters", "total_instances", "total_quantity", "site_quantity")
            },
            details=data["details"],
        )
    except ConflictError:
        if observation.snapshot_exists_for_day(source=source, snapshot_date=today):
            raise ObservationUnavailable("Já existe um snapshot de hoje para esta origem.") from None
        raise


def compare_snapshots(before: Any, after: Any, *, observation: IItemObservationRepository) -> list[dict]:
    if before.source != after.source:
        raise ObservationUnavailable("Selecione snapshots da mesma origem L2.")
    if before.snapshot_date >= after.snapshot_date:
        raise ObservationUnavailable("A data inicial deve ser anterior à data final.")
    old = {(row.item_id, row.location): row for row in observation.list_snapshot_details(before)}
    new = {(row.item_id, row.location): row for row in observation.list_snapshot_details(after)}
    rows = []
    for key in old.keys() | new.keys():
        previous, current = old.get(key), new.get(key)
        row = current or previous
        start = int(previous.quantity) if previous else 0
        end = int(current.quantity) if current else 0
        change = end - start
        if not change:
            continue
        percentage = (Decimal(change) * 100 / start).quantize(Decimal("0.01")) if start else None
        rows.append(
            {
                "item_id": row.item_id,
                "item_name": row.item_name,
                "location": row.location,
                "before": start,
                "after": end,
                "change": change,
                "percentage": percentage,
            }
        )
    return sorted(rows, key=lambda row: (-abs(row["change"]), row["item_id"], row["location"]))


class ListLiveObservationUseCase(UseCase[LiveObservationInput, dict]):
    """Consulta a distribuição ao vivo de itens com filtros, favoritos e paginação.

    Uso: resolva pelo container e chame ``execute`` com ``LiveObservationInput``.
    """

    def __init__(
        self,
        gateway: ILineageGateway,
        observation: IItemObservationRepository,
        catalog: IItemCatalog,
    ) -> None:
        self._gateway = gateway
        self._observation = observation
        self._catalog = catalog

    def execute(self, data: LiveObservationInput) -> dict:
        raw = read_observation(self._gateway, self._observation, self._catalog)
        favorites = self._observation.list_favorite_item_ids(user_id=data.user_id, source=raw["source"])
        rows = list(raw["items"])
        present = {row["item_id"] for row in rows}
        for item_id in sorted(favorites - present):
            rows.append(
                {
                    "item_id": item_id,
                    "item_name": self._catalog.display_name(item_id),
                    "quantity": 0,
                    "instances": 0,
                    "unique_owners": 0,
                    "category_name": "",
                }
            )
        for row in rows:
            row["is_favorite"] = row["item_id"] in favorites
        needle = data.search.casefold()
        rows = [
            row
            for row in rows
            if (not needle or needle in row["item_name"].casefold() or needle in str(row["item_id"]))
            and row["quantity"] >= data.minimum
            and (not data.favorites or row["is_favorite"])
            and (not data.category or data.category == row["category_name"])
        ]
        order = data.sort
        rows.sort(
            key=(lambda row: (row["item_name"].casefold(), row["item_id"]))
            if order == "name"
            else (lambda row: (-row[order], row["item_id"]))
        )
        categories = self._observation.list_categories()
        return {
            **_paginate(
                rows, data.page, data.page_size, lambda row: _serialize_item_row(self._catalog, row)
            ),
            "source": raw["source"],
            "totals": {
                key: str(raw[key])
                for key in ("total_quantity", "total_instances", "total_characters", "site_quantity")
            },
            "locations": [
                {**row, "quantity": str(row["quantity"]), "instances": str(row["instances"])}
                for row in raw["locations"]
            ],
            "categories": [serialize_observation_category(row) for row in categories],
        }


class SetObservationFavoriteUseCase(UseCase[SetFavoriteInput, dict]):
    """Adiciona ou remove um item dos favoritos de observação do usuário."""

    def __init__(self, observation: IItemObservationRepository) -> None:
        self._observation = observation

    def execute(self, data: SetFavoriteInput) -> dict:
        source = observation_source()
        if data.active:
            self._observation.set_favorite(user_id=data.user_id, source=source, item_id=data.item_id)
        else:
            self._observation.unset_favorite(user_id=data.user_id, source=source, item_id=data.item_id)
        return {"item_id": data.item_id, "active": data.active}


class ListObservationSnapshotsUseCase(UseCase[PageInput, dict]):
    """Lista capturas persistidas de observação com paginação."""

    def __init__(self, observation: IItemObservationRepository) -> None:
        self._observation = observation

    def execute(self, data: PageInput) -> dict:
        rows = self._observation.list_snapshots()
        return _paginate(
            rows,
            data.page,
            data.page_size,
            serialize_observation_snapshot,
        )


class CaptureObservationSnapshotUseCase(UseCase[CaptureSnapshotInput, Any]):
    """Captura o estado atual da observação e persiste um novo snapshot."""

    def __init__(
        self,
        gateway: ILineageGateway,
        observation: IItemObservationRepository,
        catalog: IItemCatalog,
    ) -> None:
        self._gateway = gateway
        self._observation = observation
        self._catalog = catalog

    def execute(self, data: CaptureSnapshotInput) -> dict:
        snapshot = capture_snapshot(
            self._gateway,
            data.user,
            data.notes,
            observation=self._observation,
            catalog=self._catalog,
        )
        return serialize_observation_snapshot(snapshot)


class GetObservationSnapshotUseCase(UseCase[SnapshotDetailInput, dict]):
    """Retorna metadados e detalhes paginados de uma captura."""

    def __init__(self, observation: IItemObservationRepository, catalog: IItemCatalog) -> None:
        self._observation = observation
        self._catalog = catalog

    def execute(self, data: SnapshotDetailInput) -> dict:
        snapshot = self._observation.get_snapshot(data.snapshot_id)
        if snapshot is None:
            raise EntityNotFoundError("Captura de observação não encontrada.")
        details = self._observation.list_snapshot_details(snapshot)

        def serialize(row):
            return {
                **item_metadata(self._catalog, row.item_id),
                "item_id": row.item_id,
                "item_name": row.item_name,
                "category_name": row.category_name,
                "location": row.location,
                "quantity": str(row.quantity),
                "instances": str(row.instances),
                "unique_owners": str(row.unique_owners),
            }

        return {
            "snapshot": serialize_observation_snapshot(snapshot),
            **_paginate(details, data.page, data.page_size, serialize),
        }


class DeleteObservationSnapshotUseCase(UseCase[UUID, None]):
    """Remove permanentemente uma captura de observação."""

    def __init__(self, observation: IItemObservationRepository) -> None:
        self._observation = observation

    def execute(self, data: UUID) -> None:
        if not self._observation.delete_snapshot(data):
            raise EntityNotFoundError("Captura de observação não encontrada.")


class CompareObservationSnapshotsUseCase(UseCase[CompareSnapshotsInput, dict]):
    """Compara duas capturas e pagina as diferenças encontradas."""

    def __init__(self, observation: IItemObservationRepository, catalog: IItemCatalog) -> None:
        self._observation = observation
        self._catalog = catalog

    def execute(self, data: CompareSnapshotsInput) -> dict:
        before = self._observation.get_snapshot(data.before_id)
        after = self._observation.get_snapshot(data.after_id)
        if before is None or after is None:
            raise EntityNotFoundError("Captura de observação não encontrada.")
        rows = compare_snapshots(before, after, observation=self._observation)

        def serialize(row):
            return {
                **row,
                **item_metadata(self._catalog, row["item_id"]),
                "before": str(row["before"]),
                "after": str(row["after"]),
                "change": str(row["change"]),
                "percentage": str(row["percentage"]) if row["percentage"] is not None else None,
            }

        return {
            "before": serialize_observation_snapshot(before),
            "after": serialize_observation_snapshot(after),
            **_paginate(rows, data.page, data.page_size, serialize),
        }


class ListObservationCategoriesUseCase(UseCase[None, list[dict]]):
    """Lista categorias usadas para organizar a observação de itens."""

    def __init__(self, observation: IItemObservationRepository) -> None:
        self._observation = observation

    def execute(self, data: None = None) -> list[dict]:
        return [
            serialize_observation_category(row)
            for row in self._observation.list_categories()
        ]


class GetObservationCategoryUseCase(UseCase[UUID, dict]):
    """Retorna uma categoria de observação pelo UUID público."""

    def __init__(self, observation: IItemObservationRepository) -> None:
        self._observation = observation

    def execute(self, data: UUID) -> dict:
        row = self._observation.get_category(data)
        if row is None:
            raise EntityNotFoundError("Categoria de observação não encontrada.")
        return serialize_observation_category(row)


class UpsertObservationCategoryUseCase(UseCase[UpsertCategoryInput, dict]):
    """Cria ou atualiza uma categoria de observação."""

    def __init__(self, observation: IItemObservationRepository) -> None:
        self._observation = observation

    def execute(self, data: UpsertCategoryInput) -> dict:
        if data.category_id is None:
            row = self._observation.create_category(data.validated_data)
        else:
            if self._observation.get_category(data.category_id) is None:
                raise EntityNotFoundError("Categoria de observação não encontrada.")
            row = self._observation.update_category(data.category_id, data.validated_data)
        return serialize_observation_category(row)


class DeleteObservationCategoryUseCase(UseCase[UUID, None]):
    """Remove permanentemente uma categoria de observação."""

    def __init__(self, observation: IItemObservationRepository) -> None:
        self._observation = observation

    def execute(self, data: UUID) -> None:
        if not self._observation.delete_category(data):
            raise EntityNotFoundError("Categoria de observação não encontrada.")
