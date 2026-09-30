"""Adaptador ORM para leitura do log de auditoria."""

from __future__ import annotations

import math

from django.db.models import Q

from apps.staff.domain.audit import (
    AuditLogEntry,
    AuditLogFilters,
    AuditLogPage,
    IAuditLogReadRepository,
)
from apps.staff.infrastructure.models import AuditLog


class DjangoAuditLogReadRepository(IAuditLogReadRepository):
    """Consulta ``AuditLog`` via ORM Django com filtros, busca e paginação."""

    def list(self, filters: AuditLogFilters) -> AuditLogPage:
        qs = AuditLog.objects.select_related("actor").order_by("-created_at")

        if filters.actor:
            qs = qs.filter(
                Q(actor__username__icontains=filters.actor)
                | Q(actor__email__icontains=filters.actor)
            )
        if filters.action:
            qs = qs.filter(action__icontains=filters.action)
        if filters.method:
            qs = qs.filter(method__iexact=filters.method)
        if filters.status_min is not None:
            qs = qs.filter(status_code__gte=filters.status_min)
        if filters.status_max is not None:
            qs = qs.filter(status_code__lte=filters.status_max)
        if filters.date_from:
            qs = qs.filter(created_at__gte=filters.date_from)
        if filters.date_to:
            qs = qs.filter(created_at__lte=filters.date_to)
        if filters.search:
            qs = qs.filter(
                Q(action__icontains=filters.search)
                | Q(path__icontains=filters.search)
                | Q(target_id__icontains=filters.search)
                | Q(request_id__icontains=filters.search)
                | Q(ip_address__icontains=filters.search)
            )

        count = qs.count()
        page_size = max(1, min(filters.page_size, 100))
        total_pages = max(1, math.ceil(count / page_size))
        page = max(1, min(filters.page, total_pages))
        offset = (page - 1) * page_size

        rows = qs[offset : offset + page_size]
        results = [
            AuditLogEntry(
                id=row.pk,
                actor_id=row.actor_id,
                actor_username=getattr(row.actor, "username", "") if row.actor else "",
                action=row.action,
                request_id=row.request_id,
                ip_address=row.ip_address,
                method=row.method,
                path=row.path,
                status_code=row.status_code,
                target_type=row.target_type,
                target_id=row.target_id,
                payload=row.payload or {},
                created_at=row.created_at,
            )
            for row in rows
        ]
        return AuditLogPage(count=count, total_pages=total_pages, results=results)
