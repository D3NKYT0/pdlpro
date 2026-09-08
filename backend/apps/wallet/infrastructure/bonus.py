from __future__ import annotations

from decimal import Decimal

from django.db.models import Q

from apps.wallet.domain.bonus import BonusPreview, IPurchaseBonusPolicy
from apps.wallet.infrastructure.models import CoinPurchaseBonus, CoinPurchasePromo


class DjangoPurchaseBonusPolicy(IPurchaseBonusPolicy):
    """Calcula o bônus de compra a partir das faixas ativas e da promoção vigente.

    Injete pela porta IPurchaseBonusPolicy e chame ``preview(amount)`` com a quantidade de
    moedas, não com o valor em reais ou dólares. Retorna uma prévia; o crédito efetivo é
    responsabilidade da liquidação do pagamento. A campanha ``CoinPurchasePromo`` eleva o piso
    do percentual sem reduzir o valor cobrado no gateway.
    """

    def preview(self, amount: Decimal) -> BonusPreview:
        """Seleciona faixa e promo vigentes; usa o maior percentual entre elas.

        Limites da faixa são inclusivos; max_amount nulo não limita o teto. Sem faixa nem
        promo compatível, o bônus é zero. Arredonda o bônus para duas casas decimais.
        """

        amount = Decimal(str(amount))
        rule = (
            CoinPurchaseBonus.objects.filter(active=True, min_amount__lte=amount)
            .filter(Q(max_amount__isnull=True) | Q(max_amount__gte=amount))
            .order_by("order", "min_amount")
            .first()
        )
        promo = CoinPurchasePromo.current()
        tier_percent = rule.percent if rule is not None else Decimal("0.00")
        promo_percent = promo.percent if promo is not None else Decimal("0.00")
        percent = max(tier_percent, promo_percent)
        if percent <= 0:
            return BonusPreview(amount=amount, bonus=Decimal("0.00"), percent=Decimal("0.00"), description="", total=amount)
        if promo is not None and promo_percent >= tier_percent:
            description = promo.description or promo.title
        else:
            description = rule.description if rule is not None else ""
        bonus = (amount * percent / Decimal("100.00")).quantize(Decimal("0.01"))
        return BonusPreview(
            amount=amount,
            bonus=bonus,
            percent=percent,
            description=description,
            total=amount + bonus,
        )
