from __future__ import annotations

from apps.accounts.application.achievement_rules import build_achievement_rules
from apps.accounts.domain.repositories import IProgressRepository

_RULES = None


def xp_for_level(level: int) -> int:
    return 100 + max(level - 1, 0) * 25


def _resolve_progress(progress: IProgressRepository | None) -> IProgressRepository:
    if progress is not None:
        return progress
    from common.di.bootstrap import DependencyInjection

    return DependencyInjection.root().create_scope().resolve(IProgressRepository)


def add_xp(user, amount: int, progress: IProgressRepository | None = None):
    """Soma XP ao perfil gamer; resolve ``IProgressRepository`` pelo container se omitido."""

    repo = _resolve_progress(progress)
    profile = repo.get_or_create_profile(user)
    profile.xp += max(amount, 0)
    while profile.xp >= xp_for_level(profile.level):
        profile.xp -= xp_for_level(profile.level)
        profile.level += 1
    repo.save_profile(profile, update_fields=["xp", "level", "updated_at"])
    return profile


def unlock_achievements(user, progress: IProgressRepository | None = None) -> list[str]:
    """Avalia regras e grava conquistas novas; devolve os códigos desbloqueados agora."""

    global _RULES
    if _RULES is None:
        _RULES = build_achievement_rules()
    repo = _resolve_progress(progress)
    catalog = {row.code: row for row in repo.list_achievements()}
    unlocked = []
    for code, predicate in _RULES.items():
        achievement = catalog.get(code)
        if achievement is None or not predicate(user):
            continue
        if repo.unlock_achievement(user, achievement):
            unlocked.append(code)
    return unlocked
