from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.server.application.use_cases import (
    GetRankingInput,
    GetRankingUseCase,
    GetServerInfoUseCase,
    GetServerStatusInput,
    GetServerStatusUseCase,
    RunPublicLineageQueryInput,
    RunPublicLineageQueryUseCase,
)
from apps.server.presentation.serializers import RankingEntrySerializer, ServerInfoSerializer, ServerStatusSerializer
from common.views import InjectedAPIView


class ServerInfoView(InjectedAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(tags=["Servidor"], responses=ServerInfoSerializer)
    def get(self, request):
        info = self.resolve(GetServerInfoUseCase).execute()
        return Response(ServerInfoSerializer(info).data)


class ServerStatusView(InjectedAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(tags=["Servidor"], responses=ServerStatusSerializer)
    def get(self, request):
        status = self.resolve(GetServerStatusUseCase).execute(GetServerStatusInput())
        return Response(ServerStatusSerializer(status).data)


class RankingView(InjectedAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(tags=["Servidor"], responses=RankingEntrySerializer(many=True))
    def get(self, request, kind: str):
        limit = int(request.query_params.get("limit", 10))
        entries = self.resolve(GetRankingUseCase).execute(GetRankingInput(kind=kind, limit=min(limit, 50)))
        return Response(RankingEntrySerializer(entries, many=True).data)


def dump_sql_row(row: dict) -> dict:
    payload = {}
    for key, value in row.items():
        if hasattr(value, "isoformat"):
            payload[key] = value.isoformat()
        elif isinstance(value, bytes):
            continue
        elif isinstance(value, (int, float, str, bool)) or value is None:
            payload[key] = value
        else:
            payload[key] = str(value)
    return payload


class PublicLineageQueryView(InjectedAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(tags=["Servidor"])
    def get(self, request, name: str):
        params = {key: value for key, value in request.query_params.items()}
        rows = self.resolve(RunPublicLineageQueryUseCase).execute(
            RunPublicLineageQueryInput(name=name, params=params)
        )
        return Response([dump_sql_row(row) for row in rows])
