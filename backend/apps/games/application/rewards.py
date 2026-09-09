from decimal import Decimal

from apps.games.application.bag import add_to_bag
from apps.games.domain.exceptions import InvalidRewardError
from apps.games.domain.repositories import IBagRepository
from apps.wallet.domain.repositories import IWalletRepository
from common.architecture.base import UnitOfWork


def validate_rewards(rewards):
    if not isinstance(rewards, list) or not 1 <= len(rewards) <= 30:
        raise InvalidRewardError("Informe de 1 a 30 recompensas.")
    cleaned = []
    for reward in rewards:
        if not isinstance(reward, dict) or reward.get("kind") not in (
            "item",
            "tokens",
            "balance",
            "bonus",
        ):
            raise InvalidRewardError("Tipo de recompensa inválido.")
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
            raise InvalidRewardError(
                "Quantidade, ID ou encantamento da recompensa inválido."
            ) from None
    return cleaned


def grant_rewards(
    user,
    rewards,
    label,
    *,
    wallets: IWalletRepository,
    bags: IBagRepository,
    unit_of_work: UnitOfWork | None = None,
):
    """Concede recompensas validadas via porta de carteira (e bag/fichas).

    Quando ``unit_of_work`` é informado, a concessão fica dentro desse escopo.
    Caso contrário, o chamador deve já estar em uma transação/UoW.
    """
    rewards = validate_rewards(rewards)

    def _apply():
        for reward in rewards:
            kind, amount = reward["kind"], Decimal(str(reward["quantity"]))
            if kind == "item":
                add_to_bag(
                    user,
                    item_id=reward["item_id"],
                    item_name=reward["name"],
                    quantity=int(amount),
                    enchant=reward["enchant"],
                    bags=bags,
                )
            elif kind == "tokens":
                user.fichas += int(amount)
                user.save(update_fields=["fichas", "updated_at"])
            else:
                wallet = wallets.get_or_create(user.id)
                description = f"{label} ({kind})"
                if kind == "bonus":
                    wallets.credit_bonus(
                        wallet.id,
                        amount,
                        origin="game_reward",
                        description=description,
                    )
                else:
                    wallets.credit(
                        wallet.id,
                        amount,
                        origin="game_reward",
                        description=description,
                    )
        return rewards

    if unit_of_work is not None:
        with unit_of_work:
            return _apply()
    return _apply()
