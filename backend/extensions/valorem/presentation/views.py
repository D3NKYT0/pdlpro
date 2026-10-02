from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from extensions.surface import InjectedAPIView
from extensions.valorem.application.use_cases import GetValoremWikiStatusUseCase


class ValoremWikiStatusView(InjectedAPIView):
    """Retorna o status e resumo dos dados da wiki do Valorem."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        status = self.resolve(GetValoremWikiStatusUseCase).execute()
        return Response({
            "ok": True,
            "active": status.active,
            "version": status.version,
            "total_items": status.total_items,
            "total_bosses": status.total_bosses,
            "total_skills": status.total_skills,
        })
