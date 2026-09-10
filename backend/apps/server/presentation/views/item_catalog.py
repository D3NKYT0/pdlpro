from django.utils.translation import gettext_lazy
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.server.application.item_catalog_use_cases import ListPublicItemCatalogUseCase
from common.views import InjectedAPIView


class ItemCatalogView(InjectedAPIView):
    """Expõe os metadados dos itens disponíveis no catálogo composto."""

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        tags=["Catálogo de itens"],
        summary=gettext_lazy("Catálogo de itens"),
        description=gettext_lazy("Catálogo canônico: XML + customs do banco PDL. Não consulta nem expõe o banco L2."),
    )
    def get(self, request):
        payload = self.resolve(ListPublicItemCatalogUseCase).execute(None)
        return Response(
            payload,
            headers={"Cache-Control": "public, max-age=60"},
        )
