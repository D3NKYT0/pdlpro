from __future__ import annotations

from apps.games.domain.repositories import IBagRepository, IBattlePassRepository


def add_battle_pass_xp(
    user,
    amount: int,
    *,
    battle_pass: IBattlePassRepository,
    bags: IBagRepository | None = None,
) -> None:
    """Soma XP do passe; o chamador deve já estar em uma UnitOfWork/transação."""

    battle_pass.lock_user_row(user)
    season = battle_pass.active_season()
    if season is None:
        return
    progress = battle_pass.get_or_create_progress(user, season)
    progress = battle_pass.add_progress_xp(progress, amount)
    if progress.auto_claim:
        from apps.games.application.battle_pass_use_cases import auto_claim_rewards

        if bags is None:
            raise TypeError("bags é obrigatório quando auto_claim está ativo.")
        auto_claim_rewards(user, progress, battle_pass=battle_pass, bags=bags)
