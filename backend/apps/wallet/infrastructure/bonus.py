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

    def preview(
        self,
        amount: Decimal,
        *,
        payment_method: str = "",
        is_first_purchase: bool = False,
    ) -> BonusPreview:
        """Seleciona faixa e promo vigentes, aplica regras de método e 1ª compra.

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

        stacking = getattr(promo, "stacking_mode", "max") if promo is not None else "max"
        if stacking == "sum":
            base_percent = tier_percent + promo_percent
        else:
            base_percent = max(tier_percent, promo_percent)

        pix_percent = Decimal("0.00")
        is_pix = str(payment_method or "").lower() in {"pix", "mercadopago_pix"}
        if is_pix and promo is not None and getattr(promo, "pix_bonus_percent", Decimal("0.00")) > 0:
            pix_percent = promo.pix_bonus_percent

        first_purchase_percent = Decimal("0.00")
        if (
            is_first_purchase
            and promo is not None
            and getattr(promo, "first_purchase_active", False)
            and getattr(promo, "first_purchase_percent", Decimal("0.00")) > 0
        ):
            first_purchase_percent = promo.first_purchase_percent

        total_percent = base_percent + pix_percent + first_purchase_percent

        tier_bonus = (amount * tier_percent / Decimal("100.00")).quantize(Decimal("0.01"))
        promo_bonus = (
            (amount * promo_percent / Decimal("100.00")).quantize(Decimal("0.01"))
            if promo_percent > 0
            else Decimal("0.00")
        )
        pix_bonus = (amount * pix_percent / Decimal("100.00")).quantize(Decimal("0.01"))
        fp_bonus = (amount * first_purchase_percent / Decimal("100.00")).quantize(Decimal("0.01"))

        if total_percent <= 0:
            return BonusPreview(
                amount=amount,
                bonus=Decimal("0.00"),
                percent=Decimal("0.00"),
                description="",
                total=amount,
                tier_bonus=Decimal("0.00"),
                promo_bonus=Decimal("0.00"),
                pix_bonus=Decimal("0.00"),
                first_purchase_bonus=Decimal("0.00"),
            )

        bonus = (amount * total_percent / Decimal("100.00")).quantize(Decimal("0.01"))
        parts = []
        promo_leads = promo is not None and promo_percent > 0 and (
            stacking == "sum" or promo_percent >= tier_percent
        )
        if promo_leads:
            parts.append(promo.description or promo.title)
        elif rule is not None and rule.description:
            parts.append(rule.description)
        if pix_bonus > 0:
            parts.append(f"+{pix_percent}% PIX")
        if fp_bonus > 0:
            parts.append(f"+{first_purchase_percent}% 1ª Recarga")
        description = " · ".join(parts) if parts else (rule.description if rule else "")

        return BonusPreview(
            amount=amount,
            bonus=bonus,
            percent=total_percent,
            description=description,
            total=amount + bonus,
            tier_bonus=tier_bonus,
            promo_bonus=promo_bonus,
            pix_bonus=pix_bonus,
            first_purchase_bonus=fp_bonus,
        )
