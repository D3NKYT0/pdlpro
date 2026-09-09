from __future__ import annotations

from apps.accounts.application.achievement_rules import build_achievement_rules
from apps.accounts.domain.achievement_facts import IAchievementFacts
from apps.accounts.domain.repositories import IProgressRepository


def xp_for_level(level: int) -> int:
    return 100 + max(level - 1, 0) * 25


def add_xp(user, amount: int, progress: IProgressRepository):
    """Soma XP ao perfil gamer via ``IProgressRepository`` injetado."""

    profile = progress.get_or_create_profile(user)
    profile.xp += max(amount, 0)
    while profile.xp >= xp_for_level(profile.level):
        profile.xp -= xp_for_level(profile.level)
        profile.level += 1
    progress.save_profile(profile, update_fields=["xp", "level", "updated_at"])
    return profile


def unlock_achievements(
    user,
    progress: IProgressRepository,
    *,
    facts: IAchievementFacts,
) -> list[str]:
    """Avalia regras e grava conquistas novas; devolve os códigos desbloqueados agora."""

    rules = build_achievement_rules(facts)
    catalog = {row.code: row for row in progress.list_achievements()}
    unlocked = []
    for code, predicate in rules.items():
        achievement = catalog.get(code)
        if achievement is None or not predicate(user):
            continue
        if progress.unlock_achievement(user, achievement):
            unlocked.append(code)
    return unlocked
