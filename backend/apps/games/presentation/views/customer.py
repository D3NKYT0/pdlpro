from django.utils.translation import gettext_lazy
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.games.application.advanced_use_cases import ClaimDailyBonusOrSeasonUseCase
from apps.games.application.battle_pass_use_cases import (
    BuyBattlePassPremiumInput,
    BuyBattlePassPremiumUseCase,
    ClaimBattlePassRewardInput,
    ClaimBattlePassRewardUseCase,
    GetBattlePassUseCase,
)
from apps.games.application.box_use_cases import (
    BuyBoxInput,
    BuyBoxUseCase,
    ListBoxTypesUseCase,
    OpenBoxInput,
    OpenBoxUseCase,
    TransferBagInput,
    TransferBagToInventoryUseCase,
)
from apps.games.application.economy_use_cases import (
    EnchantWeaponInput,
    EnchantWeaponUseCase,
    FightMonsterInput,
    FightMonsterUseCase,
    GetEconomyStateUseCase,
)
from apps.games.application.fishing_use_cases import (
    CastLineInput,
    CastLineUseCase,
    GetFishingStateUseCase,
)
from apps.games.application.minigame_use_cases import (
    GetMinigamesStateUseCase,
    PlayDiceInput,
    PlayDiceUseCase,
    SpinSlotsInput,
    SpinSlotsUseCase,
)
from apps.games.application.use_cases import (
    BuyTokensInput,
    BuyTokensUseCase,
    ClaimDailyBonusInput,
    GetBagUseCase,
    GetDailyBonusStateUseCase,
    GetRouletteStateUseCase,
    SpinRouletteInput,
    SpinRouletteUseCase,
)
from apps.games.presentation.serializers import (
    BuyBoxSerializer,
    BuyTokensSerializer,
    PlayDiceSerializer,
    TransferBagSerializer,
)
from apps.server.presentation.item_metadata import ItemCatalogAPIView


class RouletteView(ItemCatalogAPIView):
    """Entrada HTTP para ``GetRouletteStateUseCase``, ``SpinRouletteUseCase``.

    Implementa GET, POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a
    resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Jogos"],
        summary=gettext_lazy("Estado da roleta"),
        description=gettext_lazy("Retorna o estado atual da roleta para o jogador autenticado."),
    )
    def get(self, request):
        return Response(self.resolve(GetRouletteStateUseCase).execute(request.user.id))

    @extend_schema(
        tags=["Jogos"],
        summary=gettext_lazy("Girar a roleta"),
        description=gettext_lazy("Executa um giro da roleta e devolve o resultado para o jogador autenticado."),
    )
    def post(self, request):
        return Response(self.resolve(SpinRouletteUseCase).execute(SpinRouletteInput(user_id=request.user.id)))


class BuyTokensView(ItemCatalogAPIView):
    """Entrada HTTP para ``BuyTokensUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Jogos"],
        summary=gettext_lazy("Comprar fichas"),
        description=gettext_lazy("Compra a quantidade informada de fichas para uso nos jogos do painel."),
        request=BuyTokensSerializer,
    )
    def post(self, request):
        serializer = BuyTokensSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(
            self.resolve(BuyTokensUseCase).execute(
                BuyTokensInput(user_id=request.user.id, amount=serializer.validated_data["amount"])
            )
        )


class DailyBonusView(ItemCatalogAPIView):
    """Entrada HTTP para ``GetDailyBonusStateUseCase``, ``ClaimDailyBonusOrSeasonUseCase``.

    Implementa GET, POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a
    resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Jogos"],
        summary=gettext_lazy("Estado do bônus diário"),
        description=gettext_lazy("Retorna o estado do bônus diário disponível para o jogador autenticado."),
    )
    def get(self, request):
        return Response(self.resolve(GetDailyBonusStateUseCase).execute(request.user.id))

    @extend_schema(
        tags=["Jogos"],
        summary=gettext_lazy("Resgatar bônus diário"),
        description=gettext_lazy("Resgata o bônus diário ativo, priorizando a temporada diária quando existir."),
    )
    def post(self, request):
        return Response(
            self.resolve(ClaimDailyBonusOrSeasonUseCase).execute(
                ClaimDailyBonusInput(user_id=request.user.id)
            )
        )


class BagView(ItemCatalogAPIView):
    """Entrada HTTP para ``GetBagUseCase``, ``TransferBagToInventoryUseCase``.

    Implementa GET, POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a
    resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Jogos"],
        summary=gettext_lazy("Consultar bolsa"),
        description=gettext_lazy("Lista o conteúdo da bolsa de jogos do jogador autenticado."),
    )
    def get(self, request):
        return Response(self.resolve(GetBagUseCase).execute(request.user.id))

    @extend_schema(
        tags=["Jogos"],
        summary=gettext_lazy("Transferir bolsa"),
        description=gettext_lazy("Transfere o conteúdo da bolsa para o inventário de personagem informado."),
        request=TransferBagSerializer,
    )
    def post(self, request):
        serializer = TransferBagSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(
            self.resolve(TransferBagToInventoryUseCase).execute(
                TransferBagInput(user_id=request.user.id, inventory_id=serializer.validated_data["inventory_id"])
            )
        )


class BoxListView(ItemCatalogAPIView):
    """Entrada HTTP para ``ListBoxTypesUseCase``, ``BuyBoxUseCase``.

    Implementa GET, POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a
    resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Jogos"],
        summary=gettext_lazy("Listar caixas"),
        description=gettext_lazy("Lista os tipos de caixas disponíveis para compra pelo jogador autenticado."),
    )
    def get(self, request):
        return Response(self.resolve(ListBoxTypesUseCase).execute(request.user.id))

    @extend_schema(
        tags=["Jogos"],
        summary=gettext_lazy("Comprar caixa"),
        description=gettext_lazy("Compra uma caixa do tipo informado para o jogador autenticado."),
        request=BuyBoxSerializer,
    )
    def post(self, request):
        serializer = BuyBoxSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(
            self.resolve(BuyBoxUseCase).execute(
                BuyBoxInput(user_id=request.user.id, box_type_id=serializer.validated_data["box_type_id"])
            )
        )


class OpenBoxView(ItemCatalogAPIView):
    """Entrada HTTP para ``OpenBoxUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Jogos"],
        summary=gettext_lazy("Abrir caixa"),
        description=gettext_lazy("Abre a caixa identificada e devolve as recompensas obtidas."),
    )
    def post(self, request, box_id):
        return Response(self.resolve(OpenBoxUseCase).execute(OpenBoxInput(user_id=request.user.id, box_id=box_id)))


class MinigamesView(ItemCatalogAPIView):
    """Entrada HTTP para ``GetMinigamesStateUseCase``.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Jogos"],
        summary=gettext_lazy("Estado dos minijogos"),
        description=gettext_lazy("Retorna o estado consolidado dos minijogos disponíveis para o jogador."),
    )
    def get(self, request):
        return Response(self.resolve(GetMinigamesStateUseCase).execute(request.user.id))


class DiceView(ItemCatalogAPIView):
    """Entrada HTTP para ``PlayDiceUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Jogos"],
        summary=gettext_lazy("Jogar dados"),
        description=gettext_lazy("Executa uma jogada de dados com os parâmetros informados e devolve o resultado."),
        request=PlayDiceSerializer,
    )
    def post(self, request):
        serializer = PlayDiceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(
            self.resolve(PlayDiceUseCase).execute(
                PlayDiceInput(user_id=request.user.id, **serializer.validated_data)
            )
        )


class SlotsView(ItemCatalogAPIView):
    """Entrada HTTP para ``SpinSlotsUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Jogos"],
        summary=gettext_lazy("Girar caça-níqueis"),
        description=gettext_lazy("Executa um giro no caça-níqueis e devolve o resultado para o jogador autenticado."),
    )
    def post(self, request):
        return Response(self.resolve(SpinSlotsUseCase).execute(SpinSlotsInput(user_id=request.user.id)))


class FishingView(ItemCatalogAPIView):
    """Entrada HTTP para ``GetFishingStateUseCase``, ``CastLineUseCase``.

    Implementa GET, POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a
    resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Jogos"],
        summary=gettext_lazy("Estado da pesca"),
        description=gettext_lazy("Retorna o estado atual do minijogo de pesca para o jogador autenticado."),
    )
    def get(self, request):
        return Response(self.resolve(GetFishingStateUseCase).execute(request.user.id))

    @extend_schema(
        tags=["Jogos"],
        summary=gettext_lazy("Lançar linha"),
        description=gettext_lazy("Lança a linha de pesca, opcionalmente usando uma isca, e devolve o resultado da captura."),
    )
    def post(self, request):
        from rest_framework import serializers
        bait_id = serializers.UUIDField(allow_null=True).run_validation(request.data.get("bait_id"))
        return Response(self.resolve(CastLineUseCase).execute(CastLineInput(user_id=request.user.id, bait_id=bait_id)))


class EconomyView(ItemCatalogAPIView):
    """Entrada HTTP para ``GetEconomyStateUseCase``.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Jogos"],
        summary=gettext_lazy("Estado da economia"),
        description=gettext_lazy("Retorna o estado do minijogo de economia para o jogador autenticado."),
    )
    def get(self, request):
        return Response(self.resolve(GetEconomyStateUseCase).execute(request.user.id))


class FightMonsterView(ItemCatalogAPIView):
    """Entrada HTTP para ``FightMonsterUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Jogos"],
        summary=gettext_lazy("Combater monstro"),
        description=gettext_lazy("Inicia um combate contra o monstro informado e devolve o resultado."),
    )
    def post(self, request, monster_id):
        return Response(
            self.resolve(FightMonsterUseCase).execute(
                FightMonsterInput(user_id=request.user.id, monster_id=monster_id)
            )
        )


class EnchantWeaponView(ItemCatalogAPIView):
    """Entrada HTTP para ``EnchantWeaponUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Jogos"],
        summary=gettext_lazy("Encantar arma"),
        description=gettext_lazy("Tenta encantar a arma do jogador no minijogo de economia e devolve o resultado."),
    )
    def post(self, request):
        return Response(self.resolve(EnchantWeaponUseCase).execute(EnchantWeaponInput(user_id=request.user.id)))


class BattlePassView(ItemCatalogAPIView):
    """Entrada HTTP para ``GetBattlePassUseCase``, ``BuyBattlePassPremiumUseCase``.

    Implementa GET, POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a
    resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Jogos"],
        summary=gettext_lazy("Estado do passe de batalha"),
        description=gettext_lazy("Retorna o progresso e as recompensas do passe de batalha do jogador autenticado."),
    )
    def get(self, request):
        return Response(self.resolve(GetBattlePassUseCase).execute(request.user.id))

    @extend_schema(
        tags=["Jogos"],
        summary=gettext_lazy("Comprar passe premium"),
        description=gettext_lazy("Adquire o passe de batalha premium para o jogador autenticado."),
    )
    def post(self, request):
        return Response(
            self.resolve(BuyBattlePassPremiumUseCase).execute(BuyBattlePassPremiumInput(user_id=request.user.id))
        )


class ClaimBattlePassView(ItemCatalogAPIView):
    """Entrada HTTP para ``ClaimBattlePassRewardUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Jogos"],
        summary=gettext_lazy("Resgatar recompensa do passe"),
        description=gettext_lazy("Resgata a recompensa do passe de batalha identificada pelo ID informado."),
    )
    def post(self, request, reward_id):
        return Response(
            self.resolve(ClaimBattlePassRewardUseCase).execute(
                ClaimBattlePassRewardInput(user_id=request.user.id, reward_id=reward_id)
            )
        )
