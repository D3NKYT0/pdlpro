from __future__ import annotations

from decimal import Decimal

from django.db.models import Q

from apps.wallet.domain.bonus import BonusPreview, IPurchaseBonusPolicy
from apps.wallet.infrastructure.models import CoinPurchaseBonus


class DjangoPurchaseBonusPolicy(IPurchaseBonusPolicy):
    def preview(self, amount: Decimal) -> BonusPreview:
        amount = Decimal(str(amount))
        rule = (
            CoinPurchaseBonus.objects.filter(active=True, min_amount__lte=amount)
            .filter(Q(max_amount__isnull=True) | Q(max_amount__gte=amount))
            .order_by("order", "min_amount")
            .first()
        )
        if rule is None:
            return BonusPreview(amount=amount, bonus=Decimal("0.00"), percent=Decimal("0.00"), description="", total=amount)
        bonus = (amount * rule.percent / Decimal("100.00")).quantize(Decimal("0.01"))
        return BonusPreview(
            amount=amount,
            bonus=bonus,
            percent=rule.percent,
            description=rule.description,
            total=amount + bonus,
        )
