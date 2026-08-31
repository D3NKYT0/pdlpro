from __future__ import annotations

from abc import ABC, abstractmethod
from decimal import Decimal
from uuid import UUID

from apps.marketplace.domain.entities import CharacterListingEntity


class ICharacterListingRepository(ABC):
    @abstractmethod
    def get_by_id(self, listing_id: UUID) -> CharacterListingEntity | None:
        raise NotImplementedError

    @abstractmethod
    def list_for_sale(self) -> list[CharacterListingEntity]:
        raise NotImplementedError

    @abstractmethod
    def list_by_seller(self, user_id: UUID) -> list[CharacterListingEntity]:
        raise NotImplementedError

    @abstractmethod
    def find_active_by_char(self, char_id: int) -> CharacterListingEntity | None:
        raise NotImplementedError

    @abstractmethod
    def create(
        self,
        seller_id: UUID,
        *,
        char_id: int,
        char_name: str,
        char_level: int,
        char_class: int,
        old_account: str,
        price: Decimal,
        notes: str,
    ) -> CharacterListingEntity:
        raise NotImplementedError

    @abstractmethod
    def mark_sold(self, listing_id: UUID, buyer_id: UUID, new_account: str) -> CharacterListingEntity:
        raise NotImplementedError

    @abstractmethod
    def mark_cancelled(self, listing_id: UUID) -> CharacterListingEntity:
        raise NotImplementedError
