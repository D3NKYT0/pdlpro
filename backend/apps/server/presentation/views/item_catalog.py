from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from apps.server.infrastructure.lineage.item_catalog import DEFAULT_ITEM_ICON, get_item_catalog, item_metadata


class ItemCatalogView(APIView):
    """Expõe os metadados dos itens disponíveis no catálogo composto.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny].
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(tags=["Catálogo de itens"], description="Catálogo canônico: XML + customs do banco PDL. Não consulta nem expõe o banco L2.")
    def get(self, request):
        return Response({"items": [item_metadata(item.id) for item in get_item_catalog().all()],
                         "default_icon_url": DEFAULT_ITEM_ICON},
                        headers={"Cache-Control": "public, max-age=60"})
