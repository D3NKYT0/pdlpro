import random
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from apps.games.application.rewards import grant_rewards
from apps.games.domain.exceptions import AlreadyClaimedError
from apps.games.domain.repositories import (
    IBagRepository,
    IBattlePassRepository,
    IDailyBonusRepository,
    IFishingRepository,
    IMinigameRepository,
)
from apps.wallet.domain.repositories import IWalletRepository
from common.architecture.base import UnitOfWork
from common.architecture.exceptions import EntityNotFoundError, ValidationDomainError


def period_start(quest):
    today = timezone.localdate()
    if quest.period == "daily":
        return today
    if quest.period == "weekly":
        return today - timedelta(days=today.weekday())
    return timezone.localtime(quest.season.starts_at).date()


def battle_details(
    user,
    *,
    battle_pass: IBattlePassRepository,
    bags: IBagRepository,
    minigames: IMinigameRepository,
):
    season = battle_pass.active_season()
    logs = battle_pass.list_reward_logs(user, exclude_daily=True, limit=100)
    history = [
        {
            "id": str(r.id),
            "kind": r.kind,
            "label": r.label,
            "rewards": r.rewards,
            "created_at": r.created_at,
        }
        for r in logs
    ]
    if not season:
        return {
            "quests": [],
            "exchanges": [],
            "milestones": [],
            "history": history,
            "auto_claim": False,
            "statistics": {},
        }
    progress = battle_pass.get_or_create_progress(user, season)
    quests = [
        {
            "id": str(q.id),
            "name": q.name,
            "description": q.description,
            "period": q.period,
            "target": q.target,
            "current": minigames.count_quest_events(user, q),
            "xp": q.xp,
            "claimed": battle_pass.has_quest_claim(user, q, period_start(q)),
        }
        for q in battle_pass.list_active_quests(season)
    ]
    exchanges = [
        {
            "id": str(e.id),
            "name": e.name,
            "required_item_id": e.required_item_id,
            "required_enchant": e.required_enchant,
            "required_quantity": e.required_quantity,
            "owned": bags.owned_quantity(
                user, item_id=e.required_item_id, enchant=e.required_enchant
            ),
            "rewards": e.rewards,
            "limit": e.limit_per_user,
            "used": battle_pass.count_logs(user, kind="exchange", source=e.id),
        }
        for e in battle_pass.list_active_exchanges(season)
    ]
    milestones = [
        {
            "id": str(m.id),
            "name": m.name,
            "required_xp": m.required_xp,
            "rewards": m.rewards,
            "claimed": battle_pass.has_log(user, kind="milestone", source=m.id),
        }
        for m in battle_pass.list_milestones(season)
    ]
    return {
        "quests": quests,
        "exchanges": exchanges,
        "milestones": milestones,
        "history": history,
        "auto_claim": progress.auto_claim,
        "statistics": {
            "xp": progress.xp,
            "quests": battle_pass.count_quest_claims(user, season),
            "exchanges": battle_pass.count_logs(user, kind="exchange", season=season),
            "rewards": battle_pass.count_season_reward_claims(user, season),
        },
    }


def battle_action(
    user_id,
    action,
    entry_id=None,
    enabled=False,
    *,
    wallets: IWalletRepository,
    battle_pass: IBattlePassRepository,
    bags: IBagRepository,
    minigames: IMinigameRepository,
    unit_of_work: UnitOfWork,
):
    with unit_of_work:
        return _battle_action_body(
            user_id,
            action,
            entry_id,
            enabled,
            wallets=wallets,
            battle_pass=battle_pass,
            bags=bags,
            minigames=minigames,
        )


def _battle_action_body(
    user_id,
    action,
    entry_id=None,
    enabled=False,
    *,
    wallets: IWalletRepository,
    battle_pass: IBattlePassRepository,
    bags: IBagRepository,
    minigames: IMinigameRepository,
):
    user = battle_pass.require_user_locked(user_id)
    season = battle_pass.active_season()
    if not season:
        raise ValidationDomainError("Nenhuma temporada ativa.")
    progress = battle_pass.get_or_create_progress(user, season)
    if action == "auto-claim":
        progress.auto_claim = enabled
        battle_pass.save_progress(progress, update_fields=["auto_claim", "updated_at"])
        if enabled:
            from apps.games.application.battle_pass_use_cases import auto_claim_rewards

            auto_claim_rewards(user, progress, battle_pass=battle_pass, bags=bags)
    elif action == "quest":
        quest = battle_pass.get_active_quest(season, entry_id)
        if quest is None:
            raise EntityNotFoundError("Missão não encontrada.")
        start = period_start(quest)
        if battle_pass.has_quest_claim(user, quest, start):
            raise ValidationDomainError("Missão já resgatada neste período.")
        if minigames.count_quest_events(user, quest) < quest.target:
            raise ValidationDomainError("Complete o objetivo da missão antes de resgatar.")
        battle_pass.create_quest_claim(user, quest, start)
        from apps.games.application.battle_pass_xp import add_battle_pass_xp

        add_battle_pass_xp(user, quest.xp, battle_pass=battle_pass, bags=bags)
        battle_pass.create_reward_log(
            user=user,
            season=season,
            kind="quest",
            source=quest.id,
            label=f"{quest.name}: +{quest.xp} XP",
        )
    elif action == "exchange":
        exchange = battle_pass.get_active_exchange(season, entry_id)
        if exchange is None:
            raise EntityNotFoundError("Troca não encontrada.")
        used = battle_pass.count_logs(user, kind="exchange", source=exchange.id)
        if exchange.limit_per_user and used >= exchange.limit_per_user:
            raise ValidationDomainError("Limite de trocas atingido.")
        item = bags.get_item_locked(
            user,
            item_id=exchange.required_item_id,
            enchant=exchange.required_enchant,
        )
        if not item or item.quantity < exchange.required_quantity:
            raise ValidationDomainError("Itens insuficientes na bag.")
        item.quantity -= exchange.required_quantity
        if item.quantity:
            bags.save_item(item, update_fields=["quantity", "updated_at"])
        else:
            bags.delete_item(item)
        rewards = grant_rewards(
            user, exchange.rewards, exchange.name, wallets=wallets, bags=bags
        )
        battle_pass.create_reward_log(
            user=user,
            season=season,
            kind="exchange",
            source=exchange.id,
            label=exchange.name,
            rewards=rewards,
        )
    elif action == "milestone":
        milestone = battle_pass.get_milestone(season, entry_id)
        if milestone is None:
            raise EntityNotFoundError("Marco não encontrado.")
        if progress.xp < milestone.required_xp or battle_pass.has_log(
            user, kind="milestone", source=milestone.id
        ):
            raise ValidationDomainError("Marco indisponível ou já resgatado.")
        rewards = grant_rewards(
            user, milestone.rewards, milestone.name, wallets=wallets, bags=bags
        )
        battle_pass.create_reward_log(
            user=user,
            season=season,
            kind="milestone",
            source=milestone.id,
            label=milestone.name,
            rewards=rewards,
        )
    else:
        raise ValidationDomainError("Ação inválida.")
    return battle_details(
        user, battle_pass=battle_pass, bags=bags, minigames=minigames
    )


def daily_details(user, *, daily_bonus: IDailyBonusRepository):
    season = daily_bonus.active_season()
    today = timezone.localdate()
    return {
        "season": {
            "id": str(season.id),
            "name": season.name,
            "ends_on": season.ends_on,
            "current_day": (today - season.starts_on).days + 1,
        }
        if season
        else None,
        "claimed": daily_bonus.has_claim(user, today),
        "days": [
            {"day": d.day, "rewards": d.rewards}
            for d in daily_bonus.list_season_days(season)
        ]
        if season
        else [],
        "pool": [
            {"name": p.name, "weight": p.weight, "rewards": p.rewards}
            for p in daily_bonus.list_season_pool(season)
        ]
        if season
        else [],
        "history": [
            {
                "id": str(r.id),
                "label": r.label,
                "rewards": r.rewards,
                "created_at": r.created_at,
            }
            for r in daily_bonus.list_daily_reward_logs(user)
        ],
    }


def claim_daily_season(
    user_id,
    *,
    wallets: IWalletRepository,
    daily_bonus: IDailyBonusRepository,
    bags: IBagRepository,
    battle_pass: IBattlePassRepository,
    unit_of_work: UnitOfWork,
):
    with unit_of_work:
        user = daily_bonus.require_user_locked(user_id)
        season = daily_bonus.active_season()
        if not season or not daily_bonus.has_active_config():
            raise ValidationDomainError("Bônus diário indisponível.")
        today = timezone.localdate()
        if daily_bonus.has_claim(user, today):
            raise AlreadyClaimedError()
        day = daily_bonus.get_season_day(season, (today - season.starts_on).days + 1)
        rewards = list(day.rewards) if day else []
        pool = daily_bonus.list_season_pool(season)
        if pool:
            rewards += random.choices(pool, weights=[p.weight for p in pool], k=1)[0].rewards
        if not rewards:
            raise ValidationDomainError("Nenhuma recompensa configurada para hoje.")
        rewards = grant_rewards(
            user,
            rewards,
            f"Bônus diário · {season.name}",
            wallets=wallets,
            bags=bags,
        )
        amount = sum(
            (Decimal(str(r["quantity"])) for r in rewards if r["kind"] == "balance"),
            Decimal(0),
        )
        daily_bonus.create_claim(user, claimed_on=today, amount=amount)
        daily_bonus.create_reward_log(
            user=user,
            kind="daily_bonus",
            source=season.id,
            label=season.name,
            rewards=rewards,
        )
        from apps.games.application.battle_pass_xp import add_battle_pass_xp

        add_battle_pass_xp(user, 10, battle_pass=battle_pass, bags=bags)
        return {"amount": str(amount), "claimed_on": today.isoformat(), "rewards": rewards}


def buy_bait(user_id, bait_id, quantity, *, fishing: IFishingRepository, unit_of_work: UnitOfWork):
    with unit_of_work:
        user = fishing.require_user_locked(user_id)
        bait = fishing.get_active_bait(bait_id)
        if bait is None:
            raise EntityNotFoundError("Isca não encontrada.")
        config = fishing.get_config()
        if config is None or not config.active:
            raise ValidationDomainError("Pesca desativada.")
        cost = bait.price * quantity
        if user.fichas < cost:
            raise ValidationDomainError("Fichas insuficientes.")
        user.fichas -= cost
        user.save(update_fields=["fichas", "updated_at"])
        stock = fishing.get_or_create_bait_stock(user, bait)
        stock.quantity += quantity
        fishing.save_bait_stock(stock)
        return {"quantity": stock.quantity, "fichas": user.fichas}


def game_statistics(user, kind, *, minigames: IMinigameRepository):
    return minigames.event_statistics(user, kind)
