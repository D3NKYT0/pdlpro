from datetime import date, timedelta
from decimal import Decimal

from django.core.paginator import EmptyPage, Paginator
from django.db.models import Count, DecimalField, Q, Sum, Value
from django.db.models.functions import Coalesce, TruncDate
from django.utils import timezone

from apps.auction.infrastructure.models import Auction, Bid
from apps.inventory.infrastructure.models import InventoryLog
from apps.marketplace.infrastructure.models import CharacterListing
from apps.shop.infrastructure.models import Cart, CartItem, CartPackage, ShopPurchase
from apps.staff.domain.operational_reports import (
    IOperationalReportRepository,
    OperationalReportInput,
    OperationalReportResult,
)
from apps.staff.infrastructure.financial_reports import filter_dates, serialize
from common.architecture.exceptions import EntityNotFoundError

ZERO = Decimal("0.00")
INVENTORY_WINDOW_DAYS = 15


def decimal_field():
    return DecimalField(max_digits=24, decimal_places=2)


def money_sum(field, condition=None):
    return Coalesce(Sum(field, filter=condition), Value(ZERO), output_field=decimal_field())


def page_result(rows, summary, data):
    paginator = Paginator(rows, data.page_size)
    try:
        page = paginator.page(data.page)
    except EmptyPage as exc:
        raise EntityNotFoundError("Página do relatório não encontrada.") from exc
    return OperationalReportResult(
        count=paginator.count,
        total_pages=paginator.num_pages,
        results=serialize(list(page)),
        summary=serialize(summary),
    )


class DjangoOperationalReportRepository(IOperationalReportRepository):
    """Agrega inventário, leilões, compras da loja e marketplace pelo ORM do painel."""

    def report(self, data: OperationalReportInput) -> OperationalReportResult:
        if data.report == "inventory":
            return self._inventory(data)
        if data.report == "auctions":
            return self._auctions(data)
        if data.report == "purchases":
            return self._purchases(data)
        if data.report == "marketplace":
            return self._marketplace(data)
        raise EntityNotFoundError("Relatório operacional não encontrado.")

    def _inventory(self, data: OperationalReportInput) -> OperationalReportResult:
        window_start = timezone.now() - timedelta(days=INVENTORY_WINDOW_DAYS)
        logs = InventoryLog.objects.filter(created_at__gte=window_start)
        if data.date_from or data.date_to:
            logs = filter_dates(logs, data)
        if data.username:
            logs = logs.filter(user__username__icontains=data.username)
        if data.action:
            logs = logs.filter(action=data.action)

        by_day = (
            logs.annotate(day=TruncDate("created_at"))
            .values("day", "action")
            .annotate(total=Coalesce(Sum("quantity"), 0), events=Count("id"))
            .order_by("day", "action")
        )
        series: dict[str, dict[str, int]] = {}
        for row in by_day:
            day = row["day"].isoformat() if isinstance(row["day"], date) else str(row["day"])
            series.setdefault(day, {})[row["action"]] = int(row["total"] or 0)

        action_totals = {
            row["action"]: {"quantity": int(row["quantity"] or 0), "events": int(row["events"] or 0)}
            for row in logs.values("action").annotate(quantity=Sum("quantity"), events=Count("id"))
        }
        top_items = list(
            logs.values("item_id", "item_name")
            .annotate(quantity=Coalesce(Sum("quantity"), 0), events=Count("id"))
            .order_by("-quantity", "-events")[:10]
        )
        top_users = list(
            logs.values("user__username")
            .annotate(quantity=Coalesce(Sum("quantity"), 0), events=Count("id"))
            .order_by("-events", "-quantity")[:10]
        )
        for row in top_users:
            row["username"] = row.pop("user__username")

        daily_rows = []
        for day in sorted(series.keys(), reverse=True):
            actions = series[day]
            daily_rows.append(
                {
                    "day": day,
                    "actions": actions,
                    "total_quantity": sum(actions.values()),
                    "event_count": sum(1 for _ in actions),
                }
            )

        summary = {
            "window_days": INVENTORY_WINDOW_DAYS,
            "log_count": logs.count(),
            "unique_items": logs.values("item_id").distinct().count(),
            "unique_users": logs.values("user_id").distinct().count(),
            "actions": action_totals,
            "top_items": top_items,
            "top_users": top_users,
            "series": [{"day": day, **series[day]} for day in sorted(series.keys())],
        }
        return page_result(daily_rows, summary, data)

    def _auctions(self, data: OperationalReportInput) -> OperationalReportResult:
        base = Auction.objects.all()
        if data.username:
            base = base.filter(
                Q(seller__username__icontains=data.username)
                | Q(highest_bidder__username__icontains=data.username)
            )
        if data.status:
            base = base.filter(status=data.status)
        if data.date_from or data.date_to:
            base = filter_dates(base, data)

        status_counts = {
            row["status"]: row["total"]
            for row in Auction.objects.values("status").annotate(total=Count("id"))
        }
        filtered_status = {
            row["status"]: row["total"] for row in base.values("status").annotate(total=Count("id"))
        }
        auctions = base.annotate(bid_count=Count("bids", distinct=True))
        bid_total = Bid.objects.filter(auction_id__in=base.values("pk")).count()
        top = list(
            auctions.order_by("-bid_count", "-current_bid", "-created_at")[:10].values(
                "id",
                "item_name",
                "item_enchant",
                "quantity",
                "status",
                "min_bid",
                "current_bid",
                "bid_count",
                "seller__username",
                "highest_bidder__username",
                "ends_at",
            )
        )
        for row in top:
            row["seller"] = row.pop("seller__username")
            row["highest_bidder"] = row.pop("highest_bidder__username")

        rows = list(
            auctions.order_by("-created_at").values(
                "id",
                "item_name",
                "item_enchant",
                "quantity",
                "status",
                "min_bid",
                "current_bid",
                "bid_count",
                "seller__username",
                "highest_bidder__username",
                "character_name",
                "ends_at",
                "created_at",
            )
        )
        for row in rows:
            row["seller"] = row.pop("seller__username")
            row["highest_bidder"] = row.pop("highest_bidder__username")

        summary = {
            "statuses": status_counts,
            "filtered_statuses": filtered_status,
            "auction_count": base.count(),
            "bid_count": bid_total,
            "open_count": filtered_status.get(Auction.Status.OPEN, 0),
            "finished_count": filtered_status.get(Auction.Status.FINISHED, 0),
            "cancelled_count": filtered_status.get(Auction.Status.CANCELLED, 0),
            "top_by_bids": top,
        }
        return page_result(rows, summary, data)

    def _purchases(self, data: OperationalReportInput) -> OperationalReportResult:
        purchases = ShopPurchase.objects.all()
        if data.username:
            purchases = purchases.filter(user__username__icontains=data.username)
        if data.status:
            purchases = purchases.filter(status=data.status)
        if data.date_from or data.date_to:
            purchases = filter_dates(purchases, data)

        completed = purchases.filter(status="completed")
        revenue = completed.aggregate(total=money_sum("total"), discount=money_sum("discount"))
        week_start = timezone.now() - timedelta(days=7)
        week_revenue = completed.filter(created_at__gte=week_start).aggregate(total=money_sum("total"))

        item_counts: dict[str, dict] = {}
        package_counts: dict[str, dict] = {}
        promo_counts: dict[str, int] = {}
        for purchase in completed.values("items_snapshot", "promo_code"):
            promo_code = purchase.get("promo_code") or ""
            if promo_code:
                code = promo_code.upper()
                promo_counts[code] = promo_counts.get(code, 0) + 1
            for entry in purchase.get("items_snapshot") or []:
                if not isinstance(entry, dict):
                    continue
                kind = entry.get("kind") or ("package" if entry.get("package_id") else "item")
                name = str(entry.get("name") or entry.get("item_name") or entry.get("package_name") or "—")
                qty = int(entry.get("quantity") or 1)
                if kind == "package":
                    bucket = package_counts.setdefault(name, {"name": name, "quantity": 0, "purchases": 0})
                    bucket["quantity"] += qty
                    bucket["purchases"] += 1
                else:
                    bucket = item_counts.setdefault(name, {"name": name, "quantity": 0, "purchases": 0})
                    bucket["quantity"] += qty
                    bucket["purchases"] += 1

        abandoned_carts = (
            Cart.objects.annotate(item_count=Count("items", distinct=True), package_count=Count("packages", distinct=True))
            .filter(Q(item_count__gt=0) | Q(package_count__gt=0))
            .count()
        )
        carts_with_items = CartItem.objects.values("cart_id").distinct().count()
        carts_with_packages = CartPackage.objects.values("cart_id").distinct().count()

        rows = list(
            purchases.order_by("-created_at").values(
                "id",
                "user__username",
                "total",
                "subtotal",
                "discount",
                "bonus_used",
                "promo_code",
                "status",
                "created_at",
            )
        )
        for row in rows:
            row["username"] = row.pop("user__username")

        summary = {
            "purchase_count": purchases.count(),
            "completed_count": completed.count(),
            "revenue": revenue["total"],
            "discount_total": revenue["discount"],
            "week_revenue": week_revenue["total"],
            "abandoned_carts": abandoned_carts,
            "carts_with_items": carts_with_items,
            "carts_with_packages": carts_with_packages,
            "top_items": sorted(item_counts.values(), key=lambda row: (-row["quantity"], -row["purchases"]))[:10],
            "top_packages": sorted(package_counts.values(), key=lambda row: (-row["quantity"], -row["purchases"]))[:10],
            "top_promos": [
                {"code": code, "uses": uses}
                for code, uses in sorted(promo_counts.items(), key=lambda item: (-item[1], item[0]))[:10]
            ],
        }
        return page_result(rows, summary, data)

    def _marketplace(self, data: OperationalReportInput) -> OperationalReportResult:
        listings = CharacterListing.objects.select_related("seller", "buyer")
        if data.username:
            listings = listings.filter(
                Q(seller__username__icontains=data.username) | Q(buyer__username__icontains=data.username)
            )
        if data.status:
            listings = listings.filter(status=data.status)
        if data.date_from or data.date_to:
            listings = filter_dates(listings, data)

        status_counts = {
            row["status"]: row["total"]
            for row in CharacterListing.objects.values("status").annotate(total=Count("id"))
        }
        filtered_status = {
            row["status"]: row["total"] for row in listings.values("status").annotate(total=Count("id"))
        }
        sold = listings.filter(status=CharacterListing.Status.SOLD)
        revenue = sold.aggregate(total=money_sum("price"))
        top_sellers = list(
            sold.values("seller__username")
            .annotate(sales=Count("id"), revenue=money_sum("price"))
            .order_by("-sales", "-revenue")[:10]
        )
        for row in top_sellers:
            row["username"] = row.pop("seller__username")

        rows = list(
            listings.order_by("-created_at").values(
                "id",
                "char_name",
                "char_level",
                "char_class",
                "price",
                "status",
                "seller__username",
                "buyer__username",
                "sold_at",
                "created_at",
            )
        )
        for row in rows:
            row["seller"] = row.pop("seller__username")
            row["buyer"] = row.pop("buyer__username")

        summary = {
            "statuses": status_counts,
            "filtered_statuses": filtered_status,
            "listing_count": listings.count(),
            "for_sale_count": filtered_status.get(CharacterListing.Status.FOR_SALE, 0),
            "sold_count": filtered_status.get(CharacterListing.Status.SOLD, 0),
            "cancelled_count": filtered_status.get(CharacterListing.Status.CANCELLED, 0),
            "disputed_count": filtered_status.get(CharacterListing.Status.DISPUTED, 0),
            "sold_revenue": revenue["total"],
            "top_sellers": top_sellers,
        }
        return page_result(rows, summary, data)
