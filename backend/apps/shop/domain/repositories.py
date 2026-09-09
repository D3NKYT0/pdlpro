from __future__ import annotations

from abc import ABC, abstractmethod
from decimal import Decimal
from typing import Any
from uuid import UUID


class IShopItemAdminRepository(ABC):
    """Porta administrativa de produtos da loja (ShopItem).

    Injete nos casos de uso staff e registre o adaptador no ShopProvider.
    """

    @abstractmethod
    def list_all(self) -> list[Any]:
        """Lista todos os produtos, inclusive inativos, ordenados por nome."""

        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, item_id: UUID) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def new(self, **fields) -> Any:
        """Instancia um produto ainda não persistido."""

        raise NotImplementedError

    @abstractmethod
    def save(self, row: Any) -> Any:
        """Persiste o produto e devolve a linha salva."""

        raise NotImplementedError


class IShopRepository(ABC):
    """Porta de catálogo, pacotes, cupons e histórico de compras da loja.

    Cobre o ORM usado em ``application/use_cases.py``, ``commerce.py`` e
    ``commerce_use_cases.py`` fora do carrinho. Injete nos casos de uso e registre o
    adaptador no ShopProvider.
    """

    @abstractmethod
    def list_active_items(self) -> list[Any]:
        """Produtos ativos ordenados por nome."""

        raise NotImplementedError

    @abstractmethod
    def get_active_item(self, item_id: UUID) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def get_item(self, item_id: UUID) -> Any | None:
        """Produto por id, inclusive inativo."""

        raise NotImplementedError

    @abstractmethod
    def list_active_packages(self) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def list_all_packages(self) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def get_package(self, package_id: UUID) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def get_active_package(self, package_id: UUID) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def create_package(self, *, name: str, total_price, active: bool, items: list[dict]) -> Any:
        """Cria pacote e itens; cada entry de ``items`` tem ``item`` (modelo) e ``quantity``."""

        raise NotImplementedError

    @abstractmethod
    def save_package(self, pack: Any) -> Any:
        raise NotImplementedError

    @abstractmethod
    def replace_package_items(self, pack: Any, items: list[dict]) -> None:
        """Recria a composição; cada entry tem ``item`` (modelo) e ``quantity``."""

        raise NotImplementedError

    @abstractmethod
    def list_all_promos(self) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def get_promo(self, promo_id: UUID) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def find_active_promo_by_code(self, code: str, *, lock: bool = False) -> Any | None:
        """Cupom ativo pelo código normalizado; ``lock`` usa ``select_for_update``."""

        raise NotImplementedError

    @abstractmethod
    def promo_code_exists(self, code: str, *, exclude_id: UUID | None = None) -> bool:
        raise NotImplementedError

    @abstractmethod
    def create_promo(self, **fields) -> Any:
        raise NotImplementedError

    @abstractmethod
    def save_promo(self, promo: Any) -> Any:
        raise NotImplementedError

    @abstractmethod
    def list_purchases(self, user_id: UUID, *, limit: int = 100) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def find_purchase_by_request_key(self, user, request_key: UUID) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def create_purchase(self, **fields) -> Any:
        raise NotImplementedError


class ICartRepository(ABC):
    """Porta do carrinho (Cart, CartItem, CartPackage) e bloqueio do usuário da compra.

    Cobre o ORM de carrinho em ``application/use_cases.py``, ``commerce.py`` e
    ``commerce_use_cases.py``. Registre o adaptador no ShopProvider.
    """

    @abstractmethod
    def lock_user(self, user_id: UUID) -> Any:
        """Usuário sob ``select_for_update``; propaga DoesNotExist se ausente."""

        raise NotImplementedError

    @abstractmethod
    def require_user(self, user_id: UUID) -> Any:
        """Usuário por id sem bloqueio; propaga DoesNotExist se ausente."""

        raise NotImplementedError

    @abstractmethod
    def get_by_user_id(self, user_id: UUID) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def get_or_create_for_user(self, user) -> Any:
        raise NotImplementedError

    @abstractmethod
    def get_locked_for_user(self, user) -> Any | None:
        """Carrinho do usuário sob ``select_for_update``, ou None."""

        raise NotImplementedError

    @abstractmethod
    def lock_cart(self, cart: Any) -> Any:
        """Relê o carrinho sob ``select_for_update``."""

        raise NotImplementedError

    @abstractmethod
    def get_or_create_item(self, cart, item, *, quantity: int) -> tuple[Any, bool]:
        """Devolve ``(cart_item, created)``."""

        raise NotImplementedError

    @abstractmethod
    def get_locked_item(self, cart_item_id: UUID, user_id: UUID) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def save_item(self, row: Any) -> Any:
        raise NotImplementedError

    @abstractmethod
    def delete_item(self, row: Any) -> None:
        raise NotImplementedError

    @abstractmethod
    def set_package_quantity(self, cart, package, quantity: int) -> None:
        """Remove a linha se ``quantity == 0``; senão cria/atualiza."""

        raise NotImplementedError

    @abstractmethod
    def save_cart(self, cart: Any) -> Any:
        raise NotImplementedError

    @abstractmethod
    def clear_after_checkout(self, cart: Any) -> None:
        """Remove itens/pacotes e limpa o cupom após compra concluída."""

        raise NotImplementedError

    @abstractmethod
    def snapshot_items(self, cart: Any | None) -> list[Any]:
        """Linhas do carrinho com ``item`` selecionado, ordenadas por criação."""

        raise NotImplementedError


class ISupporterCommissionPort(ABC):
    """Porta de apoiador/comissão usada no checkout e na validação de cupons staff.

    A aplicação da loja não importa modelos de ``programs``. O adaptador (shop infra ou
    programs) concentra o ORM de Supporter/Commission. Registre no ShopProvider.
    """

    @abstractmethod
    def get_approved(self, supporter_id: UUID) -> Any | None:
        """Apoiador aprovado por id, ou None."""

        raise NotImplementedError

    @abstractmethod
    def record(self, *, supporter_id: UUID, purchase: Any, due: Decimal) -> None:
        """Bloqueia o apoiador e grava comissão quando valor e status permitem."""

        raise NotImplementedError
