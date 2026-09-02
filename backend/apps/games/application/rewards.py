from decimal import Decimal

from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.games.application.bag import add_to_bag
from apps.wallet.infrastructure.models import Wallet, WalletTransaction


def validate_rewards(rewards):
    if not isinstance(rewards, list) or not 1 <= len(rewards) <= 30:
        raise ValidationError("Informe de 1 a 30 recompensas.")
    cleaned = []
    for reward in rewards:
        if not isinstance(reward, dict) or reward.get("kind") not in (
            "item",
            "tokens",
            "balance",
            "bonus",
        ):
            raise ValidationError("Tipo de recompensa inválido.")
        try:
            amount = Decimal(str(reward.get("quantity", 0)))
            if not amount.is_finite() or amount <= 0 or amount > 100000000:
                raise ValueError
            kind = reward["kind"]
            if kind in ("item", "tokens") and amount != int(amount):
                raise ValueError
            if kind in ("balance", "bonus") and amount != amount.quantize(
                Decimal("0.01")
            ):
                raise ValueError
            entry = {
                "kind": kind,
                "quantity": str(amount.quantize(Decimal("0.01")))
                if kind in ("balance", "bonus")
                else int(amount),
            }
            if kind == "item":
                item_id, enchant = (
                    int(reward.get("item_id", 0)),
                    int(reward.get("enchant", 0)),
                )
                if item_id < 1 or not 0 <= enchant <= 65535:
                    raise ValueError
                entry.update(
                    item_id=item_id,
                    enchant=enchant,
                    name=str(reward.get("name") or f"Item {item_id}")[:120],
                )
            cleaned.append(entry)
        except (ValueError, TypeError, ArithmeticError):
            raise ValidationError(
                "Quantidade, ID ou encantamento da recompensa inválido."
            ) from None
    return cleaned


@transaction.atomic
def grant_rewards(user, rewards, label):
    rewards = validate_rewards(rewards)
    # All callers serialize on the user row before checking claim eligibility.
    for reward in rewards:
        kind, amount = reward["kind"], Decimal(str(reward["quantity"]))
        if kind == "item":
            add_to_bag(
                user,
                item_id=reward["item_id"],
                item_name=reward["name"],
                quantity=int(amount),
                enchant=reward["enchant"],
            )
        elif kind == "tokens":
            user.fichas += int(amount)
            user.save(update_fields=["fichas", "updated_at"])
        else:
            wallet, _ = Wallet.objects.get_or_create(user=user)
            wallet = Wallet.objects.select_for_update().get(pk=wallet.pk)
            field = "bonus_balance" if kind == "bonus" else "balance"
            setattr(wallet, field, getattr(wallet, field) + amount)
            wallet.save(update_fields=[field, "updated_at"])
            WalletTransaction.objects.create(
                wallet=wallet,
                kind="ENTRADA",
                amount=amount,
                origin="game_reward",
                description=f"{label} ({kind})",
            )
    return rewards
