from __future__ import annotations

from apps.games.domain.repositories import IBattlePassRepository
from common.architecture.base import UnitOfWork


def _resolve_battle_pass(
    battle_pass: IBattlePassRepository | None,
) -> IBattlePassRepository:
    if battle_pass is not None:
        return battle_pass
    from common.di.bootstrap import DependencyInjection

    return DependencyInjection.root().create_scope().resolve(IBattlePassRepository)


def _resolve_unit_of_work(unit_of_work: UnitOfWork | None) -> UnitOfWork:
    if unit_of_work is not None:
        return unit_of_work
    from common.di.bootstrap import DependencyInjection

    return DependencyInjection.root().create_scope().resolve(UnitOfWork)


def add_battle_pass_xp(
    user,
    amount: int,
    *,
    battle_pass: IBattlePassRepository | None = None,
    unit_of_work: UnitOfWork | None = None,
) -> None:
    repo = _resolve_battle_pass(battle_pass)
    work = _resolve_unit_of_work(unit_of_work)
    with work:
        repo.lock_user_row(user)
        season = repo.active_season()
        if season is None:
            return
        progress = repo.get_or_create_progress(user, season)
        progress = repo.add_progress_xp(progress, amount)
        if progress.auto_claim:
            from apps.games.application.battle_pass_use_cases import auto_claim_rewards

            auto_claim_rewards(user, progress, battle_pass=repo)
