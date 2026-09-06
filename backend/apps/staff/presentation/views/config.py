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

    @extend_schema(
        tags=["Staff"],
        summary="Consultar configurações do painel",
        description="Retorna as configurações administrativas atuais do painel.",
    )
    def get(self, request):
        return Response(self.resolve(GetPanelSettingsUseCase).execute())

    @extend_schema(
        tags=["Staff"],
        summary="Atualizar configurações do painel",
        description="Atualiza as configurações administrativas do painel com o payload informado.",
    )
    def put(self, request):
        return Response(self.resolve(UpdatePanelSettingsUseCase).execute(request.data or {}))


class StaffServicePricesView(InjectedAPIView):
    """Entrada HTTP para ``ListStaffServicePricesUseCase``, ``UpsertStaffServicePricesUseCase``.

    Implementa GET, PUT; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated, IsStaffMember]. Resolve a aplicação no escopo da requisição
    antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(
        tags=["Staff"],
        summary="Listar preços de serviços",
        description="Lista os preços dos serviços de personagem gerenciados pela equipe.",
    )
    def get(self, request):
        return Response(self.resolve(ListStaffServicePricesUseCase).execute())

    @extend_schema(
        tags=["Staff"],
        summary="Atualizar preços de serviços",
        description="Cria ou atualiza os preços dos serviços de personagem informados.",
    )
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

    @extend_schema(
        tags=["Staff"],
        summary="Consultar configuração de moedas",
        description="Retorna a configuração administrativa das moedas do painel.",
    )
    def get(self, request):
        return Response(self.resolve(GetStaffCoinConfigUseCase).execute())

    @extend_schema(
        tags=["Staff"],
        summary="Atualizar configuração de moedas",
        description="Atualiza a configuração administrativa das moedas do painel.",
    )
    def put(self, request):
        return Response(self.resolve(UpdateStaffCoinConfigUseCase).execute(request.data or {}))


class StaffShopItemsView(ItemCatalogAPIView):
    """Entrada HTTP para ``ListStaffShopItemsUseCase``, ``UpsertStaffShopItemUseCase``.

    Implementa GET, POST, PUT; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated, IsStaffMember]. Resolve a aplicação no escopo da requisição
    antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(
        tags=["Staff"],
        summary="Listar itens da loja",
        description="Lista os itens da loja gerenciados administrativamente pela equipe.",
    )
    def get(self, request):
        return Response(self.resolve(ListStaffShopItemsUseCase).execute())

    @extend_schema(
        tags=["Staff"],
        summary="Criar item da loja",
        description="Cria ou atualiza um item da loja com o payload administrativo informado.",
    )
    def post(self, request):
        return Response(self.resolve(UpsertStaffShopItemUseCase).execute(request.data or {}))

    @extend_schema(
        tags=["Staff"],
        summary="Atualizar item da loja",
        description="Atualiza um item da loja com o payload administrativo informado.",
    )
    def put(self, request):
        return Response(self.resolve(UpsertStaffShopItemUseCase).execute(request.data or {}))


class StaffNewsView(InjectedAPIView):
    """Entrada HTTP para ``ListStaffNewsUseCase``, ``UpsertStaffNewsUseCase``.

    Implementa GET, POST, PUT; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated, IsStaffMember]. Resolve a aplicação no escopo da requisição
    antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(
        tags=["Staff"],
        summary="Listar notícias",
        description="Lista as notícias gerenciadas administrativamente pela equipe.",
    )
    def get(self, request):
        return Response(self.resolve(ListStaffNewsUseCase).execute())

    @extend_schema(
        tags=["Staff"],
        summary="Criar notícia",
        description="Cria ou atualiza uma notícia com o payload administrativo informado.",
    )
    def post(self, request):
        return Response(self.resolve(UpsertStaffNewsUseCase).execute(request.data or {}))

    @extend_schema(
        tags=["Staff"],
        summary="Atualizar notícia",
        description="Atualiza uma notícia com o payload administrativo informado.",
    )
    def put(self, request):
        return Response(self.resolve(UpsertStaffNewsUseCase).execute(request.data or {}))


class StaffGamesView(InjectedAPIView):
    """Entrada HTTP para ``ListStaffGamesUseCase``, ``ToggleStaffGameUseCase``.

    Implementa GET, PUT; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated, IsStaffMember]. Resolve a aplicação no escopo da requisição
    antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(
        tags=["Staff"],
        summary="Listar jogos",
        description="Lista os jogos do painel e o estado de ativação de cada um.",
    )
    def get(self, request):
        return Response(self.resolve(ListStaffGamesUseCase).execute())

    @extend_schema(
        tags=["Staff"],
        summary="Alternar jogo",
        description="Ativa ou desativa um jogo do painel conforme o payload informado.",
    )
    def put(self, request):
        return Response(self.resolve(ToggleStaffGameUseCase).execute(request.data or {}))
