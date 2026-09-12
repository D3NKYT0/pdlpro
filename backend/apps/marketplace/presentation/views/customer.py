from dataclasses import asdict

from django.utils.translation import gettext_lazy
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.marketplace.application.use_cases import (
    CancelListingInput,
    CancelListingUseCase,
    CreateListingInput,
    CreateListingUseCase,
    ListMyListingsInput,
    ListMyListingsUseCase,
    ListPublicListingsUseCase,
    PurchaseListingInput,
    PurchaseListingUseCase,
)
from apps.marketplace.domain.entities import CharacterListingEntity
from apps.marketplace.presentation.serializers import CreateListingSerializer
from apps.server.domain.skill_catalog import ISkillCatalog
from apps.server.presentation.item_metadata import ItemCatalogAPIView
from apps.server.presentation.skill_metadata import dump_learned_skill


def dump_listing(listing: CharacterListingEntity, skill_catalog: ISkillCatalog) -> dict:
    payload = asdict(listing)
    payload["id"] = str(payload["id"])
    payload["seller_id"] = str(payload["seller_id"])
    payload["buyer_id"] = str(payload["buyer_id"]) if payload["buyer_id"] else None
    payload["price"] = str(payload["price"])
    payload["skills"] = [
        dump_learned_skill(
            int(row.get("skill_id") or 0),
            int(row.get("level") or 1),
            int(row.get("class_index") or 0),
            skill_catalog,
        )
        for row in payload.get("skills") or []
        if row.get("skill_id")
    ]
    return payload


class PublicMarketplaceView(ItemCatalogAPIView):
    """Entrada HTTP para ``ListPublicListingsUseCase``.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Marketplace"],
        summary=gettext_lazy("Listar anúncios públicos"),
        description=gettext_lazy("Lista os anúncios de personagens disponíveis publicamente no marketplace."),
    )
    def get(self, request):
        listings = self.resolve(ListPublicListingsUseCase).execute(None)
        catalog = self.resolve(ISkillCatalog)
        return Response([dump_listing(listing, catalog) for listing in listings])


class MyListingsView(ItemCatalogAPIView):
    """Entrada HTTP para ``ListMyListingsUseCase``, ``CreateListingUseCase``.

    Implementa GET, POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a
    resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Marketplace"],
        summary=gettext_lazy("Listar meus anúncios"),
        description=gettext_lazy("Lista os anúncios de personagens criados pelo usuário autenticado."),
    )
    def get(self, request):
        listings = self.resolve(ListMyListingsUseCase).execute(ListMyListingsInput(user_id=request.user.id))
        catalog = self.resolve(ISkillCatalog)
        return Response([dump_listing(listing, catalog) for listing in listings])

    @extend_schema(
        tags=["Marketplace"],
        summary=gettext_lazy("Criar anúncio"),
        description=gettext_lazy("Cria um anúncio de personagem no marketplace para o usuário autenticado."),
        request=CreateListingSerializer,
    )
    def post(self, request):
        serializer = CreateListingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        listing = self.resolve(CreateListingUseCase).execute(
            CreateListingInput(
                user_id=request.user.id,
                username=request.user.username,
                login=data.get("login") or request.user.username,
                char_id=data["char_id"],
                price=data["price"],
                notes=data.get("notes") or "",
            )
        )
        return Response(dump_listing(listing, self.resolve(ISkillCatalog)))


class PurchaseListingView(ItemCatalogAPIView):
    """Entrada HTTP para ``PurchaseListingUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Marketplace"],
        summary=gettext_lazy("Comprar anúncio"),
        description=gettext_lazy("Compra o anúncio de personagem informado em nome do usuário autenticado."),
    )
    def post(self, request, listing_id):
        listing = self.resolve(PurchaseListingUseCase).execute(
            PurchaseListingInput(
                buyer_id=request.user.id,
                buyer_username=request.user.username,
                listing_id=listing_id,
            )
        )
        return Response(dump_listing(listing, self.resolve(ISkillCatalog)))


class CancelListingView(ItemCatalogAPIView):
    """Entrada HTTP para ``CancelListingUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Marketplace"],
        summary=gettext_lazy("Cancelar anúncio"),
        description=gettext_lazy("Cancela o anúncio de personagem informado pertencente ao usuário autenticado."),
    )
    def post(self, request, listing_id):
        listing = self.resolve(CancelListingUseCase).execute(
            CancelListingInput(user_id=request.user.id, listing_id=listing_id)
        )
        return Response(dump_listing(listing, self.resolve(ISkillCatalog)))
