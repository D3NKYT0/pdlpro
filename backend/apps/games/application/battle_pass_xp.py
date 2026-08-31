from __future__ import annotations

from django.db.models import F
from django.utils import timezone

from apps.games.infrastructure.models import BattlePassSeason, UserBattlePassProgress


def add_battle_pass_xp(user, amount: int) -> None:
    season = BattlePassSeason.objects.filter(active=True, starts_at__lte=timezone.now(), ends_at__gte=timezone.now()).first()
    if season is None:
        season = BattlePassSeason.objects.filter(active=True).first()
    if season is None:
        return
    progress, _ = UserBattlePassProgress.objects.get_or_create(user=user, season=season)
    UserBattlePassProgress.objects.filter(pk=progress.pk).update(xp=F("xp") + max(amount, 0))
