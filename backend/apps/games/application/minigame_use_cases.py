from __future__ import annotations

import random
from dataclasses import dataclass
from uuid import UUID

from apps.games.domain.exceptions import GameInactiveError, InsufficientTokensError
from apps.games.infrastructure.models import DiceHistory, GameConfig, SlotHistory
from common.architecture.base import UnitOfWork, UseCase
from common.architecture.exceptions import ValidationDomainError

SLOT_SYMBOLS = ("sword", "shield", "crown", "adena", "scroll")


def _active(code: str) -> GameConfig:
    row = GameConfig.objects.filter(code=code, active=True).first()
    if row is None:
        raise GameInactiveError()
    return row


@dataclass(frozen=True, slots=True)
class PlayDiceInput:
    user_id: UUID
    bet_type: str
    amount: int
    number: int | None = None


class PlayDiceUseCase(UseCase[PlayDiceInput, dict]):
    def __init__(self, unit_of_work: UnitOfWork) -> None:
        self._unit_of_work = unit_of_work

    def execute(self, data: PlayDiceInput) -> dict:
        from django.contrib.auth import get_user_model

        config = _active("dice")
        min_bet = int((config.settings or {}).get("min_bet", 1))
        if data.amount < min_bet:
            raise ValidationDomainError(f"Aposta mínima: {min_bet} fichas.")
        bet_type = data.bet_type.lower()
        if bet_type not in {"even", "odd", "high", "low", "number"}:
            raise ValidationDomainError("Tipo de aposta inválido.")
        if bet_type == "number" and (data.number is None or data.number < 1 or data.number > 6):
            raise ValidationDomainError("Escolha um número de 1 a 6.")
        with self._unit_of_work:
            user = get_user_model().objects.select_for_update().get(id=data.user_id)
            if user.fichas < data.amount:
                raise InsufficientTokensError()
            user.fichas -= data.amount
            roll = random.randint(1, 6)
            won = False
            if bet_type == "even":
                won = roll % 2 == 0
                multiplier = 2
            elif bet_type == "odd":
                won = roll % 2 == 1
                multiplier = 2
            elif bet_type == "high":
                won = roll >= 4
                multiplier = 2
            elif bet_type == "low":
                won = roll <= 3
                multiplier = 2
            else:
                won = roll == data.number
                multiplier = 5
            payout = data.amount * multiplier if won else 0
            if payout:
                user.fichas += payout
            user.save(update_fields=["fichas", "updated_at"])
            DiceHistory.objects.create(
                user=user,
                bet_type=bet_type,
                bet_amount=data.amount,
                roll=roll,
                won=won,
                payout=payout,
            )
        return {"roll": roll, "won": won, "payout": payout, "fichas": user.fichas}


@dataclass(frozen=True, slots=True)
class SpinSlotsInput:
    user_id: UUID


class SpinSlotsUseCase(UseCase[SpinSlotsInput, dict]):
    def __init__(self, unit_of_work: UnitOfWork) -> None:
        self._unit_of_work = unit_of_work

    def execute(self, data: SpinSlotsInput) -> dict:
        from django.contrib.auth import get_user_model

        config = _active("slots")
        cost = int((config.settings or {}).get("cost", 1))
        with self._unit_of_work:
            user = get_user_model().objects.select_for_update().get(id=data.user_id)
            if user.fichas < cost:
                raise InsufficientTokensError()
            user.fichas -= cost
            reels = [random.choice(SLOT_SYMBOLS) for _ in range(3)]
            if reels[0] == reels[1] == reels[2]:
                payout = cost * 10
            elif len(set(reels)) == 2:
                payout = cost * 2
            else:
                payout = 0
            if payout:
                user.fichas += payout
            user.save(update_fields=["fichas", "updated_at"])
            SlotHistory.objects.create(user=user, reels=reels, won=bool(payout), payout=payout)
        return {"reels": reels, "won": bool(payout), "payout": payout, "fichas": user.fichas}


class GetMinigamesStateUseCase(UseCase[UUID, dict]):
    def execute(self, data: UUID) -> dict:
        from django.contrib.auth import get_user_model

        user = get_user_model().objects.get(id=data)
        dice = GameConfig.objects.filter(code="dice").first()
        slots = GameConfig.objects.filter(code="slots").first()
        return {
            "fichas": user.fichas,
            "dice": {
                "active": bool(dice and dice.active),
                "min_bet": (dice.settings or {}).get("min_bet", 1) if dice else 1,
            },
            "slots": {
                "active": bool(slots and slots.active),
                "cost": (slots.settings or {}).get("cost", 1) if slots else 1,
                "symbols": list(SLOT_SYMBOLS),
            },
        }
