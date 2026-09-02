from datetime import date, datetime
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.paginator import EmptyPage, Paginator
from django.db.models import Case, CharField, Count, DecimalField, F, Max, Min, Q, Sum, Value, When
from django.db.models.functions import Abs, Coalesce, TruncDate

from apps.payment.infrastructure.models import PedidoPagamento
from apps.staff.domain.financial_reports import (
    FinancialReportInput,
    FinancialReportResult,
    IFinancialReportRepository,
)
from apps.wallet.infrastructure.models import WalletTransaction
from common.architecture.exceptions import EntityNotFoundError

ZERO = Decimal("0.00")


def decimal_field():
    return DecimalField(max_digits=24, decimal_places=2)


def total(field, condition=None):
    return Coalesce(Sum(field, filter=condition), Value(ZERO), output_field=decimal_field())


def serialize(value):
    """Preserve exact decimal values throughout the report's JSON contract."""
    if isinstance(value, Decimal):
        return format(value.quantize(Decimal("0.01")), "f")
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, dict):
        return {key: serialize(item) for key, item in value.items()}
    if isinstance(value, list):
        return [serialize(item) for item in value]
    return value


def page_result(rows, summary, data):
    paginator = Paginator(rows, data.page_size)
    try:
        page = paginator.page(data.page)
    except EmptyPage as exc:
        raise EntityNotFoundError("Página do relatório não encontrada.") from exc
    return FinancialReportResult(
        count=paginator.count,
        total_pages=paginator.num_pages,
        results=serialize(list(page)),
        summary=serialize(summary),
    )


def filter_range(rows, field, minimum, maximum):
    if minimum is not None:
        rows = rows.filter(**{f"{field}__gte": minimum})
    if maximum is not None:
        rows = rows.filter(**{f"{field}__lte": maximum})
    return rows


def filter_dates(rows, data):
    return filter_range(rows, "created_at__date", data.date_from, data.date_to)


class DjangoFinancialReportRepository(IFinancialReportRepository):
    def report(self, data: FinancialReportInput) -> FinancialReportResult:
        if data.report == "payments":
            return self._payments(data)
        if data.report == "cash-flow":
            return self._cash_flow(data)
        return self._balances(data)

    def _balances(self, data):
        reconciliate = data.report == "reconciliation"
        rows = get_user_model().objects.all()
        if reconciliate:
            rows = rows.filter(wallet__isnull=False)
        if data.username:
            rows = rows.filter(username__icontains=data.username)
        credit = Q(wallet__transactions__kind=WalletTransaction.Kind.CREDIT)
        debit = Q(wallet__transactions__kind=WalletTransaction.Kind.DEBIT)
        rows = rows.annotate(
            balance=Coalesce(F("wallet__balance"), Value(ZERO), output_field=decimal_field()),
            bonus_balance=Coalesce(F("wallet__bonus_balance"), Value(ZERO), output_field=decimal_field()),
            credits=total("wallet__transactions__amount", credit),
            debits=total("wallet__transactions__amount", debit),
            transaction_count=Count("wallet__transactions"),
            credit_count=Count("wallet__transactions", filter=credit),
            debit_count=Count("wallet__transactions", filter=debit),
            first_transaction=Min("wallet__transactions__created_at"),
            last_transaction=Max("wallet__transactions__created_at"),
        ).annotate(
            total_balance=F("balance") + F("bonus_balance"),
            calculated_balance=F("credits") - F("debits"),
        ).annotate(
            difference=F("total_balance") - F("calculated_balance"),
        ).annotate(
            absolute_difference=Abs(F("difference")),
        ).annotate(
            report_status=Case(
                When(wallet__isnull=True, then=Value("no_wallet")),
                When(absolute_difference__lte=Decimal("0.01"), then=Value("consistent")),
                When(absolute_difference__lte=Decimal("1.00"), then=Value("review")),
                default=Value("discrepancy"),
                output_field=CharField(),
            ),
        )
        if data.status:
            rows = rows.filter(report_status=data.status)
        rows = filter_range(
            rows, "difference" if reconciliate else "total_balance", data.minimum, data.maximum,
        )
        # Keep aggregate aliases distinct from the per-user annotations: reusing
        # them would replace expressions referenced by calculated_balance, etc.
        totals = rows.aggregate(**{
            f"sum_{field}": total(field) for field in (
                "balance", "bonus_balance", "total_balance", "calculated_balance",
                "difference", "absolute_difference", "credits", "debits",
            )
        }, sum_transaction_count=Coalesce(Sum("transaction_count"), 0))
        summary = {key.removeprefix("sum_"): value for key, value in totals.items()}
        summary["statuses"] = {
            status: rows.filter(report_status=status).count()
            for status in ("consistent", "review", "discrepancy", "no_wallet")
        }
        fields = (
            "username", "balance", "bonus_balance", "total_balance", "calculated_balance",
            "credits", "debits", "difference", "transaction_count", "credit_count", "debit_count",
            "first_transaction", "last_transaction", "report_status",
        )
        return page_result(rows.order_by("username").values(*fields), summary, data)

    def _cash_flow(self, data):
        rows = filter_dates(WalletTransaction.objects.all(), data)
        if data.username:
            rows = rows.filter(wallet__user__username__icontains=data.username)
        daily = rows.annotate(day=TruncDate("created_at")).values("day").annotate(
            credits=total("amount", Q(kind=WalletTransaction.Kind.CREDIT)),
            debits=total("amount", Q(kind=WalletTransaction.Kind.DEBIT)),
            transaction_count=Count("pk"),
            credit_count=Count("pk", filter=Q(kind=WalletTransaction.Kind.CREDIT)),
            debit_count=Count("pk", filter=Q(kind=WalletTransaction.Kind.DEBIT)),
        ).order_by("day")
        report = []
        summary = {"credits": ZERO, "debits": ZERO, "net": ZERO, "transaction_count": 0}
        for item in daily:
            item["net"] = item["credits"] - item["debits"]
            for key in summary:
                summary[key] += item[key]
            item["accumulated"] = summary["net"]
            report.append(item)
        summary["days"] = len(report)
        summary["average_credits"] = summary["credits"] / len(report) if report else ZERO
        summary["average_debits"] = summary["debits"] / len(report) if report else ZERO
        # Accumulate in chronological order, then display the newest days first.
        return page_result(list(reversed(report)), summary, data)

    def _payments(self, data):
        rows = filter_dates(PedidoPagamento.objects.all(), data)
        if data.username:
            rows = rows.filter(user__username__icontains=data.username)
        for field in ("status", "method", "currency"):
            if value := getattr(data, field):
                rows = rows.filter(**{field: value})
        rows = filter_range(rows, "amount", data.minimum, data.maximum)
        confirmed = Q(status=PedidoPagamento.Status.CONFIRMED)
        summary = {
            "currencies": list(rows.order_by().values("currency").annotate(
                count=Count("pk"), total_amount=total("amount"),
                confirmed_amount=total("amount", confirmed),
                pending_amount=total("amount", Q(status__in=["pending", "processing"])),
            ).order_by("currency")),
            "statuses": {item["status"]: item["count"] for item in rows.order_by().values("status").annotate(count=Count("pk"))},
            **rows.aggregate(
                coins=total("coins", confirmed),
                bonus_applied=total("bonus_applied", confirmed),
                total_credited=total("total_credited", confirmed),
            ),
        }
        rows = rows.annotate(username=F("user__username"), payment_source=Case(
            When(method="mock", then=Value("simulation")),
            When(external_id="", then=Value("unidentified")),
            default=Value("gateway"), output_field=CharField(),
        )).order_by("-created_at", "-pk").values(
            "id", "username", "amount", "currency", "coins", "bonus_applied", "total_credited",
            "status", "method", "payment_source", "created_at", "paid_at",
        )
        result = page_result(rows, summary, data)
        for row in result.results:
            row["id"] = str(row["id"])
        return result
