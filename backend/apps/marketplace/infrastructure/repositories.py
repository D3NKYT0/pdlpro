from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from django.utils import timezone

from apps.marketplace.domain.entities import CharacterListingEntity
from apps.marketplace.domain.exceptions import ListingNotForSaleError
from apps.marketplace.domain.repositories import ICharacterListingRepository
from apps.marketplace.infrastructure.models import CharacterListing


class DjangoCharacterListingRepository(ICharacterListingRepository):
    """Adaptador Django de ``ICharacterListingRepository`` para anúncios de personagens e
    transições entre venda e cancelamento.

    Concentra consultas e escritas ORM da porta. Prefira resolver a interface pelo container; ao
    combinar alterações em uma operação de negócio, o chamador deve delimitar a transação com
    UnitOfWork.
    """

    def _entity(self, row: CharacterListing) -> CharacterListingEntity:
        return CharacterListingEntity(
            id=row.id,
            seller_id=row.seller.id,
            seller_username=row.seller.username,
            buyer_id=row.buyer.id if row.buyer_id else None,
            char_id=row.char_id,
            char_name=row.char_name,
            char_level=row.char_level,
            char_class=row.char_class,
            char_title=row.char_title,
            char_sex=row.char_sex,
            char_pvp=row.char_pvp,
            char_pk=row.char_pk,
            char_clan_name=row.char_clan_name,
            char_is_clan_leader=row.char_is_clan_leader,
            equipment=list(row.equipment or []),
            bag_items=list(row.bag_items or []),
            skills=list(row.skills or []),
            old_account=row.old_account,
            new_account=row.new_account,
            price=row.price,
            status=row.status,
            notes=row.notes,
            created_at=row.created_at,
            updated_at=row.updated_at,
            sold_at=row.sold_at,
        )

    def _queryset(self, *, lock: bool = False):
        rows = CharacterListing.objects.select_related("seller", "buyer")
        if lock:
            # ``of=("self",)`` evita FOR UPDATE no OUTER JOIN de ``buyer`` nulo (PostgreSQL).
            rows = rows.select_for_update(of=("self",))
        return rows

    def get_by_id(self, listing_id: UUID, *, lock: bool = False) -> CharacterListingEntity | None:
        try:
            row = self._queryset(lock=lock).get(id=listing_id)
        except CharacterListing.DoesNotExist:
            return None
        return self._entity(row)

    def _claim_for_sale(self, listing_id: UUID, **fields) -> CharacterListing:
        fields["updated_at"] = timezone.now()
        updated = CharacterListing.objects.filter(
            id=listing_id, status=CharacterListing.Status.FOR_SALE
        ).update(**fields)
        if not updated:
            raise ListingNotForSaleError()
        return self._queryset().get(id=listing_id)

    def list_for_sale(self) -> list[CharacterListingEntity]:
        rows = CharacterListing.objects.select_related("seller", "buyer").filter(status=CharacterListing.Status.FOR_SALE)
        return [self._entity(row) for row in rows]

    def list_by_seller(self, user_id: UUID) -> list[CharacterListingEntity]:
        rows = CharacterListing.objects.select_related("seller", "buyer").filter(seller__id=user_id)
        return [self._entity(row) for row in rows]

    def find_active_by_char(self, char_id: int) -> CharacterListingEntity | None:
        row = (
            CharacterListing.objects.select_related("seller", "buyer")
            .filter(char_id=char_id, status=CharacterListing.Status.FOR_SALE)
            .first()
        )
        return self._entity(row) if row else None

    def create(
        self,
        seller_id: UUID,
        *,
        char_id: int,
        char_name: str,
        char_level: int,
        char_class: int,
        char_title: str,
        char_sex: int,
        char_pvp: int,
        char_pk: int,
        char_clan_name: str,
        char_is_clan_leader: bool,
        equipment: list[dict],
        old_account: str,
        price: Decimal,
        notes: str,
        bag_items: list | None = None,
        skills: list | None = None,
    ) -> CharacterListingEntity:
        from django.contrib.auth import get_user_model

        seller = get_user_model().objects.get(id=seller_id)
        row = CharacterListing.objects.create(
            seller=seller,
            char_id=char_id,
            char_name=char_name,
            char_level=char_level,
            char_class=char_class,
            char_title=char_title,
            char_sex=char_sex,
            char_pvp=char_pvp,
            char_pk=char_pk,
            char_clan_name=char_clan_name,
            char_is_clan_leader=char_is_clan_leader,
            equipment=equipment,
            bag_items=bag_items or [],
            skills=skills or [],
            old_account=old_account,
            price=price,
            notes=notes,
        )
        return self._entity(row)

    def mark_sold(self, listing_id: UUID, buyer_id: UUID, new_account: str) -> CharacterListingEntity:
        from django.contrib.auth import get_user_model

        buyer = get_user_model().objects.get(id=buyer_id)
        row = self._claim_for_sale(
            listing_id,
            buyer=buyer,
            new_account=new_account,
            status=CharacterListing.Status.SOLD,
            sold_at=timezone.now(),
        )
        return self._entity(row)

    def mark_cancelled(self, listing_id: UUID) -> CharacterListingEntity:
        row = self._claim_for_sale(listing_id, status=CharacterListing.Status.CANCELLED)
        return self._entity(row)
