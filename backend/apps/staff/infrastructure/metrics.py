"""Adaptador ORM para agregação de métricas do dashboard staff."""

from __future__ import annotations

import logging
from datetime import timedelta

from django.db import DatabaseError
from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from apps.staff.domain.metrics import (
    IMetricsRepository,
    MetricsDashboard,
    MetricSeries,
    RecentAuditEntry,
)
from apps.staff.infrastructure.models import AuditLog

logger = logging.getLogger(__name__)


class DjangoMetricsRepository(IMetricsRepository):
    """Agrega KPIs do sistema via queries Django ORM."""

    def get_dashboard(self) -> MetricsDashboard:
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        last_24h = now - timedelta(hours=24)
        last_7d = now - timedelta(days=7)

        User = self._get_user_model()

        # ── Contadores ────────────────────────────────────────────
        registrations_today = User.objects.filter(created_at__gte=today_start).count()
        logins_today = User.objects.filter(last_login__gte=today_start).count()
        active_users_24h = User.objects.filter(last_login__gte=last_24h).count()
        total_users = User.objects.count()

        # ── Receita e pedidos ─────────────────────────────────────
        revenue_today_brl, total_orders, pending_orders = self._payment_metrics(today_start)

        # ── Webhooks falhos ───────────────────────────────────────
        failed_webhooks_24h = self._failed_webhooks(last_24h)

        # ── Audit ─────────────────────────────────────────────────
        audit_events_24h = AuditLog.objects.filter(created_at__gte=last_24h).count()

        recent_audit = [
            RecentAuditEntry(
                actor_username=getattr(row.actor, "username", "") if row.actor else "",
                action=row.action,
                status_code=row.status_code,
                created_at=row.created_at,
            )
            for row in AuditLog.objects.select_related("actor").order_by("-created_at")[:10]
        ]

        top_actions = [
            MetricSeries(label=row["action"], value=row["total"])
            for row in (
                AuditLog.objects.filter(created_at__gte=last_24h)
                .values("action")
                .annotate(total=Count("id"))
                .order_by("-total")[:10]
            )
        ]

        # ── Séries (7 dias) ───────────────────────────────────────
        registrations_series = self._daily_series(
            User.objects.filter(created_at__gte=last_7d),
            date_field="created_at",
        )

        revenue_series = self._revenue_series(last_7d)

        return MetricsDashboard(
            registrations_today=registrations_today,
            logins_today=logins_today,
            revenue_today_brl=revenue_today_brl,
            active_users_24h=active_users_24h,
            total_users=total_users,
            total_orders=total_orders,
            pending_orders=pending_orders,
            failed_webhooks_24h=failed_webhooks_24h,
            audit_events_24h=audit_events_24h,
            registrations_series=registrations_series,
            revenue_series=revenue_series,
            recent_audit=recent_audit,
            top_actions=top_actions,
        )

    # ── Helpers ────────────────────────────────────────────────────

    @staticmethod
    def _get_user_model():
        from django.contrib.auth import get_user_model

        return get_user_model()

    @staticmethod
    def _payment_metrics(today_start):
        """Calcula métricas de pagamento de forma segura (tabela pode não existir)."""
        try:
            from apps.payment.infrastructure.models import PedidoPagamento

            revenue_agg = (
                PedidoPagamento.objects.filter(
                    status="confirmed", created_at__gte=today_start
                ).aggregate(total=Sum("amount"))
            )
            revenue_today_brl = float(revenue_agg["total"] or 0)
            total_orders = PedidoPagamento.objects.count()
            pending_orders = PedidoPagamento.objects.filter(status="pending").count()
        except (DatabaseError, ImportError, AttributeError):
            logger.debug("Payment metrics unavailable", exc_info=True)
            revenue_today_brl = 0.0
            total_orders = 0
            pending_orders = 0
        return revenue_today_brl, total_orders, pending_orders

    @staticmethod
    def _failed_webhooks(since):
        try:
            from apps.payment.infrastructure.models import WebhookLog

            return WebhookLog.objects.filter(
                created_at__gte=since
            ).filter(
                Q(payload__has_key="error") | Q(kind__icontains="fail")
            ).count()
        except (DatabaseError, ImportError, AttributeError):
            return 0

    @staticmethod
    def _daily_series(qs, *, date_field: str) -> list[MetricSeries]:
        rows = (
            qs.annotate(day=TruncDate(date_field))
            .values("day")
            .annotate(total=Count("id"))
            .order_by("day")
        )
        return [
            MetricSeries(label=row["day"].isoformat() if row["day"] else "", value=row["total"])
            for row in rows
        ]

    @staticmethod
    def _revenue_series(since) -> list[MetricSeries]:
        try:
            from apps.payment.infrastructure.models import PedidoPagamento

            rows = (
                PedidoPagamento.objects.filter(status="confirmed", created_at__gte=since)
                .annotate(day=TruncDate("created_at"))
                .values("day")
                .annotate(total=Sum("amount"))
                .order_by("day")
            )
            return [
                MetricSeries(
                    label=row["day"].isoformat() if row["day"] else "",
                    value=float(row["total"] or 0),
                )
                for row in rows
            ]
        except (DatabaseError, ImportError, AttributeError):
            return []
