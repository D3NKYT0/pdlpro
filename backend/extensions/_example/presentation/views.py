from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from extensions._example.application.use_cases import PingExtensionUseCase
from extensions.surface import InjectedAPIView


class ExtensionPingView(InjectedAPIView):
    """GET de fumaça: prova AppConfig, DI e montagem de URL da extensão."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        result = self.resolve(PingExtensionUseCase).execute()
        return Response({"ok": result.ok, "extension": result.extension})
