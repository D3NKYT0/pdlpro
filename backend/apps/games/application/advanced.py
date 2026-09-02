import random
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.games.application.rewards import grant_rewards
from apps.games.infrastructure.models import (
    BagItem,
    BattlePassExchange,
    BattlePassMilestone,
    BattlePassQuest,
    BattlePassQuestClaim,
    BattlePassSeason,
    DailyBonusClaim,
    DailyBonusSeason,
    DiceHistory,
    EconomyFightLog,
    FishingBait,
    FishingCatch,
    GameConfig,
    GameRewardLog,
    SlotHistory,
    SpinHistory,
    UserBattlePassProgress,
    UserFishingBait,
)


EVENT_MODELS = {
    "roulette": SpinHistory,
    "dice": DiceHistory,
    "slots": SlotHistory,
    "fishing": FishingCatch,
    "economy": EconomyFightLog,
    "daily_bonus": DailyBonusClaim,
}


def active_season():
    now = timezone.now()
    return (
        BattlePassSeason.objects.filter(
            active=True, starts_at__lte=now, ends_at__gte=now
        )
        .order_by("-starts_at")
        .first()
    )


def period_start(quest):
    today = timezone.localdate()
    if quest.period == "daily":
        return today
    if quest.period == "weekly":
        return today - timedelta(days=today.weekday())
    return timezone.localtime(quest.season.starts_at).date()


def quest_count(user, quest):
    return (
        EVENT_MODELS[quest.event]
        .objects.filter(
            user=user,
            created_at__gte=quest.season.starts_at,
            created_at__date__gte=period_start(quest),
            created_at__lte=quest.season.ends_at,
        )
        .count()
    )


def battle_details(user):
    season = active_season()
    logs = GameRewardLog.objects.filter(user=user)
    if not season:
        return {
            "quests": [],
            "exchanges": [],
            "milestones": [],
            "history": [],
            "auto_claim": False,
            "statistics": {},
        }
    progress, _ = UserBattlePassProgress.objects.get_or_create(user=user, season=season)
    quests = [
        {
            "id": str(q.id),
            "name": q.name,
            "description": q.description,
            "period": q.period,
            "target": q.target,
            "current": quest_count(user, q),
            "xp": q.xp,
            "claimed": BattlePassQuestClaim.objects.filter(
                user=user, quest=q, period_start=period_start(q)
            ).exists(),
        }
        for q in season.quests.filter(active=True)
    ]
    exchanges = [
        {
            "id": str(e.id),
            "name": e.name,
            "required_item_id": e.required_item_id,
            "required_enchant": e.required_enchant,
            "required_quantity": e.required_quantity,
            "owned": BagItem.objects.filter(
                bag__user=user, item_id=e.required_item_id, enchant=e.required_enchant
            ).aggregate(total=Sum("quantity"))["total"]
            or 0,
            "rewards": e.rewards,
            "limit": e.limit_per_user,
            "used": logs.filter(kind="exchange", source=e.id).count(),
        }
        for e in season.exchanges.filter(active=True)
    ]
    milestones = [
        {
            "id": str(m.id),
            "name": m.name,
            "required_xp": m.required_xp,
            "rewards": m.rewards,
            "claimed": logs.filter(kind="milestone", source=m.id).exists(),
        }
        for m in season.milestones.order_by("required_xp")
    ]
    history = [
        {
            "id": str(r.id),
            "kind": r.kind,
            "label": r.label,
            "rewards": r.rewards,
            "created_at": r.created_at,
        }
        for r in logs.filter(season=season)[:100]
    ]
    return {
        "quests": quests,
        "exchanges": exchanges,
        "milestones": milestones,
        "history": history,
        "auto_claim": progress.auto_claim,
        "statistics": {
            "xp": progress.xp,
            "quests": BattlePassQuestClaim.objects.filter(
                user=user, quest__season=season
            ).count(),
            "exchanges": logs.filter(season=season, kind="exchange").count(),
            "rewards": user.battle_pass_claims.filter(
                reward__level_row__season=season
            ).count(),
        },
    }


@transaction.atomic
def battle_action(user_id, action, entry_id=None, enabled=False):
    user = get_user_model().objects.select_for_update().get(id=user_id)
    season = active_season()
    if not season:
        raise ValidationError("Nenhuma temporada ativa.")
    progress, _ = UserBattlePassProgress.objects.get_or_create(user=user, season=season)
    if action == "auto-claim":
        progress.auto_claim = enabled
        progress.save(update_fields=["auto_claim", "updated_at"])
        if enabled:
            from apps.games.application.battle_pass_use_cases import auto_claim_rewards

            auto_claim_rewards(user, progress)
    elif action == "quest":
        quest = get_object_or_404(
            BattlePassQuest, id=entry_id, season=season, active=True
        )
        start = period_start(quest)
        if BattlePassQuestClaim.objects.filter(
            user=user, quest=quest, period_start=start
        ).exists():
            raise ValidationError("Missão já resgatada neste período.")
        if quest_count(user, quest) < quest.target:
            raise ValidationError("Complete o objetivo da missão antes de resgatar.")
        BattlePassQuestClaim.objects.create(user=user, quest=quest, period_start=start)
        from apps.games.application.battle_pass_xp import add_battle_pass_xp

        add_battle_pass_xp(user, quest.xp)
        GameRewardLog.objects.create(
            user=user,
            season=season,
            kind="quest",
            source=quest.id,
            label=f"{quest.name}: +{quest.xp} XP",
        )
    elif action == "exchange":
        exchange = get_object_or_404(
            BattlePassExchange, id=entry_id, season=season, active=True
        )
        used = GameRewardLog.objects.filter(
            user=user, kind="exchange", source=exchange.id
        ).count()
        if exchange.limit_per_user and used >= exchange.limit_per_user:
            raise ValidationError("Limite de trocas atingido.")
        item = (
            BagItem.objects.select_for_update()
            .filter(
                bag__user=user,
                item_id=exchange.required_item_id,
                enchant=exchange.required_enchant,
            )
            .first()
        )
        if not item or item.quantity < exchange.required_quantity:
            raise ValidationError("Itens insuficientes na bag.")
        item.quantity -= exchange.required_quantity
        if item.quantity:
            item.save(update_fields=["quantity", "updated_at"])
        else:
            item.delete()
        rewards = grant_rewards(user, exchange.rewards, exchange.name)
        GameRewardLog.objects.create(
            user=user,
            season=season,
            kind="exchange",
            source=exchange.id,
            label=exchange.name,
            rewards=rewards,
        )
    elif action == "milestone":
        milestone = get_object_or_404(BattlePassMilestone, id=entry_id, season=season)
        if (
            progress.xp < milestone.required_xp
            or GameRewardLog.objects.filter(
                user=user, kind="milestone", source=milestone.id
            ).exists()
        ):
            raise ValidationError("Marco indisponível ou já resgatado.")
        rewards = grant_rewards(user, milestone.rewards, milestone.name)
        GameRewardLog.objects.create(
            user=user,
            season=season,
            kind="milestone",
            source=milestone.id,
            label=milestone.name,
            rewards=rewards,
        )
    else:
        raise ValidationError("Ação inválida.")
    return battle_details(user)


def daily_season():
    today = timezone.localdate()
    return (
        DailyBonusSeason.objects.filter(
            active=True, starts_on__lte=today, ends_on__gte=today
        )
        .order_by("-starts_on")
        .first()
    )


def daily_details(user):
    season = daily_season()
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
        "claimed": DailyBonusClaim.objects.filter(user=user, claimed_on=today).exists(),
        "days": [{"day": d.day, "rewards": d.rewards} for d in season.days.all()]
        if season
        else [],
        "pool": [
            {"name": p.name, "weight": p.weight, "rewards": p.rewards}
            for p in season.pool.all()
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
            for r in GameRewardLog.objects.filter(user=user, kind="daily_bonus")[:60]
        ],
    }


@transaction.atomic
def claim_daily_season(user_id):
    user = get_user_model().objects.select_for_update().get(id=user_id)
    season = daily_season()
    if (
        not season
        or not GameConfig.objects.filter(code="daily_bonus", active=True).exists()
    ):
        raise ValidationError("Bônus diário indisponível.")
    today = timezone.localdate()
    if DailyBonusClaim.objects.filter(user=user, claimed_on=today).exists():
        raise ValidationError("Você já resgatou o bônus de hoje.")
    day = season.days.filter(day=(today - season.starts_on).days + 1).first()
    rewards = list(day.rewards) if day else []
    pool = list(season.pool.filter(weight__gt=0))
    if pool:
        rewards += random.choices(pool, weights=[p.weight for p in pool], k=1)[
            0
        ].rewards
    if not rewards:
        raise ValidationError("Nenhuma recompensa configurada para hoje.")
    rewards = grant_rewards(user, rewards, f"Bônus diário · {season.name}")
    amount = sum(
        (Decimal(str(r["quantity"])) for r in rewards if r["kind"] == "balance"),
        Decimal(0),
    )
    DailyBonusClaim.objects.create(user=user, claimed_on=today, amount=amount)
    GameRewardLog.objects.create(
        user=user,
        kind="daily_bonus",
        source=season.id,
        label=season.name,
        rewards=rewards,
    )
    from apps.games.application.battle_pass_xp import add_battle_pass_xp

    add_battle_pass_xp(user, 10)
    return {"amount": str(amount), "claimed_on": today.isoformat(), "rewards": rewards}


@transaction.atomic
def buy_bait(user_id, bait_id, quantity):
    user = get_user_model().objects.select_for_update().get(id=user_id)
    bait = get_object_or_404(FishingBait, id=bait_id, active=True)
    if not GameConfig.objects.filter(code="fishing", active=True).exists():
        raise ValidationError("Pesca desativada.")
    cost = bait.price * quantity
    if user.fichas < cost:
        raise ValidationError("Fichas insuficientes.")
    user.fichas -= cost
    user.save(update_fields=["fichas", "updated_at"])
    stock, _ = UserFishingBait.objects.get_or_create(user=user, bait=bait)
    stock.quantity += quantity
    stock.save()
    return {"quantity": stock.quantity, "fichas": user.fichas}


def game_statistics(user, kind):
    model = EVENT_MODELS.get(kind)
    if model is None or kind == "daily_bonus":
        raise ValidationError("Jogo inválido.")
    rows = model.objects.filter(user=user)
    success = {
        "roulette": "failed",
        "dice": "won",
        "slots": "won",
        "fishing": "success",
        "economy": "won",
    }[kind]
    wins = rows.filter(**{success: kind != "roulette"}).count()
    leaderboard = list(
        model.objects.values("user__username")
        .annotate(score=Count("pk"))
        .order_by("-score", "user__username")[:20]
    )
    return {
        "plays": rows.count(),
        "wins": wins,
        "leaderboard": [
            {"username": r["user__username"], "score": r["score"]} for r in leaderboard
        ],
        "payout": rows.aggregate(total=Sum("payout"))["total"] or 0
        if kind in ("dice", "slots")
        else 0,
    }
