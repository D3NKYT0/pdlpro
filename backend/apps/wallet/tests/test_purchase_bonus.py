from decimal import Decimal
import pytest
from apps.wallet.infrastructure.bonus import DjangoPurchaseBonusPolicy
from apps.wallet.infrastructure.models import CoinPurchaseBonus, CoinPurchasePromo


@pytest.mark.django_db
def test_bonus_policy_tier_and_promo_stacking():
    policy = DjangoPurchaseBonusPolicy()

    # Create tier: 100 to 500 = 10%
    CoinPurchaseBonus.objects.create(
        min_amount=100,
        max_amount=500,
        percent=Decimal("10.00"),
        description="Faixa Bronze 10%",
        active=True,
        order=1,
    )

    # Without promo, 200 coins gives 10%
    preview = policy.preview(Decimal("200.00"))
    assert preview.percent == Decimal("10.00")
    assert preview.bonus == Decimal("20.00")
    assert preview.total == Decimal("220.00")
    assert preview.tier_bonus == Decimal("20.00")
    assert preview.promo_bonus == Decimal("0.00")

    # Promo with max mode (15%) -> max(10%, 15%) = 15%
    promo = CoinPurchasePromo.objects.create(
        percent=Decimal("15.00"),
        title="Promoção de Verão",
        description="15% Geral",
        badge="SUPER BONUS",
        stacking_mode="max",
        active=True,
    )
    preview = policy.preview(Decimal("200.00"))
    assert preview.percent == Decimal("15.00")
    assert preview.bonus == Decimal("30.00")

    # Stacking mode sum -> 10% + 15% = 25%
    promo.stacking_mode = "sum"
    promo.save()
    preview = policy.preview(Decimal("200.00"))
    assert preview.percent == Decimal("25.00")
    assert preview.bonus == Decimal("50.00")
    assert preview.tier_bonus == Decimal("20.00")
    assert preview.promo_bonus == Decimal("30.00")

    # Add PIX bonus (5%) and first purchase bonus (10%)
    promo.pix_bonus_percent = Decimal("5.00")
    promo.first_purchase_active = True
    promo.first_purchase_percent = Decimal("10.00")
    promo.save()

    # Preview with pix and first purchase
    preview = policy.preview(
        Decimal("200.00"),
        payment_method="pix",
        is_first_purchase=True,
    )
    # 25% (sum base) + 5% (pix) + 10% (first purchase) = 40%
    assert preview.percent == Decimal("40.00")
    assert preview.bonus == Decimal("80.00")
    assert preview.pix_bonus == Decimal("10.00")
    assert preview.first_purchase_bonus == Decimal("20.00")
