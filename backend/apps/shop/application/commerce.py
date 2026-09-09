from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from uuid import UUID

from django.utils import timezone

from apps.games.application.bag import add_to_bag
from apps.shop.domain.repositories import ICartRepository, IShopRepository, ISupporterCommissionPort
from apps.wallet.domain.entities import InsufficientBalanceError, WalletEntity
from apps.wallet.domain.repositories import IWalletRepository
from common.architecture.base import UnitOfWork
from common.architecture.exceptions import ValidationDomainError


def money(value):
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def cart_lines(cart):
    lines = []
    for row in cart.items.select_related("item").order_by("created_at"):
        item = row.item
        if not item.active or item.price < 0 or row.quantity < 1:
            raise ValidationDomainError(f"{item.name} não está disponível.")
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
            raise ValidationDomainError(f"O pacote {pack.name} não está disponível.")
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


def get_promo(code, user, *, shop: IShopRepository, lock=False):
    if not code:
        return None
    promo = shop.find_active_promo_by_code(code.strip().upper(), lock=lock)
    now = timezone.now()
    if (
        not promo
        or not 0 <= promo.percent <= 100
        or (promo.starts_at and promo.starts_at > now)
        or (promo.ends_at and promo.ends_at <= now)
        or (promo.max_uses and promo.uses >= promo.max_uses)
    ):
        raise ValidationDomainError("Cupom inválido, expirado ou esgotado.")
    if promo.supporter_id and (
        promo.supporter.status != "approved" or promo.supporter.user_id == user.pk
    ):
        raise ValidationDomainError("Este cupom de apoiador não pode ser usado nesta compra.")
    return promo


def quote(cart, user, *, shop: IShopRepository, wallet: WalletEntity | None = None, lock=False):
    lines = cart_lines(cart)
    subtotal = sum((Decimal(row["line_total"]) for row in lines), Decimal("0.00"))
    promo = get_promo(cart.promo_code, user, shop=shop, lock=lock)
    discount = money(subtotal * promo.percent / 100) if promo else Decimal("0.00")
    total = subtotal - discount
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


def checkout(
    user_id: UUID,
    request_key=None,
    *,
    wallets: IWalletRepository,
    shop: IShopRepository,
    carts: ICartRepository,
    commissions: ISupporterCommissionPort,
    unit_of_work: UnitOfWork,
):
    """Finaliza o carrinho debitando carteira, entregando itens e registrando a compra."""

    with unit_of_work:
        user = carts.lock_user(user_id)
        if request_key:
            prior = shop.find_purchase_by_request_key(user, request_key)
            if prior:
                return {"purchase_id": str(prior.id), "total": str(prior.total)}
        cart = carts.get_locked_for_user(user)
        if not cart:
            raise ValidationDomainError("Carrinho vazio.")
        wallet = wallets.get_or_create(user_id)
        details, promo = quote(cart, user, shop=shop, wallet=wallet, lock=True)
        if not details["items"]:
            raise ValidationDomainError("Carrinho vazio.")
        due, bonus = Decimal(details["balance_due"]), Decimal(details["bonus_used"])
        purchase = shop.create_purchase(
            user=user,
            total=details["total"],
            subtotal=details["subtotal"],
            discount=details["discount"],
            bonus_used=bonus,
            promo_code=cart.promo_code,
            items_snapshot=details["items"],
            request_key=request_key,
        )
        try:
            if due:
                wallets.debit(
                    wallet.id,
                    due,
                    destination="shop",
                    description=f"Compra na loja (saldo) · {purchase.id}",
                )
            if bonus:
                wallets.debit_bonus(
                    wallet.id,
                    bonus,
                    destination="shop",
                    description=f"Compra na loja (bônus) · {purchase.id}",
                )
        except InsufficientBalanceError as exc:
            raise ValidationDomainError("Saldo insuficiente.") from exc
        for row in details["items"]:
            for grant in row["grants"]:
                add_to_bag(user, **grant)
        if promo:
            promo.uses += 1
            shop.save_promo(promo)
            if promo.supporter_id:
                commissions.record(supporter_id=promo.supporter_id, purchase=purchase, due=due)
        carts.clear_after_checkout(cart)
        return {"purchase_id": str(purchase.id), "total": str(purchase.total)}
