from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.staff.application.use_cases import (
    GetPanelSettingsUseCase,
    GetStaffCoinConfigUseCase,
    ListStaffGamesUseCase,
    ListStaffNewsUseCase,
    ListStaffServicePricesUseCase,
    ListStaffShopItemsUseCase,
    ToggleStaffGameUseCase,
    UpdatePanelSettingsUseCase,
    UpdateStaffCoinConfigUseCase,
    UpsertStaffNewsUseCase,
    UpsertStaffServicePricesUseCase,
    UpsertStaffShopItemUseCase,
)
from common.permissions import IsStaffMember
from common.views import InjectedAPIView
from apps.server.presentation.item_metadata import ItemCatalogAPIView


class StaffPanelSettingsView(InjectedAPIView):
    """Entrada HTTP para ``GetPanelSettingsUseCase``, ``UpdatePanelSettingsUseCase``.

    Implementa GET, PUT; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated, IsStaffMember]. Resolve a aplicação no escopo da requisição
    antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(tags=["Staff"])
    def get(self, request):
        return Response(self.resolve(GetPanelSettingsUseCase).execute())

    @extend_schema(tags=["Staff"])
    def put(self, request):
        return Response(self.resolve(UpdatePanelSettingsUseCase).execute(request.data or {}))


class StaffServicePricesView(InjectedAPIView):
    """Entrada HTTP para ``ListStaffServicePricesUseCase``, ``UpsertStaffServicePricesUseCase``.

    Implementa GET, PUT; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated, IsStaffMember]. Resolve a aplicação no escopo da requisição
    antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(tags=["Staff"])
    def get(self, request):
        return Response(self.resolve(ListStaffServicePricesUseCase).execute())

    @extend_schema(tags=["Staff"])
    def put(self, request):
        payload = request.data if isinstance(request.data, list) else request.data.get("items", [])
        return Response(self.resolve(UpsertStaffServicePricesUseCase).execute(payload))


class StaffCoinConfigView(ItemCatalogAPIView):
    """Entrada HTTP para ``GetStaffCoinConfigUseCase``, ``UpdateStaffCoinConfigUseCase``.

    Implementa GET, PUT; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated, IsStaffMember]. Resolve a aplicação no escopo da requisição
    antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(tags=["Staff"])
    def get(self, request):
        return Response(self.resolve(GetStaffCoinConfigUseCase).execute())

    @extend_schema(tags=["Staff"])
    def put(self, request):
        return Response(self.resolve(UpdateStaffCoinConfigUseCase).execute(request.data or {}))


class StaffShopItemsView(ItemCatalogAPIView):
    """Entrada HTTP para ``ListStaffShopItemsUseCase``, ``UpsertStaffShopItemUseCase``.

    Implementa GET, POST, PUT; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated, IsStaffMember]. Resolve a aplicação no escopo da requisição
    antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(tags=["Staff"])
    def get(self, request):
        return Response(self.resolve(ListStaffShopItemsUseCase).execute())

    @extend_schema(tags=["Staff"])
    def post(self, request):
        return Response(self.resolve(UpsertStaffShopItemUseCase).execute(request.data or {}))

    @extend_schema(tags=["Staff"])
    def put(self, request):
        return Response(self.resolve(UpsertStaffShopItemUseCase).execute(request.data or {}))


class StaffNewsView(InjectedAPIView):
    """Entrada HTTP para ``ListStaffNewsUseCase``, ``UpsertStaffNewsUseCase``.

    Implementa GET, POST, PUT; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated, IsStaffMember]. Resolve a aplicação no escopo da requisição
    antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(tags=["Staff"])
    def get(self, request):
        return Response(self.resolve(ListStaffNewsUseCase).execute())

    @extend_schema(tags=["Staff"])
    def post(self, request):
        return Response(self.resolve(UpsertStaffNewsUseCase).execute(request.data or {}))

    @extend_schema(tags=["Staff"])
    def put(self, request):
        return Response(self.resolve(UpsertStaffNewsUseCase).execute(request.data or {}))


class StaffGamesView(InjectedAPIView):
    """Entrada HTTP para ``ListStaffGamesUseCase``, ``ToggleStaffGameUseCase``.

    Implementa GET, PUT; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated, IsStaffMember]. Resolve a aplicação no escopo da requisição
    antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(tags=["Staff"])
    def get(self, request):
        return Response(self.resolve(ListStaffGamesUseCase).execute())

    @extend_schema(tags=["Staff"])
    def put(self, request):
        return Response(self.resolve(ToggleStaffGameUseCase).execute(request.data or {}))
