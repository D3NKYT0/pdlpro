from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from uuid import UUID

from django.utils import timezone

from apps.games.application.bag import add_to_bag
from apps.games.domain.repositories import IBagRepository
from apps.shop.domain.repositories import (
    ICartRepository,
    IShopRepository,
    ISupporterCommissionPort,
)
from apps.wallet.domain.entities import InsufficientBalanceError, WalletEntity
from apps.wallet.domain.repositories import IWalletRepository
from common.architecture.base import UnitOfWork
from common.architecture.exceptions import ValidationDomainError


def money(value):
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def cart_lines(cart, *, carts: ICartRepository):
    lines = []
    for row in carts.list_checkout_lines(cart):
        if row["kind"] == "item":
            if not row["active"] or row["unit_price"] < 0 or row["quantity"] < 1:
                raise ValidationDomainError(f"{row['name']} não está disponível.")
            lines.append(
                {
                    "id": row["id"],
                    "kind": "item",
                    "name": row["name"],
                    "quantity": row["quantity"],
                    "unit_price": str(row["unit_price"]),
                    "line_total": str(money(row["unit_price"] * row["quantity"])),
                    "grants": [
                        {
                            "item_id": row["item_id"],
                            "item_name": row["name"],
                            "quantity": row["item_quantity"] * row["quantity"],
                        }
                    ],
                }
            )
            continue
        entries = row["entries"]
        if (
            not row["active"]
            or row["unit_price"] < 0
            or not entries
            or any(not e["item_active"] for e in entries)
        ):
            raise ValidationDomainError(f"O pacote {row['name']} não está disponível.")
        lines.append(
            {
                "id": row["id"],
                "kind": "package",
                "package_id": row["package_id"],
                "name": row["name"],
                "quantity": row["quantity"],
                "unit_price": str(row["unit_price"]),
                "line_total": str(money(row["unit_price"] * row["quantity"])),
                "grants": [
                    {
                        "item_id": e["item_id"],
                        "item_name": e["item_name"],
                        "quantity": e["item_quantity"] * e["entry_quantity"] * row["quantity"],
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


def quote(
    cart,
    user,
    *,
    shop: IShopRepository,
    carts: ICartRepository,
    wallet: WalletEntity | None = None,
    lock=False,
):
    lines = cart_lines(cart, carts=carts)
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
    bags: IBagRepository,
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
        details, promo = quote(cart, user, shop=shop, carts=carts, wallet=wallet, lock=True)
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
                add_to_bag(user, bags=bags, **grant)
        if promo:
            promo.uses += 1
            shop.save_promo(promo)
            if promo.supporter_id:
                commissions.record(supporter_id=promo.supporter_id, purchase=purchase, due=due)
        carts.clear_after_checkout(cart)
        return {"purchase_id": str(purchase.id), "total": str(purchase.total)}
