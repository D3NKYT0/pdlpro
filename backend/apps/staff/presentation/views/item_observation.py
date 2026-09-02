import logging

from django.core.paginator import Paginator
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response

from apps.server.application.item_observation import (
    ObservationUnavailable, capture_snapshot, compare_snapshots, observation_source, read_observation,
)
from apps.server.domain.gateways import ILineageGateway
from apps.server.infrastructure.item_observation_models import (
    ItemObservationCategory, ItemObservationFavorite, ItemObservationSnapshot,
)
from apps.server.infrastructure.lineage.item_catalog import get_item_catalog, item_display_name
from common.exceptions import PdlAPIException
from common.permissions import IsStaffMember
from common.views import InjectedAPIView

logger = logging.getLogger(__name__)


class CanObserveItems(BasePermission):
    def has_permission(self, request, view):
        return request.user.has_perm("server.view_itemobservationsnapshot")


class PageQuery(serializers.Serializer):
    page = serializers.IntegerField(default=1, min_value=1, max_value=1000000)


class ItemQuery(PageQuery):
    search = serializers.CharField(default="", allow_blank=True, max_length=100)
    minimum = serializers.IntegerField(default=0, min_value=0, max_value=10**30 - 1)
    category = serializers.CharField(default="", allow_blank=True, max_length=100)
    favorites = serializers.BooleanField(default=False)
    sort = serializers.ChoiceField(default="quantity", choices=["quantity", "unique_owners", "instances", "name"])


class CaptureInput(serializers.Serializer):
    notes = serializers.CharField(default="", allow_blank=True, max_length=2000)


class FavoriteInput(serializers.Serializer):
    active = serializers.BooleanField()


class ComparisonQuery(PageQuery):
    before = serializers.UUIDField()
    after = serializers.UUIDField()


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemObservationCategory
        fields = ("id", "name", "description", "item_ids", "order")
        read_only_fields = ("id",)


class SnapshotSerializer(serializers.ModelSerializer):
    created_by = serializers.CharField(source="created_by.username", read_only=True, allow_null=True)

    class Meta:
        model = ItemObservationSnapshot
        fields = ("id", "snapshot_date", "source", "created_at", "created_by", "notes",
                  "total_characters", "total_instances", "total_quantity", "site_quantity")


def query(serializer_class, request):
    serializer = serializer_class(data=request.query_params)
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data


def paginate(rows, page_number, serialize=lambda row: row):
    page = Paginator(rows, 50).get_page(page_number)
    return {"results": [serialize(row) for row in page], "count": page.paginator.count,
            "page": page.number, "pages": page.paginator.num_pages}


def item_metadata(item_id):
    item = get_item_catalog().get(item_id)
    return {"catalog_found": item is not None, "item_type": item.category if item else None,
            "grade": item.grade if item else None, "tradeable": item.tradeable if item else None}


def item_json(row):
    return {**row, **item_metadata(row["item_id"]),
            **{key: str(row[key]) for key in ("quantity", "instances", "unique_owners")}}


class ObservationView(InjectedAPIView):
    permission_classes = [IsAuthenticated, IsStaffMember, CanObserveItems]

    def require(self, permission):
        if not self.request.user.has_perm(f"server.{permission}"):
            raise PermissionDenied("Você não tem permissão para esta ação.")

    def safely(self, callback, unavailable_status=503):
        try:
            return callback()
        except ObservationUnavailable as exc:
            raise PdlAPIException(str(exc), error_code="ITEM_OBSERVATION_UNAVAILABLE",
                                  status_code=unavailable_status) from None
        except Exception:
            logger.exception("Falha na observação de itens L2")
            raise PdlAPIException("Não foi possível consultar os itens. Confira a conexão L2 e o módulo SQL.",
                                  error_code="ITEM_OBSERVATION_UNAVAILABLE", status_code=503) from None


class ObservationAccessView(ObservationView):
    def get(self, request):
        return Response({key: request.user.has_perm(f"server.{permission}") for key, permission in {
            "capture": "capture_itemobservationsnapshot", "delete_snapshots": "delete_itemobservationsnapshot",
            "add_categories": "add_itemobservationcategory", "change_categories": "change_itemobservationcategory",
            "delete_categories": "delete_itemobservationcategory",
        }.items()})


class ObservationLiveView(ObservationView):
    def get(self, request):
        options = query(ItemQuery, request)
        data = self.safely(lambda: read_observation(self.resolve(ILineageGateway)))
        favorites = set(ItemObservationFavorite.objects.filter(user=request.user, source=data["source"])
                        .values_list("item_id", flat=True))
        rows = list(data["items"])
        present = {row["item_id"] for row in rows}
        for item_id in sorted(favorites - present):
            rows.append({"item_id": item_id, "item_name": item_display_name(item_id), "quantity": 0,
                         "instances": 0, "unique_owners": 0, "category_name": ""})
        for row in rows:
            row["is_favorite"] = row["item_id"] in favorites
        needle = options["search"].casefold()
        rows = [row for row in rows if
                (not needle or needle in row["item_name"].casefold() or needle in str(row["item_id"]))
                and row["quantity"] >= options["minimum"]
                and (not options["favorites"] or row["is_favorite"])
                and (not options["category"] or options["category"] == row["category_name"])]
        order = options["sort"]
        rows.sort(key=(lambda row: (row["item_name"].casefold(), row["item_id"])) if order == "name"
                  else lambda row: (-row[order], row["item_id"]))
        return Response({
            **paginate(rows, options["page"], item_json), "source": data["source"],
            "totals": {key: str(data[key]) for key in
                       ("total_quantity", "total_instances", "total_characters", "site_quantity")},
            "locations": [{**row, "quantity": str(row["quantity"]), "instances": str(row["instances"])}
                          for row in data["locations"]],
            "categories": CategorySerializer(ItemObservationCategory.objects.all(), many=True).data,
        })


class ObservationFavoriteView(ObservationView):
    def put(self, request, item_id):
        if not 0 < item_id <= 2147483647:
            raise serializers.ValidationError({"item_id": "ID de item inválido."})
        serializer = FavoriteInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        criteria = {"user": request.user, "source": observation_source(), "item_id": item_id}
        active = serializer.validated_data["active"]
        if active:
            ItemObservationFavorite.objects.get_or_create(**criteria)
        else:
            ItemObservationFavorite.objects.filter(**criteria).delete()
        return Response({"item_id": item_id, "active": active})


class ObservationSnapshotsView(ObservationView):
    def get(self, request):
        page = query(PageQuery, request)["page"]
        rows = ItemObservationSnapshot.objects.select_related("created_by")
        return Response(paginate(rows, page, lambda row: SnapshotSerializer(row).data))

    def post(self, request):
        self.require("capture_itemobservationsnapshot")
        serializer = CaptureInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        snapshot = self.safely(lambda: capture_snapshot(self.resolve(ILineageGateway), request.user,
                                                       serializer.validated_data["notes"]), unavailable_status=409)
        return Response(SnapshotSerializer(snapshot).data, status=201)


class ObservationSnapshotView(ObservationView):
    def get(self, request, snapshot_id):
        snapshot = get_object_or_404(ItemObservationSnapshot, id=snapshot_id)
        page = query(PageQuery, request)["page"]
        def serialize(row):
            return {**item_metadata(row.item_id), "item_id": row.item_id, "item_name": row.item_name, "category_name": row.category_name,
                    "location": row.location, "quantity": str(row.quantity), "instances": str(row.instances),
                    "unique_owners": str(row.unique_owners)}
        return Response({"snapshot": SnapshotSerializer(snapshot).data,
                         **paginate(snapshot.details.all(), page, serialize)})

    def delete(self, request, snapshot_id):
        self.require("delete_itemobservationsnapshot")
        get_object_or_404(ItemObservationSnapshot, id=snapshot_id).delete()
        return Response(status=204)


class ObservationComparisonView(ObservationView):
    def get(self, request):
        options = query(ComparisonQuery, request)
        before = get_object_or_404(ItemObservationSnapshot, id=options["before"])
        after = get_object_or_404(ItemObservationSnapshot, id=options["after"])
        rows = self.safely(lambda: compare_snapshots(before, after), unavailable_status=400)
        def serialize(row):
            return {**row, **item_metadata(row["item_id"]), "before": str(row["before"]), "after": str(row["after"]), "change": str(row["change"]),
                    "percentage": str(row["percentage"]) if row["percentage"] is not None else None}
        return Response({"before": SnapshotSerializer(before).data, "after": SnapshotSerializer(after).data,
                         **paginate(rows, options["page"], serialize)})


class ObservationCategoriesView(ObservationView):
    def get(self, request):
        return Response(CategorySerializer(ItemObservationCategory.objects.all(), many=True).data)

    def post(self, request):
        self.require("add_itemobservationcategory")
        serializer = CategorySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=201)


class ObservationCategoryView(ObservationView):
    def put(self, request, category_id):
        self.require("change_itemobservationcategory")
        serializer = CategorySerializer(get_object_or_404(ItemObservationCategory, id=category_id), data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, category_id):
        self.require("delete_itemobservationcategory")
        get_object_or_404(ItemObservationCategory, id=category_id).delete()
        return Response(status=204)
