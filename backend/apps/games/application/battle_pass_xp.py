from __future__ import annotations

from django.db.models import F
from django.db import transaction
from django.utils import timezone

from apps.games.infrastructure.models import BattlePassSeason, UserBattlePassProgress


@transaction.atomic
def add_battle_pass_xp(user, amount: int) -> None:
    type(user).objects.select_for_update().get(pk=user.pk)
    season = BattlePassSeason.objects.filter(
        active=True, starts_at__lte=timezone.now(), ends_at__gte=timezone.now()
    ).first()
    if season is None:
        return
    progress, _ = UserBattlePassProgress.objects.get_or_create(user=user, season=season)
    UserBattlePassProgress.objects.filter(pk=progress.pk).update(
        xp=F("xp") + max(amount, 0)
    )
    progress.refresh_from_db()
    if progress.auto_claim:
        from apps.games.application.battle_pass_use_cases import auto_claim_rewards

        auto_claim_rewards(user, progress)
