"""Resgates duplicados batem no compare-and-set (unique) e não creditam de novo."""

from datetime import date
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.games.domain.exceptions import AlreadyClaimedError
from apps.games.infrastructure.models import HuntQuest
from apps.games.infrastructure.repositories import (
    DjangoDailyBonusRepository,
    DjangoHuntRepository,
)

pytestmark = pytest.mark.django_db


def test_daily_bonus_second_claim_row_is_conflict():
    user = get_user_model().objects.create_user(username="claim_d", email="claim_d@test.dev")
    repo = DjangoDailyBonusRepository()
    today = timezone.localdate()
    repo.create_claim(user, claimed_on=today, amount=Decimal(10))
    with pytest.raises(AlreadyClaimedError):
        repo.create_claim(user, claimed_on=today, amount=Decimal(10))


def test_hunt_second_claim_row_is_conflict():
    user = get_user_model().objects.create_user(username="claim_h", email="claim_h@test.dev")
    quest = HuntQuest.objects.create(
        name="Caçada",
        name_en="Hunt",
        metric="pvp",
        target=1,
        period="daily",
        rewards=[{"kind": "tokens", "quantity": 1}],
        active=True,
    )
    repo = DjangoHuntRepository()
    start = date(2026, 9, 17)
    repo.create_claim(user, quest, character_id=1, period_start=start)
    with pytest.raises(AlreadyClaimedError):
        repo.create_claim(user, quest, character_id=1, period_start=start)
