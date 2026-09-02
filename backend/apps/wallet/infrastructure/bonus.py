from __future__ import annotations

from decimal import Decimal

from django.db.models import Q

from apps.wallet.domain.bonus import BonusPreview, IPurchaseBonusPolicy
from apps.wallet.infrastructure.models import CoinPurchaseBonus


class DjangoPurchaseBonusPolicy(IPurchaseBonusPolicy):
    """Calcula o bônus de compra a partir das faixas ativas do ORM.

    Injete pela porta IPurchaseBonusPolicy e chame ``preview(amount)`` com a quantidade de
    moedas, não com o valor em reais ou dólares. Retorna uma prévia; o crédito efetivo é
    responsabilidade da liquidação do pagamento.
    """

    def preview(self, amount: Decimal) -> BonusPreview:
        """Seleciona a primeira faixa ativa compatível, ordenada por order e min_amount.

        Limites da faixa são inclusivos; max_amount nulo não limita o teto. Sem faixa
        compatível, o bônus é zero. Arredonda o bônus para duas casas decimais.
        """

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
