from collections import defaultdict
from decimal import Decimal

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Count, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.inventory.infrastructure.models import InventoryItem
from apps.server.infrastructure.item_observation_models import (
    ItemObservationCategory, ItemObservationDetail, ItemObservationSnapshot,
)
from apps.server.infrastructure.lineage.item_catalog import item_display_name


class ObservationUnavailable(Exception):
    pass


def observation_source():
    return (f"{settings.LINEAGE_DB_HOST}:{settings.LINEAGE_DB_PORT}/"
            f"{settings.LINEAGE_DB_NAME} ({settings.LINEAGE_QUERY_MODULE})")


def read_observation(gateway):
    if not settings.LINEAGE_DB_ENABLED:
        raise ObservationUnavailable("O banco L2 está desativado. Ative LINEAGE_DB_ENABLED para consultar os itens.")
    data = gateway.observe_items()
    categories = {}
    for category in ItemObservationCategory.objects.all():
        for item_id in category.item_ids:
            categories.setdefault(item_id, category.name)

    def enrich(row):
        item_id = int(row["item_id"])
        return {**row, "item_id": item_id, "item_name": item_display_name(item_id),
                "category_name": categories.get(item_id, ""),
                **{key: int(row[key] or 0) for key in ("quantity", "instances", "unique_owners")}}

    items = [enrich(row) for row in data["items"]]
    details = [enrich(row) for row in data["details"]]
    site_rows = InventoryItem.objects.order_by().values("item_id").annotate(
        quantity=Sum("quantity"), instances=Count("pk"),
        unique_owners=Count(Coalesce("inventory__user_id", "user_id"), distinct=True),
    )
    site = [enrich({**row, "location": "SITE"}) for row in site_rows]
    locations = defaultdict(lambda: {"quantity": 0, "instances": 0, "types": 0})
    for row in details + site:
        location = locations[row["location"]]
        location["quantity"] += row["quantity"]
        location["instances"] += row["instances"]
        location["types"] += 1
    return {
        "source": observation_source(), "items": items, "details": details + site,
        "locations": [{"location": key, **value} for key, value in sorted(locations.items())],
        "total_characters": int(data["characters"][0]["total"]),
        "total_instances": sum(row["instances"] for row in items),
        "total_quantity": sum(row["quantity"] for row in items),
        "site_quantity": sum(row["quantity"] for row in site),
    }


def capture_snapshot(gateway, user, notes=""):
    source, today = observation_source(), timezone.localdate()
    if ItemObservationSnapshot.objects.filter(source=source, snapshot_date=today).exists():
        raise ObservationUnavailable("Já existe um snapshot de hoje para esta origem.")
    data = read_observation(gateway)
    try:
        with transaction.atomic():
            snapshot = ItemObservationSnapshot.objects.create(
                source=source, snapshot_date=today, created_by=user, notes=notes,
                **{key: data[key] for key in ("total_characters", "total_instances", "total_quantity", "site_quantity")},
            )
            ItemObservationDetail.objects.bulk_create([
                ItemObservationDetail(snapshot=snapshot, **{
                    key: row[key] for key in ("item_id", "item_name", "location", "quantity",
                                              "instances", "unique_owners", "category_name")
                }) for row in data["details"]
            ], batch_size=1000)
    except IntegrityError:
        if ItemObservationSnapshot.objects.filter(source=source, snapshot_date=today).exists():
            raise ObservationUnavailable("Já existe um snapshot de hoje para esta origem.") from None
        raise
    return snapshot


def compare_snapshots(before, after):
    if before.source != after.source:
        raise ObservationUnavailable("Selecione snapshots da mesma origem L2.")
    if before.snapshot_date >= after.snapshot_date:
        raise ObservationUnavailable("A data inicial deve ser anterior à data final.")
    old = {(row.item_id, row.location): row for row in before.details.all()}
    new = {(row.item_id, row.location): row for row in after.details.all()}
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
        rows.append({"item_id": row.item_id, "item_name": row.item_name, "location": row.location,
                     "before": start, "after": end, "change": change, "percentage": percentage})
    return sorted(rows, key=lambda row: (-abs(row["change"]), row["item_id"], row["location"]))
