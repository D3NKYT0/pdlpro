from decimal import Decimal, ROUND_HALF_UP

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.games.application.bag import add_to_bag
from apps.programs.models import Commission, Supporter
from apps.shop.infrastructure.models import Cart, PromotionCode, ShopPurchase
from apps.wallet.infrastructure.models import Wallet, WalletTransaction


def money(value):
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def cart_lines(cart):
    lines = []
    for row in cart.items.select_related("item").order_by("created_at"):
        item = row.item
        if not item.active or item.price < 0 or row.quantity < 1:
            raise ValidationError(f"{item.name} não está disponível.")
        lines.append(
            {
                "id": str(row.id),
                "kind": "item",
                "name": item.name,
                "quantity": row.quantity,
                "unit_price": str(item.price),
                "line_total": str(money(item.price * row.quantity)),
                "grants": [
                    {
                        "item_id": item.item_id,
                        "item_name": item.name,
                        "quantity": item.quantity * row.quantity,
                    }
                ],
            }
        )
    for row in (
        cart.packages.select_related("package")
        .prefetch_related("package__package_items__item")
        .order_by("created_at")
    ):
        pack = row.package
        entries = list(pack.package_items.all())
        if (
            not pack.active
            or pack.total_price < 0
            or not entries
            or any(not e.item.active for e in entries)
        ):
            raise ValidationError(f"O pacote {pack.name} não está disponível.")
        lines.append(
            {
                "id": str(row.id),
                "kind": "package",
                "package_id": str(pack.id),
                "name": pack.name,
                "quantity": row.quantity,
                "unit_price": str(pack.total_price),
                "line_total": str(money(pack.total_price * row.quantity)),
                "grants": [
                    {
                        "item_id": e.item.item_id,
                        "item_name": e.item.name,
                        "quantity": e.item.quantity * e.quantity * row.quantity,
                    }
                    for e in entries
                ],
            }
        )
    return lines


def get_promo(code, user, *, lock=False):
    if not code:
        return None
    rows = (
        PromotionCode.objects.select_for_update()
        if lock
        else PromotionCode.objects.all()
    )
    promo = rows.filter(code=code.strip().upper(), active=True).first()
    now = timezone.now()
    if (
        not promo
        or not 0 <= promo.percent <= 100
        or (promo.starts_at and promo.starts_at > now)
        or (promo.ends_at and promo.ends_at <= now)
        or (promo.max_uses and promo.uses >= promo.max_uses)
    ):
        raise ValidationError("Cupom inválido, expirado ou esgotado.")
    if promo.supporter_id and (
        promo.supporter.status != "approved" or promo.supporter.user_id == user.pk
    ):
        raise ValidationError("Este cupom de apoiador não pode ser usado nesta compra.")
    return promo


def quote(cart, user, *, wallet=None, lock=False):
    lines = cart_lines(cart)
    subtotal = sum((Decimal(row["line_total"]) for row in lines), Decimal("0.00"))
    promo = get_promo(cart.promo_code, user, lock=lock)
    discount = money(subtotal * promo.percent / 100) if promo else Decimal("0.00")
    total = subtotal - discount
    wallet = wallet or Wallet.objects.filter(user=user).first()
    bonus = (
        min(wallet.bonus_balance, total)
        if wallet and cart.use_bonus
        else Decimal("0.00")
    )
    return {
        "items": lines,
        "subtotal": str(subtotal),
        "discount": str(discount),
        "total": str(total),
        "bonus_used": str(bonus),
        "balance_due": str(total - bonus),
        "promo_code": cart.promo_code,
        "use_bonus": cart.use_bonus,
    }, promo


@transaction.atomic
def checkout(user_id, request_key=None):
    user = get_user_model().objects.select_for_update().get(id=user_id)
    if request_key:
        prior = ShopPurchase.objects.filter(user=user, request_key=request_key).first()
        if prior:
            return {"purchase_id": str(prior.id), "total": str(prior.total)}
    cart = Cart.objects.select_for_update().filter(user=user).first()
    if not cart:
        raise ValidationError("Carrinho vazio.")
    wallet, _ = Wallet.objects.get_or_create(user=user)
    wallet = Wallet.objects.select_for_update().get(pk=wallet.pk)
    details, promo = quote(cart, user, wallet=wallet, lock=True)
    if not details["items"]:
        raise ValidationError("Carrinho vazio.")
    due, bonus = Decimal(details["balance_due"]), Decimal(details["bonus_used"])
    if wallet.balance < due:
        raise ValidationError("Saldo insuficiente.")
    wallet.balance -= due
    wallet.bonus_balance -= bonus
    wallet.save(update_fields=["balance", "bonus_balance", "updated_at"])
    purchase = ShopPurchase.objects.create(
        user=user,
        total=details["total"],
        subtotal=details["subtotal"],
        discount=details["discount"],
        bonus_used=bonus,
        promo_code=cart.promo_code,
        items_snapshot=details["items"],
        request_key=request_key,
    )
    for amount, suffix in ((due, "saldo"), (bonus, "bônus")):
        if amount:
            WalletTransaction.objects.create(
                wallet=wallet,
                kind="SAIDA",
                amount=amount,
                destination="shop",
                description=f"Compra na loja ({suffix}) · {purchase.id}",
            )
    for row in details["items"]:
        for grant in row["grants"]:
            add_to_bag(user, **grant)
    if promo:
        promo.uses += 1
        promo.save(update_fields=["uses", "updated_at"])
        if promo.supporter_id:
            supporter = Supporter.objects.select_for_update().get(pk=promo.supporter_id)
            amount = money(due * supporter.commission_percent / 100)
            if amount > 0 and supporter.status == "approved":
                Commission.objects.create(
                    supporter=supporter, purchase=purchase, amount=amount
                )
    cart.items.all().delete()
    cart.packages.all().delete()
    cart.promo_code = ""
    cart.save(update_fields=["promo_code", "updated_at"])
    return {"purchase_id": str(purchase.id), "total": str(purchase.total)}
