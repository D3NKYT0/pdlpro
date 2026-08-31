from __future__ import annotations

from apps.accounts.infrastructure.models import Achievement, GamerProfile, UserAchievement


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
    from apps.communication.infrastructure.models import Friendship
    from apps.games.infrastructure.models import DailyBonusClaim, FishingCatch, SpinHistory
    from apps.social.infrastructure.models import Post

    checks = {
        "first_post": lambda: Post.objects.filter(author=user).exists(),
        "first_friend": lambda: Friendship.objects.filter(user=user, accepted=True).exists(),
        "daily_bonus": lambda: DailyBonusClaim.objects.filter(user=user).exists(),
        "first_spin": lambda: SpinHistory.objects.filter(user=user).exists(),
        "first_fish": lambda: FishingCatch.objects.filter(user=user, success=True).exists(),
    }
    unlocked = []
    for code, predicate in checks.items():
        achievement = Achievement.objects.filter(code=code).first()
        if achievement is None or not predicate():
            continue
        _, created = UserAchievement.objects.get_or_create(user=user, achievement=achievement)
        if created:
            unlocked.append(code)
    return unlocked
