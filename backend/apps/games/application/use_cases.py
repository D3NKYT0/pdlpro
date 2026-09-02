from __future__ import annotations

import random
import time
from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID

from django.db.models import F
from django.utils import timezone

from apps.games.domain.exceptions import AlreadyClaimedError, GameInactiveError, InsufficientTokensError
from apps.games.infrastructure.models import Bag, BagItem, DailyBonusClaim, GameConfig, Prize, SpinHistory
from apps.wallet.domain.repositories import IWalletRepository
from common.architecture.base import UnitOfWork, UseCase
from common.architecture.exceptions import EntityNotFoundError


def _config(code: str) -> GameConfig:
    row = GameConfig.objects.filter(code=code, active=True).first()
    if row is None:
        raise GameInactiveError()
    return row


class GetRouletteStateUseCase(UseCase[UUID, dict]):
    def execute(self, data: UUID) -> dict:
        from django.contrib.auth import get_user_model

        user = get_user_model().objects.get(id=data)
        prizes = list(Prize.objects.filter(active=True).order_by("name"))
        config = GameConfig.objects.filter(code="roulette").first()
        return {
            "fichas": user.fichas,
            "fail_chance": (config.settings or {}).get("fail_chance", 20) if config else 20,
            "cost": (config.settings or {}).get("cost", 1) if config else 1,
            "prizes": [
                {
                    "id": str(prize.id),
                    "name": prize.name,
                    "weight": prize.weight,
                    "rarity": prize.rarity,
                    "item_id": prize.item_id,
                }
                for prize in prizes
            ],
        }


@dataclass(frozen=True, slots=True)
class SpinRouletteInput:
    user_id: UUID


class SpinRouletteUseCase(UseCase[SpinRouletteInput, dict]):
    def __init__(self, unit_of_work: UnitOfWork) -> None:
        self._unit_of_work = unit_of_work

    def execute(self, data: SpinRouletteInput) -> dict:
        from django.contrib.auth import get_user_model

        config = _config("roulette")
        cost = int((config.settings or {}).get("cost", 1))
        fail_chance = int((config.settings or {}).get("fail_chance", 20))
        prizes = list(Prize.objects.filter(active=True))
        if not prizes:
            raise EntityNotFoundError("Nenhum prêmio cadastrado na roleta.")
        with self._unit_of_work:
            user = get_user_model().objects.select_for_update().get(id=data.user_id)
            if user.fichas < cost:
                raise InsufficientTokensError()
            user.fichas -= cost
            user.save(update_fields=["fichas", "updated_at"])
            fail_chance = max(0, min(100, fail_chance))
            total_weight = sum(prize.weight for prize in prizes) or 1
            seed = time.time_ns()
            random.seed(seed)
            prize_weights = [prize.weight for prize in prizes]
            if fail_chance >= 100:
                chosen = None
            elif fail_chance <= 0:
                chosen = random.choices(prizes, weights=prize_weights, k=1)[0]
            else:
                fail_weight = total_weight * (fail_chance / (100 - fail_chance))
                chosen = random.choices([*prizes, None], weights=[*prize_weights, fail_weight], k=1)[0]
            if chosen is None:
                SpinHistory.objects.create(user=user, prize=None, failed=True, seed=seed)
                return {"failed": True, "fichas": user.fichas, "prize": None}
            bag, _ = Bag.objects.get_or_create(user=user)
            item, created = BagItem.objects.get_or_create(
                bag=bag,
                item_id=chosen.item_id or 0,
                enchant=chosen.enchant,
                defaults={"item_name": chosen.name, "quantity": 1},
            )
            if not created:
                item.quantity += 1
                item.save(update_fields=["quantity", "updated_at"])
            SpinHistory.objects.create(user=user, prize=chosen, failed=False, seed=seed)
            return {
                "failed": False,
                "fichas": user.fichas,
                "prize": {"item_id": chosen.item_id, "name": chosen.name, "rarity": chosen.rarity, "enchant": chosen.enchant},
            }


@dataclass(frozen=True, slots=True)
class BuyTokensInput:
    user_id: UUID
    amount: int


class BuyTokensUseCase(UseCase[BuyTokensInput, dict]):
    def __init__(self, wallets: IWalletRepository, unit_of_work: UnitOfWork) -> None:
        self._wallets = wallets
        self._unit_of_work = unit_of_work

    def execute(self, data: BuyTokensInput) -> dict:
        from django.contrib.auth import get_user_model

        if data.amount < 1 or data.amount > 1000:
            from common.architecture.exceptions import ValidationDomainError

            raise ValidationDomainError("Compre entre 1 e 1000 fichas.")
        price = Decimal(str(data.amount))
        with self._unit_of_work:
            wallet = self._wallets.get_or_create(data.user_id)
            self._wallets.debit(wallet.id, price, destination="games", description=f"Compra de {data.amount} fichas")
            get_user_model().objects.filter(id=data.user_id).update(fichas=F("fichas") + data.amount)
            user = get_user_model().objects.get(id=data.user_id)
        return {"fichas": user.fichas}


@dataclass(frozen=True, slots=True)
class ClaimDailyBonusInput:
    user_id: UUID


class ClaimDailyBonusUseCase(UseCase[ClaimDailyBonusInput, dict]):
    def __init__(self, wallets: IWalletRepository, unit_of_work: UnitOfWork) -> None:
        self._wallets = wallets
        self._unit_of_work = unit_of_work

    def execute(self, data: ClaimDailyBonusInput) -> dict:
        from django.contrib.auth import get_user_model

        config = _config("daily_bonus")
        amount = Decimal(str((config.settings or {}).get("amount", "10.00")))
        today = timezone.localdate()
        with self._unit_of_work:
            user = get_user_model().objects.select_for_update().get(id=data.user_id)
            if DailyBonusClaim.objects.filter(user=user, claimed_on=today).exists():
                raise AlreadyClaimedError()
            wallet = self._wallets.get_or_create(data.user_id)
            self._wallets.credit(wallet.id, amount, origin="daily_bonus", description="Bônus diário")
            DailyBonusClaim.objects.create(user=user, claimed_on=today, amount=amount)
            from apps.games.infrastructure.models import GameRewardLog
            GameRewardLog.objects.create(user=user, kind="daily_bonus", label="Bônus diário", rewards=[{"kind": "balance", "quantity": str(amount)}])
            from apps.accounts.application.progress import add_xp
            from apps.games.application.battle_pass_xp import add_battle_pass_xp

            add_xp(user, 15)
            add_battle_pass_xp(user, 10)
        return {"amount": str(amount), "claimed_on": today.isoformat()}


class GetDailyBonusStateUseCase(UseCase[UUID, dict]):
    def execute(self, data: UUID) -> dict:
        config = GameConfig.objects.filter(code="daily_bonus").first()
        today = timezone.localdate()
        claimed = DailyBonusClaim.objects.filter(user__id=data, claimed_on=today).exists()
        amount = str((config.settings or {}).get("amount", "10.00")) if config else "10.00"
        return {"claimed": claimed, "amount": amount, "active": bool(config and config.active)}


class GetBagUseCase(UseCase[UUID, list[dict]]):
    def execute(self, data: UUID) -> list[dict]:
        bag = Bag.objects.filter(user__id=data).first()
        if bag is None:
            return []
        return [
            {"item_id": item.item_id, "item_name": item.item_name, "quantity": item.quantity, "enchant": item.enchant}
            for item in bag.items.all()
        ]
