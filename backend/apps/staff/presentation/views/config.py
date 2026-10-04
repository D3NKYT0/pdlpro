from django.utils.translation import gettext_lazy
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.games.application.staff_autoconfig import BootstrapStaffGamesUseCase
from apps.server.presentation.item_metadata import ItemCatalogAPIView
from apps.shop.application.staff_autoconfig import BootstrapStaffShopUseCase
from apps.staff.application.use_cases import (
    DeleteStaffBonusTierUseCase,
    DeleteStaffChargeCurrencyUseCase,
    DeleteStaffCoinPackageUseCase,
    GetPanelSettingsUseCase,
    GetStaffCoinConfigUseCase,
    GetStaffWalletPromoUseCase,
    ListStaffBonusTiersUseCase,
    ListStaffChargeCurrenciesUseCase,
    ListStaffCoinPackagesUseCase,
    ListStaffGamesUseCase,
    ListStaffNewsUseCase,
    ListStaffServicePricesUseCase,
    ListStaffShopItemsUseCase,
    PreviewStaffBonusSimulationUseCase,
    ToggleStaffGameUseCase,
    UpdatePanelSettingsUseCase,
    UpdateStaffCoinConfigUseCase,
    UpdateStaffWalletPromoUseCase,
    UpsertStaffBonusTierUseCase,
    UpsertStaffChargeCurrencyUseCase,
    UpsertStaffCoinPackageUseCase,
    UpsertStaffNewsUseCase,
    UpsertStaffServicePricesUseCase,
    UpsertStaffShopItemUseCase,
)
from common.permissions import HasCapability
from common.views import InjectedAPIView


class StaffPanelSettingsView(InjectedAPIView):
    """Entrada HTTP para ``GetPanelSettingsUseCase``, ``UpdatePanelSettingsUseCase``.

    Implementa GET, PUT; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated, HasCapability]. Resolve a aplicação no escopo da requisição
    antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated, HasCapability]
    required_capabilities = {'GET': 'settings.view', 'PUT': 'settings.manage'}

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
    declarado: [IsAuthenticated, HasCapability]. Resolve a aplicação no escopo da requisição
    antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated, HasCapability]
    required_capabilities = {'GET': 'commerce.view', 'PUT': 'commerce.manage'}

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
    declarado: [IsAuthenticated, HasCapability]. Resolve a aplicação no escopo da requisição
    antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated, HasCapability]
    required_capabilities = {'GET': 'finance.view', 'PUT': 'finance.manage'}

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
    declarado: [IsAuthenticated, HasCapability]. Resolve a aplicação no escopo da requisição
    antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated, HasCapability]
    required_capabilities = {'GET': 'finance.view', 'PUT': 'finance.manage'}

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


class StaffBonusTiersView(InjectedAPIView):
    """Entrada HTTP para faixas progressivas de bônus de recarga."""

    permission_classes = [IsAuthenticated, HasCapability]
    required_capabilities = {'GET': 'finance.view', 'POST': 'finance.manage', 'PUT': 'finance.manage', 'DELETE': 'finance.manage'}

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Listar faixas de bônus"),
        description=gettext_lazy("Lista todas as faixas progressivas de bônus de recarga ordenadas."),
    )
    def get(self, request):
        return Response(self.resolve(ListStaffBonusTiersUseCase).execute())

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Criar ou atualizar faixa de bônus"),
        description=gettext_lazy("Cria ou atualiza uma faixa progressiva de bônus de recarga."),
    )
    def post(self, request):
        return Response(self.resolve(UpsertStaffBonusTierUseCase).execute(request.data or {}))

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Atualizar faixa de bônus"),
        description=gettext_lazy("Atualiza uma faixa progressiva de bônus de recarga existente pelo ID."),
    )
    def put(self, request):
        return Response(self.resolve(UpsertStaffBonusTierUseCase).execute(request.data or {}))

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Excluir faixa de bônus"),
        description=gettext_lazy("Remove a faixa de bônus informada por ID."),
    )
    def delete(self, request):
        tier_id = str((request.data or {}).get("id") or request.query_params.get("id") or "")
        return Response(self.resolve(DeleteStaffBonusTierUseCase).execute(tier_id))


class StaffBonusSimulationView(InjectedAPIView):
    """Entrada HTTP para simulação em tempo real do cálculo de bônus."""

    permission_classes = [IsAuthenticated, HasCapability]
    required_capabilities = {'POST': 'finance.view'}

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Simular cálculo de bônus"),
        description=gettext_lazy("Simula a aplicação de faixas, promoção, PIX e 1ª recarga sem persistência."),
    )
    def post(self, request):
        return Response(self.resolve(PreviewStaffBonusSimulationUseCase).execute(request.data or {}))


class StaffCoinPackagesView(InjectedAPIView):
    """Entrada HTTP para ``ListStaffCoinPackagesUseCase``, ``UpsertStaffCoinPackageUseCase``,
    ``DeleteStaffCoinPackageUseCase``.

    Implementa GET, POST, PUT, DELETE; registre ``as_view()`` nas URLs do módulo. Controle de
    acesso declarado: [IsAuthenticated, HasCapability].
    """

    permission_classes = [IsAuthenticated, HasCapability]
    required_capabilities = {'GET': 'finance.view', 'POST': 'finance.manage', 'PUT': 'finance.manage', 'DELETE': 'finance.manage'}

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Listar pacotes de recarga"),
        description=gettext_lazy("Lista os pacotes de moedas da carteira, inclusive inativos."),
    )
    def get(self, request):
        return Response(self.resolve(ListStaffCoinPackagesUseCase).execute())

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Criar pacote de recarga"),
        description=gettext_lazy("Cria um pacote de moedas com preços em BRL e USD."),
    )
    def post(self, request):
        return Response(self.resolve(UpsertStaffCoinPackageUseCase).execute(request.data or {}))

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Atualizar pacote de recarga"),
        description=gettext_lazy("Atualiza um pacote de moedas com preços em BRL e USD."),
    )
    def put(self, request):
        return Response(self.resolve(UpsertStaffCoinPackageUseCase).execute(request.data or {}))

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Remover pacote de recarga"),
        description=gettext_lazy("Remove um pacote de moedas da carteira."),
    )
    def delete(self, request):
        return Response(self.resolve(DeleteStaffCoinPackageUseCase).execute(request.data or {}))


class StaffChargeCurrenciesView(InjectedAPIView):
    """Entrada HTTP para ``ListStaffChargeCurrenciesUseCase``, ``UpsertStaffChargeCurrencyUseCase``,
    ``DeleteStaffChargeCurrencyUseCase``.

    Implementa GET, POST, PUT, DELETE; registre ``as_view()`` nas URLs do módulo. Controle de
    acesso declarado: [IsAuthenticated, HasCapability].
    """

    permission_classes = [IsAuthenticated, HasCapability]
    required_capabilities = {'GET': 'finance.view', 'POST': 'finance.manage', 'PUT': 'finance.manage', 'DELETE': 'finance.manage'}

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Listar moedas de cobrança"),
        description=gettext_lazy("Lista as moedas de cobrança da loja, inclusive inativas."),
    )
    def get(self, request):
        return Response(self.resolve(ListStaffChargeCurrenciesUseCase).execute())

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Criar moeda de cobrança"),
        description=gettext_lazy("Cria ou atualiza uma moeda de cobrança."),
    )
    def post(self, request):
        return Response(self.resolve(UpsertStaffChargeCurrencyUseCase).execute(request.data or {}))

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Atualizar moeda de cobrança"),
        description=gettext_lazy("Atualiza uma moeda de cobrança existente."),
    )
    def put(self, request):
        return Response(self.resolve(UpsertStaffChargeCurrencyUseCase).execute(request.data or {}))

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Remover moeda de cobrança"),
        description=gettext_lazy("Remove uma moeda de cobrança."),
    )
    def delete(self, request):
        return Response(self.resolve(DeleteStaffChargeCurrencyUseCase).execute(request.data or {}))


class StaffShopItemsView(ItemCatalogAPIView):
    """Entrada HTTP para ``ListStaffShopItemsUseCase``, ``UpsertStaffShopItemUseCase``.

    Implementa GET, POST, PUT; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated, HasCapability]. Resolve a aplicação no escopo da requisição
    antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated, HasCapability]
    required_capabilities = {'GET': 'commerce.view', 'POST': 'commerce.manage', 'PUT': 'commerce.manage'}

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


class StaffShopAutoconfigView(InjectedAPIView):
    """Entrada HTTP para ``BootstrapStaffShopUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated, HasCapability]. Resolve a aplicação no escopo da requisição antes de
    montar a resposta.
    """

    permission_classes = [IsAuthenticated, HasCapability]
    required_capabilities = {'POST': 'commerce.manage'}

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Preencher loja"),
        description=gettext_lazy(
            "Cria itens e pacotes padrão de servidor low grade sem sobrescrever preços, nomes ou pacotes já definidos."
        ),
    )
    def post(self, request):
        return Response(self.resolve(BootstrapStaffShopUseCase).execute())


class StaffNewsView(InjectedAPIView):
    """Entrada HTTP para ``ListStaffNewsUseCase``, ``UpsertStaffNewsUseCase``.

    Implementa GET, POST, PUT; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated, HasCapability]. Resolve a aplicação no escopo da requisição
    antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated, HasCapability]
    required_capabilities = {'GET': 'content.view', 'POST': 'content.manage', 'PUT': 'content.manage'}

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
    declarado: [IsAuthenticated, HasCapability]. Resolve a aplicação no escopo da requisição
    antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated, HasCapability]
    required_capabilities = {'GET': 'games.view', 'PUT': 'games.manage'}

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


class StaffGamesAutoconfigView(InjectedAPIView):
    """Entrada HTTP para ``BootstrapStaffGamesUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated, HasCapability]. Resolve a aplicação no escopo da requisição antes de
    montar a resposta.
    """

    permission_classes = [IsAuthenticated, HasCapability]
    required_capabilities = {'POST': 'games.manage'}

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Preencher jogos"),
        description=gettext_lazy(
            "Cria configuração e conteúdo padrão dos minijogos sem sobrescrever nomes ou chaves já definidas."
        ),
    )
    def post(self, request):
        return Response(self.resolve(BootstrapStaffGamesUseCase).execute(request.data or {}))
