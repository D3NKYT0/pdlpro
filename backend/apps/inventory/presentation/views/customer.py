from dataclasses import asdict

from django.utils.translation import gettext_lazy
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.inventory.application.use_cases import (
    DepositItemInput,
    DepositItemUseCase,
    InventoryActor,
    ListCharacterEquipmentUseCase,
    ListGameItemsUseCase,
    SyncInventoriesUseCase,
    TradeItemInput,
    TradeItemUseCase,
    WithdrawItemInput,
    WithdrawItemUseCase,
)
from apps.inventory.presentation.serializers import (
    DepositSerializer,
    TradeSerializer,
    WithdrawSerializer,
)
from apps.server.application.item_catalog_use_cases import (
    ItemIsTradeableUseCase,
    ItemTradeableInput,
)
from apps.server.presentation.item_metadata import ItemCatalogAPIView


def inventory_actor(request, login: str = "") -> InventoryActor:
    return InventoryActor(
        user_id=request.user.id,
        username=request.user.username,
        login=login or request.user.username,
    )


def dump_item(item) -> dict:
    payload = asdict(item)
    payload["id"] = str(payload["id"])
    payload["inventory_id"] = str(payload["inventory_id"])
    return payload


class InventoryDashboardView(ItemCatalogAPIView):
    """Entrada HTTP para ``SyncInventoriesUseCase``.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Inventário"],
        summary=gettext_lazy("Painel de inventários"),
        description=gettext_lazy("Sincroniza e retorna os inventários dos personagens acessíveis ao usuário autenticado."),
    )
    def get(self, request):
        login = request.query_params.get("login") or request.user.username
        rows = self.resolve(SyncInventoriesUseCase).execute(inventory_actor(request, login))
        payload = []
        for row in rows:
            inventory = row["inventory"]
            char = row["character"]
            payload.append(
                {
                    "inventory_id": str(inventory.id),
                    "character_name": inventory.character_name,
                    "account_name": inventory.account_name,
                    "character": asdict(char),
                    "items": [dump_item(item) for item in row["items"]],
                }
            )
        return Response(payload)


class CharacterItemsView(ItemCatalogAPIView):
    """Entrada HTTP para ``ListGameItemsUseCase``.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Inventário"],
        summary=gettext_lazy("Itens do personagem"),
        description=gettext_lazy("Lista os itens do personagem informado, indicando quais são negociáveis."),
    )
    def get(self, request, char_id: int):
        login = request.query_params.get("login") or request.user.username
        items = self.resolve(ListGameItemsUseCase).execute((inventory_actor(request, login), char_id))
        payload = []
        tradeable = self.resolve(ItemIsTradeableUseCase)
        for item in items:
            row = asdict(item)
            row["tradeable"] = tradeable.execute(ItemTradeableInput(item_id=item.item_id))
            payload.append(row)
        return Response(payload)


class CharacterEquipmentView(ItemCatalogAPIView):
    """Entrada HTTP para ``ListCharacterEquipmentUseCase``.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Inventário"],
        summary=gettext_lazy("Equipamentos do personagem"),
        description=gettext_lazy("Lista os equipamentos atualmente vestidos pelo personagem informado."),
    )
    def get(self, request, char_id: int):
        login = request.query_params.get("login") or request.user.username
        items = self.resolve(ListCharacterEquipmentUseCase).execute((inventory_actor(request, login), char_id))
        return Response([asdict(item) for item in items])


class WithdrawItemView(ItemCatalogAPIView):
    """Entrada HTTP para ``WithdrawItemUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Inventário"],
        summary=gettext_lazy("Retirar item"),
        description=gettext_lazy("Retira um item do personagem no jogo para o inventário do painel."),
        request=WithdrawSerializer,
    )
    def post(self, request):
        serializer = WithdrawSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        item = self.resolve(WithdrawItemUseCase).execute(
            WithdrawItemInput(
                actor=inventory_actor(request, data.get("login") or ""),
                char_id=data["char_id"],
                item_id=data["item_id"],
                quantity=data["quantity"],
            )
        )
        return Response(dump_item(item))


class DepositItemView(ItemCatalogAPIView):
    """Entrada HTTP para ``DepositItemUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Inventário"],
        summary=gettext_lazy("Depositar item"),
        description=gettext_lazy("Deposita um item do inventário do painel de volta ao personagem no jogo."),
        request=DepositSerializer,
    )
    def post(self, request):
        serializer = DepositSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        self.resolve(DepositItemUseCase).execute(
            DepositItemInput(
                actor=inventory_actor(request, data.get("login") or ""),
                inventory_id=data["inventory_id"],
                item_id=data["item_id"],
                quantity=data["quantity"],
                enchant=data["enchant"],
            )
        )
        return Response({"ok": True})


class TradeItemView(ItemCatalogAPIView):
    """Entrada HTTP para ``TradeItemUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Inventário"],
        summary=gettext_lazy("Transferir item entre inventários"),
        description=gettext_lazy("Transfere um item entre inventários do painel pertencentes ao usuário autenticado."),
        request=TradeSerializer,
    )
    def post(self, request):
        serializer = TradeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        self.resolve(TradeItemUseCase).execute(
            TradeItemInput(
                user_id=request.user.id,
                origin_inventory_id=data["origin_inventory_id"],
                destination_inventory_id=data["destination_inventory_id"],
                item_id=data["item_id"],
                quantity=data["quantity"],
                enchant=data["enchant"],
            )
        )
        return Response({"ok": True})
