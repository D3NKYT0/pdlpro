from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from django.db.models import Sum

from apps.server.domain.repositories import ILinkSlotRepository, IServicePriceRepository
from apps.server.infrastructure.models import AccountLinkSlot, ServicePrice


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
