from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.server.application.use_cases import GetRankingInput, GetRankingUseCase, GetServerStatusInput, GetServerStatusUseCase
from apps.server.presentation.serializers import RankingEntrySerializer, ServerStatusSerializer
from common.views import InjectedAPIView


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
