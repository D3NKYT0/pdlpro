from django.utils.translation import gettext_lazy
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.server.presentation.item_metadata import ItemCatalogAPIView
from apps.staff.application.use_cases import (
    GetPanelSettingsUseCase,
    GetStaffCoinConfigUseCase,
    GetStaffWalletPromoUseCase,
    ListStaffGamesUseCase,
    ListStaffNewsUseCase,
    ListStaffServicePricesUseCase,
    ListStaffShopItemsUseCase,
    ToggleStaffGameUseCase,
    UpdatePanelSettingsUseCase,
    UpdateStaffCoinConfigUseCase,
    UpdateStaffWalletPromoUseCase,
    UpsertStaffNewsUseCase,
    UpsertStaffServicePricesUseCase,
    UpsertStaffShopItemUseCase,
)
from common.permissions import IsStaffMember
from common.views import InjectedAPIView


class StaffPanelSettingsView(InjectedAPIView):
    """Entrada HTTP para ``GetPanelSettingsUseCase``, ``UpdatePanelSettingsUseCase``.

    Implementa GET, PUT; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated, IsStaffMember]. Resolve a aplicação no escopo da requisição
    antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Consultar configurações do painel"),
        description=gettext_lazy("Retorna as configurações administrativas atuais do painel."),
    )
    def get(self, request):
        return Response(self.resolve(GetPanelSettingsUseCase).execute())

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Atualizar configurações do painel"),
        description=gettext_lazy("Atualiza as configurações administrativas do painel com o payload informado."),
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
        summary=gettext_lazy("Listar preços de serviços"),
        description=gettext_lazy("Lista os preços dos serviços de personagem gerenciados pela equipe."),
    )
    def get(self, request):
        return Response(self.resolve(ListStaffServicePricesUseCase).execute())

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Atualizar preços de serviços"),
        description=gettext_lazy("Cria ou atualiza os preços dos serviços de personagem informados."),
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
        summary=gettext_lazy("Consultar configuração de moedas"),
        description=gettext_lazy("Retorna a configuração administrativa das moedas do painel."),
    )
    def get(self, request):
        return Response(self.resolve(GetStaffCoinConfigUseCase).execute())

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Atualizar configuração de moedas"),
        description=gettext_lazy("Atualiza a configuração administrativa das moedas do painel."),
    )
    def put(self, request):
        return Response(self.resolve(UpdateStaffCoinConfigUseCase).execute(request.data or {}))


class StaffWalletPromoView(InjectedAPIView):
    """Entrada HTTP para ``GetStaffWalletPromoUseCase``, ``UpdateStaffWalletPromoUseCase``.

    Implementa GET, PUT; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated, IsStaffMember]. Resolve a aplicação no escopo da requisição
    antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Consultar promoção de recarga"),
        description=gettext_lazy("Retorna a campanha promocional da carteira usada no banner e no bônus de moedas."),
    )
    def get(self, request):
        return Response(self.resolve(GetStaffWalletPromoUseCase).execute())

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Atualizar promoção de recarga"),
        description=gettext_lazy("Cria ou atualiza a campanha promocional da carteira."),
    )
    def put(self, request):
        return Response(self.resolve(UpdateStaffWalletPromoUseCase).execute(request.data or {}))


class StaffShopItemsView(ItemCatalogAPIView):
    """Entrada HTTP para ``ListStaffShopItemsUseCase``, ``UpsertStaffShopItemUseCase``.

    Implementa GET, POST, PUT; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated, IsStaffMember]. Resolve a aplicação no escopo da requisição
    antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Listar itens da loja"),
        description=gettext_lazy("Lista os itens da loja gerenciados administrativamente pela equipe."),
    )
    def get(self, request):
        return Response(self.resolve(ListStaffShopItemsUseCase).execute())

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Criar item da loja"),
        description=gettext_lazy("Cria ou atualiza um item da loja com o payload administrativo informado."),
    )
    def post(self, request):
        return Response(self.resolve(UpsertStaffShopItemUseCase).execute(request.data or {}))

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Atualizar item da loja"),
        description=gettext_lazy("Atualiza um item da loja com o payload administrativo informado."),
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
        summary=gettext_lazy("Listar notícias"),
        description=gettext_lazy("Lista as notícias gerenciadas administrativamente pela equipe."),
    )
    def get(self, request):
        return Response(self.resolve(ListStaffNewsUseCase).execute())

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Criar notícia"),
        description=gettext_lazy("Cria ou atualiza uma notícia com o payload administrativo informado."),
    )
    def post(self, request):
        return Response(self.resolve(UpsertStaffNewsUseCase).execute(request.data or {}))

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Atualizar notícia"),
        description=gettext_lazy("Atualiza uma notícia com o payload administrativo informado."),
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
        summary=gettext_lazy("Listar jogos"),
        description=gettext_lazy("Lista os jogos do painel e o estado de ativação de cada um."),
    )
    def get(self, request):
        return Response(self.resolve(ListStaffGamesUseCase).execute())

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Alternar jogo"),
        description=gettext_lazy("Ativa ou desativa um jogo do painel conforme o payload informado."),
    )
    def put(self, request):
        return Response(self.resolve(ToggleStaffGameUseCase).execute(request.data or {}))
