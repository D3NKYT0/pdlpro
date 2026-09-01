from __future__ import annotations

from apps.accounts.application.achievement_rules import build_achievement_rules
from apps.accounts.infrastructure.models import Achievement, GamerProfile, UserAchievement

_RULES = None


def xp_for_level(level: int) -> int:
    return 100 + max(level - 1, 0) * 25


def add_xp(user, amount: int) -> GamerProfile:
    profile, _ = GamerProfile.objects.get_or_create(user=user)
    profile.xp += max(amount, 0)
    while profile.xp >= xp_for_level(profile.level):
        profile.xp -= xp_for_level(profile.level)
        profile.level += 1
    profile.save(update_fields=["xp", "level", "updated_at"])
    return profile


def unlock_achievements(user) -> list[str]:
    global _RULES
    if _RULES is None:
        _RULES = build_achievement_rules()
    catalog = {row.code: row for row in Achievement.objects.all()}
    unlocked = []
    for code, predicate in _RULES.items():
        achievement = catalog.get(code)
        if achievement is None or not predicate(user):
            continue
        _, created = UserAchievement.objects.get_or_create(user=user, achievement=achievement)
        if created:
            unlocked.append(code)
    return unlocked
