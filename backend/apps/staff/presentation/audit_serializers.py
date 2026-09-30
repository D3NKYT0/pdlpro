"""Serializers de filtros e resposta para o endpoint de audit log."""

from __future__ import annotations

from rest_framework import serializers


class AuditLogFiltersSerializer(serializers.Serializer):
    """Query params de filtragem para a listagem de audit logs."""

    actor = serializers.CharField(required=False, default="")
    action = serializers.CharField(required=False, default="")
    method = serializers.CharField(required=False, default="")
    status_min = serializers.IntegerField(required=False, default=None)
    status_max = serializers.IntegerField(required=False, default=None)
    date_from = serializers.DateTimeField(required=False, default=None)
    date_to = serializers.DateTimeField(required=False, default=None)
    search = serializers.CharField(required=False, default="")
    page = serializers.IntegerField(required=False, default=1, min_value=1)
    page_size = serializers.IntegerField(required=False, default=25, min_value=1, max_value=100)


class AuditLogEntrySerializer(serializers.Serializer):
    """Serialização de uma entrada do log de auditoria."""

    id = serializers.IntegerField()
    actor_id = serializers.IntegerField(allow_null=True)
    actor_username = serializers.CharField()
    action = serializers.CharField()
    request_id = serializers.CharField()
    ip_address = serializers.CharField(allow_null=True)
    method = serializers.CharField()
    path = serializers.CharField()
    status_code = serializers.IntegerField()
    target_type = serializers.CharField()
    target_id = serializers.CharField()
    payload = serializers.DictField()
    created_at = serializers.DateTimeField()


class AuditLogPageSerializer(serializers.Serializer):
    """Serialização da resposta paginada de audit logs."""

    count = serializers.IntegerField()
    total_pages = serializers.IntegerField()
    results = AuditLogEntrySerializer(many=True)
