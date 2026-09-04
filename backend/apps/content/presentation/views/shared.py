from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.content.application.use_cases import ListFaqInput, ListFaqUseCase
from apps.content.infrastructure.models import Faq
from common.views import InjectedAPIView


class AuthenticatedFaqListView(InjectedAPIView):
    """Entrega ajuda pública e interna conforme a identidade autenticada da requisição."""

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Conteúdo"])
    def get(self, request):
        user = request.user
        if user.is_superuser:
            audience = Faq.Audience.SUPERADMIN
        elif user.is_staff_member:
            audience = Faq.Audience.STAFF
        else:
            audience = Faq.Audience.PUBLIC
        return Response(self.resolve(ListFaqUseCase).execute(ListFaqInput(audience=audience)))
