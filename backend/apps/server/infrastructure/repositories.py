from __future__ import annotations

from decimal import Decimal
from typing import Any
from uuid import UUID

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, Q, Sum
from django.db.models.functions import Coalesce

from apps.inventory.infrastructure.models import InventoryItem
from apps.server.domain.repositories import (
    ICharacterServiceOperationRepository,
    ICustomItemRepository,
    IIndexConfigRepository,
    IItemObservationRepository,
    ILinkSlotRepository,
    IManagedLineageAccountRepository,
    IServicePriceRepository,
)
from apps.server.infrastructure.custom_item_models import CustomCatalogItem
from apps.server.infrastructure.item_observation_models import (
    ItemObservationCategory,
    ItemObservationDetail,
    ItemObservationFavorite,
    ItemObservationSnapshot,
)
from apps.server.infrastructure.models import AccountLinkSlot, IndexConfig, ManagedLineageAccount, ServicePrice
from apps.server.infrastructure.service_models import CharacterServiceOperation

User = get_user_model()


class DjangoServicePriceRepository(IServicePriceRepository):
    """Adaptador Django de ``IServicePriceRepository`` para preços e disponibilidade dos serviços
    de personagem.

    Concentra consultas e escritas ORM da porta. Prefira resolver a interface pelo container; ao
    combinar alterações em uma operação de negócio, o chamador deve delimitar a transação com
    UnitOfWork.
    """

    def get_price(self, code: str) -> Decimal:
        row = ServicePrice.objects.filter(code=code, active=True).first()
        if row is None:
            defaults = {"CHANGE_NICKNAME": Decimal("10.00"), "CHANGE_SEX": Decimal("10.00"), "LINK_SLOT": Decimal("10.00")}
            return defaults.get(code, Decimal("0.00"))
        return row.price

    def list_all(self) -> list[ServicePrice]:
        return list(ServicePrice.objects.all())

    def upsert(self, *, code: str, name: str, price: Decimal, active: bool) -> ServicePrice:
        row, _ = ServicePrice.objects.update_or_create(
            code=code,
            defaults={"name": name, "price": price, "active": active},
        )
        return row


class DjangoLinkSlotRepository(ILinkSlotRepository):
    """Adaptador Django de ``ILinkSlotRepository`` para limites adicionais para vincular contas
    Lineage.

    Concentra consultas e escritas ORM da porta. Prefira resolver a interface pelo container; ao
    combinar alterações em uma operação de negócio, o chamador deve delimitar a transação com
    UnitOfWork.
    """

    def extra_slots(self, user_id: UUID) -> int:
        total = AccountLinkSlot.objects.filter(user__id=user_id).aggregate(total=Sum("extra_slots"))["total"]
        return int(total or 0)

    def add_slots(self, user_id: UUID, quantity: int) -> int:
        from django.contrib.auth import get_user_model

        user = get_user_model().objects.get(id=user_id)
        AccountLinkSlot.objects.create(user=user, extra_slots=quantity)
        return self.extra_slots(user_id)


class DjangoManagedLineageAccountRepository(IManagedLineageAccountRepository):
    """Adaptador Django de ``IManagedLineageAccountRepository`` para referências locais Lineage."""

    def find_for_user(self, user_id: UUID, login: str) -> ManagedLineageAccount | None:
        return ManagedLineageAccount.objects.filter(user__id=user_id, login__iexact=login).first()

    def delete_for_user(self, user_id: UUID, login: str) -> None:
        ManagedLineageAccount.objects.filter(user__id=user_id, login__iexact=login).delete()

    def delete_by_login(self, login: str) -> None:
        ManagedLineageAccount.objects.filter(login__iexact=login).delete()

    def has_primary(self, user_id: UUID) -> bool:
        return ManagedLineageAccount.objects.filter(user__id=user_id, is_primary=True).exists()

    def promote_oldest_as_primary(self, user_id: UUID) -> None:
        if self.has_primary(user_id):
            return
        extra = ManagedLineageAccount.objects.filter(user__id=user_id).order_by("created_at").first()
        if extra is None:
            return
        extra.is_primary = True
        extra.save(update_fields=["is_primary"])

    def remember(self, user_id: UUID, login: str, *, primary: bool) -> None:
        user = User.objects.get(id=user_id)
        if primary:
            ManagedLineageAccount.objects.filter(user=user, is_primary=True).exclude(login__iexact=login).update(
                is_primary=False
            )
        ManagedLineageAccount.objects.update_or_create(
            user=user,
            login=login,
            defaults={"is_primary": primary},
        )


class DjangoIndexConfigRepository(IIndexConfigRepository):
    """Adaptador Django de ``IIndexConfigRepository`` para a configuração ativa do painel."""

    def get_active(self) -> IndexConfig | None:
        return IndexConfig.objects.filter(is_active=True).order_by("-updated_at").first()

    def new(self) -> IndexConfig:
        return IndexConfig()

    def save(self, row: IndexConfig) -> IndexConfig:
        row.save()
        return row


class DjangoCustomItemRepository(ICustomItemRepository):
    """Adaptador Django de ``ICustomItemRepository`` para o catálogo de itens customizados."""

    def list_filtered(self, *, search: str = "") -> list[CustomCatalogItem]:
        rows = CustomCatalogItem.objects.all()
        if search:
            match = Q(name__icontains=search)
            if search.isascii() and search.isdigit() and len(search) <= 10:
                match |= Q(item_id=int(search))
            rows = rows.filter(match)
        return list(rows)

    def get_by_id(self, item_id: UUID) -> CustomCatalogItem | None:
        return CustomCatalogItem.objects.filter(id=item_id).first()

    def item_id_taken(self, item_id: int, *, exclude_id: UUID | None = None) -> bool:
        rows = CustomCatalogItem.objects.filter(item_id=item_id)
        if exclude_id is not None:
            rows = rows.exclude(id=exclude_id)
        return rows.exists()

    def new(self) -> CustomCatalogItem:
        return CustomCatalogItem()

    def save(self, row: CustomCatalogItem) -> CustomCatalogItem:
        from django.db import IntegrityError

        from common.architecture.exceptions import ConflictError

        try:
            row.save()
        except IntegrityError as exc:
            raise ConflictError("Este ID já está cadastrado.") from exc
        return row

    def delete_image_file(self, row: CustomCatalogItem, *, old_name: str | None) -> None:
        if row.image and row.image.name != old_name and row.image._committed:
            row.image.delete(save=False)


class DjangoItemObservationRepository(IItemObservationRepository):
    """Adaptador Django de ``IItemObservationRepository`` para observação de itens L2."""

    def list_categories(self) -> list[ItemObservationCategory]:
        return list(ItemObservationCategory.objects.all())

    def category_item_map(self) -> dict[int, str]:
        categories: dict[int, str] = {}
        for category in ItemObservationCategory.objects.all():
            for item_id in category.item_ids:
                categories.setdefault(item_id, category.name)
        return categories

    def get_category(self, category_id: UUID) -> ItemObservationCategory | None:
        return ItemObservationCategory.objects.filter(id=category_id).first()

    def create_category(self, validated_data: dict) -> ItemObservationCategory:
        return ItemObservationCategory.objects.create(**validated_data)

    def update_category(self, category_id: UUID, validated_data: dict) -> ItemObservationCategory:
        row = ItemObservationCategory.objects.get(id=category_id)
        for key, value in validated_data.items():
            setattr(row, key, value)
        row.save()
        return row

    def delete_category(self, category_id: UUID) -> bool:
        deleted, _ = ItemObservationCategory.objects.filter(id=category_id).delete()
        return bool(deleted)

    def list_favorite_item_ids(self, *, user_id: UUID, source: str) -> set[int]:
        return set(
            ItemObservationFavorite.objects.filter(user__id=user_id, source=source).values_list(
                "item_id", flat=True
            )
        )

    def set_favorite(self, *, user_id: UUID, source: str, item_id: int) -> None:
        from django.contrib.auth import get_user_model

        user = get_user_model().objects.get(id=user_id)
        ItemObservationFavorite.objects.get_or_create(user=user, source=source, item_id=item_id)

    def unset_favorite(self, *, user_id: UUID, source: str, item_id: int) -> None:
        ItemObservationFavorite.objects.filter(user__id=user_id, source=source, item_id=item_id).delete()

    def list_snapshots(self) -> list[ItemObservationSnapshot]:
        return list(ItemObservationSnapshot.objects.select_related("created_by"))

    def get_snapshot(self, snapshot_id: UUID) -> ItemObservationSnapshot | None:
        return ItemObservationSnapshot.objects.filter(id=snapshot_id).first()

    def delete_snapshot(self, snapshot_id: UUID) -> bool:
        deleted, _ = ItemObservationSnapshot.objects.filter(id=snapshot_id).delete()
        return bool(deleted)

    def snapshot_exists_for_day(self, *, source: str, snapshot_date) -> bool:
        return ItemObservationSnapshot.objects.filter(source=source, snapshot_date=snapshot_date).exists()

    def create_snapshot_with_details(
        self,
        *,
        source: str,
        snapshot_date,
        created_by: Any,
        notes: str,
        totals: dict,
        details: list[dict],
    ) -> ItemObservationSnapshot:
        from django.db import IntegrityError

        from common.architecture.exceptions import ConflictError

        try:
            with transaction.atomic():
                snapshot = ItemObservationSnapshot.objects.create(
                    source=source,
                    snapshot_date=snapshot_date,
                    created_by=created_by,
                    notes=notes,
                    **totals,
                )
                ItemObservationDetail.objects.bulk_create(
                    [
                        ItemObservationDetail(
                            snapshot=snapshot,
                            **{
                                key: row[key]
                                for key in (
                                    "item_id",
                                    "item_name",
                                    "location",
                                    "quantity",
                                    "instances",
                                    "unique_owners",
                                    "category_name",
                                )
                            },
                        )
                        for row in details
                    ],
                    batch_size=1000,
                )
        except IntegrityError as exc:
            raise ConflictError("Já existe um snapshot de hoje para esta origem.") from exc
        return snapshot

    def list_snapshot_details(self, snapshot: ItemObservationSnapshot) -> list[ItemObservationDetail]:
        return list(snapshot.details.all())

    def site_item_aggregates(self) -> list[dict]:
        return list(
            InventoryItem.objects.order_by()
            .values("item_id")
            .annotate(
                quantity=Sum("quantity"),
                instances=Count("pk"),
                unique_owners=Count(Coalesce("inventory__user_id", "user_id"), distinct=True),
            )
        )


class DjangoCharacterServiceOperationRepository(ICharacterServiceOperationRepository):
    """Adaptador Django de ``ICharacterServiceOperationRepository``."""

    def require_user_locked(self, user_id: UUID):
        return User.objects.select_for_update().get(id=user_id)

    def get_locked(self, operation_id) -> CharacterServiceOperation:
        return CharacterServiceOperation.objects.select_for_update().get(id=operation_id)

    def find_by_user_and_request_key(self, user, request_key) -> CharacterServiceOperation | None:
        return CharacterServiceOperation.objects.filter(
            user=user, request_key=request_key
        ).first()

    def has_pending_for_character(self, *, login: str, character_id: int) -> bool:
        return CharacterServiceOperation.objects.filter(
            login=login, character_id=character_id, status="pending"
        ).exists()

    def create(
        self,
        *,
        user,
        request_key,
        login: str,
        character_id: int,
        service: str,
        value: str,
        amount,
        status: str,
    ) -> CharacterServiceOperation:
        return CharacterServiceOperation.objects.create(
            user=user,
            request_key=request_key,
            login=login,
            character_id=character_id,
            service=service,
            value=value,
            amount=amount,
            status=status,
        )

    def save(self, row: CharacterServiceOperation, *, update_fields: list[str]) -> None:
        row.save(update_fields=update_fields)
