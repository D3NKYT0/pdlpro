from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from apps.inventory.domain.entities import InventoryItemEntity
from apps.inventory.domain.exceptions import InventoryNotFoundError, ItemBlockedError
from apps.inventory.domain.repositories import IInventoryRepository
from apps.server.domain.access import IAccountAccessService
from apps.server.domain.gateways import GameItem, ILineageGateway
from common.architecture.base import UnitOfWork, UseCase
from common.architecture.exceptions import AuthorizationError, ValidationDomainError


@dataclass(frozen=True, slots=True)
class InventoryActor:
    """Contexto do usuário e do login Lineage usado nas operações de inventário.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID
    username: str
    login: str


class SyncInventoriesUseCase(UseCase[InventoryActor, list[dict]]):
    """Sincroniza os inventários do painel com os personagens da conta acessível ao usuário.

    Uso: resolva pelo container e chame ``execute(data)`` com ``InventoryActor``. O retorno é
    ``list[dict]``.
    """

    def __init__(
        self,
        lineage: ILineageGateway,
        access: IAccountAccessService,
        inventories: IInventoryRepository,
    ) -> None:
        self._lineage = lineage
        self._access = access
        self._inventories = inventories

    def execute(self, data: InventoryActor) -> list[dict]:
        login = data.login or data.username
        if not self._access.can_access(data.user_id, data.username, login):
            raise AuthorizationError()
        result = []
        for char in self._lineage.list_characters(login):
            inventory = self._inventories.get_or_create(data.user_id, char.name, login)
            items = self._inventories.list_items(inventory.id)
            result.append({"inventory": inventory, "character": char, "items": items})
        return result


@dataclass(frozen=True, slots=True)
class WithdrawItemInput:
    """Dados de entrada de ``WithdrawItemUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    actor: InventoryActor
    char_id: int
    item_id: int
    quantity: int


class WithdrawItemUseCase(UseCase[WithdrawItemInput, InventoryItemEntity]):
    """Retira itens do personagem no jogo e os adiciona ao inventário do painel, aplicando
    verificações de acesso e registrando a movimentação.

    Uso: resolva pelo container e chame ``execute(data)`` com ``WithdrawItemInput``. O retorno é
    ``InventoryItemEntity``.
    """

    def __init__(
        self,
        lineage: ILineageGateway,
        access: IAccountAccessService,
        inventories: IInventoryRepository,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._lineage = lineage
        self._access = access
        self._inventories = inventories
        self._unit_of_work = unit_of_work

    def execute(self, data: WithdrawItemInput) -> InventoryItemEntity:
        if data.quantity < 1:
            raise ValidationDomainError("Quantidade inválida.")
        login = data.actor.login or data.actor.username
        if not self._access.can_access(data.actor.user_id, data.actor.username, login):
            raise AuthorizationError()
        if self._inventories.is_blocked(data.item_id):
            raise ItemBlockedError()
        char = self._lineage.get_character(login, data.char_id)
        if char is None:
            raise InventoryNotFoundError("Personagem não encontrado nesta conta.")
        if char.online:
            from apps.server.domain.exceptions import CharacterOfflineRequiredError

            raise CharacterOfflineRequiredError()
        with self._unit_of_work:
            withdrawn = self._lineage.withdraw_item(data.char_id, data.item_id, data.quantity)
            inventory = self._inventories.get_or_create(data.actor.user_id, char.name, login)
            item = self._inventories.add_item(
                inventory.id, withdrawn.item_id, withdrawn.name, withdrawn.quantity, withdrawn.enchant
            )
            self._inventories.log(
                data.actor.user_id,
                action="RETIROU_DO_JOGO",
                item_id=withdrawn.item_id,
                item_name=withdrawn.name,
                quantity=withdrawn.quantity,
                enchant=withdrawn.enchant,
                origin=char.name,
                destination="painel",
            )
        return item


@dataclass(frozen=True, slots=True)
class DepositItemInput:
    """Dados de entrada de ``DepositItemUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    actor: InventoryActor
    inventory_id: UUID
    item_id: int
    quantity: int
    enchant: int


class DepositItemUseCase(UseCase[DepositItemInput, None]):
    """Remove itens do inventário do painel e os entrega ao personagem no jogo, aplicando as
    verificações de acesso e registrando a movimentação.

    Uso: resolva pelo container e chame ``execute(data)`` com ``DepositItemInput``. O retorno é
    ``None``.
    """

    def __init__(
        self,
        lineage: ILineageGateway,
        access: IAccountAccessService,
        inventories: IInventoryRepository,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._lineage = lineage
        self._access = access
        self._inventories = inventories
        self._unit_of_work = unit_of_work

    def execute(self, data: DepositItemInput) -> None:
        if data.quantity < 1:
            raise ValidationDomainError("Quantidade inválida.")
        inventory = self._inventories.get_by_id(data.inventory_id, data.actor.user_id)
        if inventory is None:
            raise InventoryNotFoundError()
        login = data.actor.login or inventory.account_name
        if not self._access.can_access(data.actor.user_id, data.actor.username, login):
            raise AuthorizationError()
        with self._unit_of_work:
            removed = self._inventories.remove_item(inventory.id, data.item_id, data.quantity, data.enchant)
            self._lineage.deposit_item(inventory.character_name, data.item_id, data.quantity, data.enchant)
            self._inventories.log(
                data.actor.user_id,
                action="INSERIU_NO_JOGO",
                item_id=removed.item_id,
                item_name=removed.item_name,
                quantity=data.quantity,
                enchant=data.enchant,
                origin="painel",
                destination=inventory.character_name,
            )


@dataclass(frozen=True, slots=True)
class TradeItemInput:
    """Dados de entrada de ``TradeItemUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID
    origin_inventory_id: UUID
    destination_inventory_id: UUID
    item_id: int
    quantity: int
    enchant: int


class TradeItemUseCase(UseCase[TradeItemInput, None]):
    """Move itens entre inventários do painel e registra a transferência.

    Uso: resolva pelo container e chame ``execute(data)`` com ``TradeItemInput``. O retorno é
    ``None``.
    """

    def __init__(self, inventories: IInventoryRepository, unit_of_work: UnitOfWork) -> None:
        self._inventories = inventories
        self._unit_of_work = unit_of_work

    def execute(self, data: TradeItemInput) -> None:
        origin = self._inventories.get_by_id(data.origin_inventory_id, data.user_id)
        destination = self._inventories.get_by_id(data.destination_inventory_id, data.user_id)
        if origin is None or destination is None:
            raise InventoryNotFoundError("Ambos os inventários precisam ser seus.")
        if origin.id == destination.id:
            raise ValidationDomainError("Origem e destino não podem ser o mesmo inventário.")
        with self._unit_of_work:
            removed = self._inventories.remove_item(origin.id, data.item_id, data.quantity, data.enchant)
            self._inventories.add_item(
                destination.id, removed.item_id, removed.item_name, data.quantity, data.enchant
            )
            self._inventories.log(
                data.user_id,
                action="TROCA_ENTRE_PERSONAGENS",
                item_id=removed.item_id,
                item_name=removed.item_name,
                quantity=data.quantity,
                enchant=data.enchant,
                origin=origin.character_name,
                destination=destination.character_name,
            )


class ListGameItemsUseCase(UseCase[tuple[InventoryActor, int], list[GameItem]]):
    """Verifica acesso ao login e consulta itens do personagem pelo gateway.

    Uso: resolva pelo container e chame ``execute(data)`` com ``tuple[InventoryActor, int]``. O
    retorno é ``list[GameItem]``.
    """

    def __init__(self, lineage: ILineageGateway, access: IAccountAccessService) -> None:
        self._lineage = lineage
        self._access = access

    def execute(self, data: tuple[InventoryActor, int]) -> list[GameItem]:
        actor, char_id = data
        login = actor.login or actor.username
        if not self._access.can_access(actor.user_id, actor.username, login):
            raise AuthorizationError()
        return self._lineage.list_character_items(char_id)


class ListCharacterEquipmentUseCase(UseCase[tuple[InventoryActor, int], list[GameItem]]):
    """Confirma que o personagem pertence à conta acessível e lista os itens equipados.

    Uso: resolva pelo container e chame ``execute(data)`` com ``tuple[InventoryActor, int]``. O
    retorno é ``list[GameItem]``.
    """

    def __init__(self, lineage: ILineageGateway, access: IAccountAccessService) -> None:
        self._lineage = lineage
        self._access = access

    def execute(self, data: tuple[InventoryActor, int]) -> list[GameItem]:
        actor, char_id = data
        login = actor.login or actor.username
        if not self._access.can_access(actor.user_id, actor.username, login):
            raise AuthorizationError()
        if self._lineage.get_character(login, char_id) is None:
            raise InventoryNotFoundError("Personagem não encontrado nesta conta.")
        return self._lineage.list_character_equipment(char_id)
