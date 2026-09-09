from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from typing import Any
from uuid import UUID

from django.contrib.auth import get_user_model
from django.db.models import Count, F, Q, Sum
from django.utils import timezone

from apps.games.domain.repositories import (
    IBagRepository,
    IBattlePassRepository,
    IBoxRepository,
    IDailyBonusRepository,
    IEconomyRepository,
    IFishingRepository,
    IGameCatalogRepository,
    IGameConfigAdminRepository,
    IGameContentAdminRepository,
    IMinigameRepository,
)
from apps.games.infrastructure.models import (
    Bag,
    BagItem,
    BattlePassExchange,
    BattlePassLevel,
    BattlePassMilestone,
    BattlePassQuest,
    BattlePassQuestClaim,
    BattlePassReward,
    BattlePassSeason,
    Box,
    BoxSlot,
    BoxType,
    CatalogItem,
    DailyBonusClaim,
    DailyBonusSeason,
    DiceHistory,
    EconomyFightLog,
    EconomyWeapon,
    Fish,
    FishingBait,
    FishingCatch,
    FishingRod,
    GameConfig,
    GameRewardLog,
    Monster,
    Prize,
    SlotHistory,
    SpinHistory,
    UserBattlePassClaim,
    UserBattlePassProgress,
    UserFishingBait,
)
from apps.games.infrastructure.staff_content import CONFIG_MODELS, get_config_model
from common.architecture.exceptions import EntityNotFoundError, ValidationDomainError

User = get_user_model()

EVENT_MODELS = {
    "roulette": SpinHistory,
    "dice": DiceHistory,
    "slots": SlotHistory,
    "fishing": FishingCatch,
    "economy": EconomyFightLog,
    "daily_bonus": DailyBonusClaim,
}


class DjangoGameConfigAdminRepository(IGameConfigAdminRepository):
    """Adaptador Django de ``IGameConfigAdminRepository`` para GameConfig."""

    def list_all(self) -> list[GameConfig]:
        return list(GameConfig.objects.all().order_by("name"))

    def get_by_id(self, config_id: UUID) -> GameConfig | None:
        return GameConfig.objects.filter(id=config_id).first()

    def get_by_code(self, code: str) -> GameConfig | None:
        return GameConfig.objects.filter(code=code).first()

    def get_active_by_code(self, code: str) -> GameConfig | None:
        return GameConfig.objects.filter(code=code, active=True).first()

    def save(self, row: GameConfig) -> GameConfig:
        row.save()
        return row


class DjangoGameContentAdminRepository(IGameContentAdminRepository):
    """Adaptador Django de ``IGameContentAdminRepository`` para o conteúdo staff dos jogos."""

    def _model(self, kind: str):
        model = get_config_model(kind)
        if model is None:
            raise ValidationDomainError("Configuração desconhecida.")
        return model

    def list_kind(self, kind: str) -> list[Any]:
        return list(self._model(kind).objects.all())

    def get_kind(self, kind: str, entry_id: UUID) -> Any | None:
        return self._model(kind).objects.filter(id=entry_id).first()

    def create(self, kind: str, validated_data: dict) -> Any:
        if kind not in CONFIG_MODELS:
            raise ValidationDomainError("Configuração desconhecida.")
        return self._model(kind).objects.create(**validated_data)

    def update(self, kind: str, entry_id: UUID, validated_data: dict) -> Any:
        row = self.get_kind(kind, entry_id)
        if row is None:
            raise EntityNotFoundError("Entrada de configuração não encontrada.")
        for key, value in validated_data.items():
            setattr(row, key, value)
        row.save()
        return row

    def has_active_overlap(
        self,
        kind: str,
        *,
        start_key: str,
        end_key: str,
        start,
        end,
        exclude_id: UUID | None = None,
    ) -> bool:
        model = self._model(kind)
        overlapping = model.objects.filter(
            **{
                f"{start_key}__lte": end,
                f"{end_key}__gte": start,
                "active": True,
            }
        )
        if exclude_id is not None:
            overlapping = overlapping.exclude(id=exclude_id)
        return overlapping.exists()

    def resolve_related(self, kind: str, field_name: str, related_id: UUID) -> Any | None:
        model = self._model(kind)
        try:
            related_model = model._meta.get_field(field_name).related_model
        except Exception:
            return None
        if related_model is None:
            return None
        return related_model.objects.filter(id=related_id).first()


class DjangoGameCatalogRepository(IGameCatalogRepository):
    """Adaptador Django de ``IGameCatalogRepository``."""

    def require_user(self, user_id: UUID):
        return User.objects.get(id=user_id)

    def require_user_locked(self, user_id: UUID):
        return User.objects.select_for_update().get(id=user_id)

    def get_config_by_code(self, code: str) -> GameConfig | None:
        return GameConfig.objects.filter(code=code).first()

    def get_active_config(self, code: str) -> GameConfig | None:
        return GameConfig.objects.filter(code=code, active=True).first()

    def list_active_prizes(self, *, order_by_name: bool = False) -> list[Prize]:
        qs = Prize.objects.filter(active=True)
        if order_by_name:
            qs = qs.order_by("name")
        return list(qs)

    def create_spin_history(self, *, user, prize, failed: bool, seed: int) -> SpinHistory:
        return SpinHistory.objects.create(user=user, prize=prize, failed=failed, seed=seed)

    def add_fichas(self, user_id: UUID, amount: int):
        User.objects.filter(id=user_id).update(fichas=F("fichas") + amount)
        return User.objects.get(id=user_id)


class DjangoBagRepository(IBagRepository):
    """Adaptador Django de ``IBagRepository``."""

    def get_by_user_id(self, user_id: UUID) -> Bag | None:
        return Bag.objects.filter(user__id=user_id).first()

    def list_items(self, bag) -> list[BagItem]:
        return list(bag.items.all())

    def clear_items(self, bag) -> None:
        bag.items.all().delete()

    def add_item(
        self,
        user,
        *,
        item_id: int,
        item_name: str,
        enchant: int = 0,
        quantity: int = 1,
    ) -> BagItem:
        bag, _ = Bag.objects.get_or_create(user=user)
        item, created = BagItem.objects.get_or_create(
            bag=bag,
            item_id=item_id,
            enchant=enchant,
            defaults={"item_name": item_name, "quantity": quantity},
        )
        if not created:
            item.quantity += quantity
            item.save(update_fields=["quantity", "updated_at"])
        return item

    def owned_quantity(self, user, *, item_id: int, enchant: int) -> int:
        return (
            BagItem.objects.filter(
                bag__user=user, item_id=item_id, enchant=enchant
            ).aggregate(total=Sum("quantity"))["total"]
            or 0
        )

    def get_item_locked(self, user, *, item_id: int, enchant: int) -> BagItem | None:
        return (
            BagItem.objects.select_for_update()
            .filter(bag__user=user, item_id=item_id, enchant=enchant)
            .first()
        )

    def save_item(self, item, *, update_fields: list[str]) -> None:
        item.save(update_fields=update_fields)

    def delete_item(self, item) -> None:
        item.delete()


class DjangoBoxRepository(IBoxRepository):
    """Adaptador Django de ``IBoxRepository``."""

    def require_user(self, user_id: UUID):
        return User.objects.get(id=user_id)

    def require_user_locked(self, user_id: UUID):
        return User.objects.select_for_update().get(id=user_id)

    def list_active_types(self) -> list[BoxType]:
        return list(BoxType.objects.filter(active=True).order_by("name"))

    def get_active_type(self, box_type_id: UUID) -> BoxType | None:
        return BoxType.objects.filter(id=box_type_id, active=True).first()

    def list_user_boxes(self, user_id: UUID) -> list[Box]:
        return list(Box.objects.filter(user__id=user_id).select_related("box_type"))

    def list_active_type_items(self, box_type) -> list[CatalogItem]:
        return list(box_type.items.filter(active=True))

    def list_active_catalog_items(self) -> list[CatalogItem]:
        return list(CatalogItem.objects.filter(active=True))

    def delete_user_boxes_of_type(self, user, box_type) -> None:
        Box.objects.filter(user=user, box_type=box_type).delete()

    def create_box(self, user, box_type) -> Box:
        return Box.objects.create(user=user, box_type=box_type)

    def create_slot(
        self,
        box,
        *,
        item_id: int,
        item_name: str,
        enchant: int,
        rarity: str,
        probability: int,
    ) -> BoxSlot:
        return BoxSlot.objects.create(
            box=box,
            item_id=item_id,
            item_name=item_name,
            enchant=enchant,
            rarity=rarity,
            probability=probability,
        )

    def get_box(self, box_id: UUID) -> Box | None:
        return Box.objects.select_related("box_type", "user").filter(id=box_id).first()

    def list_closed_slots(self, box) -> list[BoxSlot]:
        return list(box.slots.filter(opened=False))

    def count_closed_slots(self, box) -> int:
        return box.slots.filter(opened=False).count()

    def count_slots(self, box) -> int:
        return box.slots.count()

    def save_slot(self, slot, *, update_fields: list[str]) -> None:
        slot.save(update_fields=update_fields)

    def delete_box(self, box) -> None:
        box.delete()


class DjangoMinigameRepository(IMinigameRepository):
    """Adaptador Django de ``IMinigameRepository``."""

    def require_user(self, user_id: UUID):
        return User.objects.get(id=user_id)

    def require_user_locked(self, user_id: UUID):
        return User.objects.select_for_update().get(id=user_id)

    def get_config(self, code: str) -> GameConfig | None:
        return GameConfig.objects.filter(code=code).first()

    def create_dice_history(
        self,
        *,
        user,
        bet_type: str,
        bet_amount: int,
        roll: int,
        won: bool,
        payout: int,
    ) -> DiceHistory:
        return DiceHistory.objects.create(
            user=user,
            bet_type=bet_type,
            bet_amount=bet_amount,
            roll=roll,
            won=won,
            payout=payout,
        )

    def create_slot_history(self, *, user, reels: list, won: bool, payout: int) -> SlotHistory:
        return SlotHistory.objects.create(user=user, reels=reels, won=won, payout=payout)

    def event_statistics(self, user, kind: str) -> dict:
        model = EVENT_MODELS.get(kind)
        if model is None or kind == "daily_bonus":
            raise ValidationDomainError("Jogo inválido.")
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
            .annotate(
                score=Count("pk"),
                wins=Count("pk", filter=Q(**{success: kind != "roulette"})),
            )
            .order_by("-wins", "-score", "user__username")[:20]
        )
        return {
            "plays": rows.count(),
            "wins": wins,
            "leaderboard": [
                {
                    "username": r["user__username"],
                    "score": r["score"],
                    "wins": r["wins"],
                }
                for r in leaderboard
            ],
            "payout": rows.aggregate(total=Sum("payout"))["total"] or 0
            if kind in ("dice", "slots")
            else 0,
        }

    def count_quest_events(self, user, quest) -> int:
        today = timezone.localdate()
        if quest.period == "daily":
            start = today
        elif quest.period == "weekly":
            start = today - timedelta(days=today.weekday())
        else:
            start = timezone.localtime(quest.season.starts_at).date()
        return (
            EVENT_MODELS[quest.event]
            .objects.filter(
                user=user,
                created_at__gte=quest.season.starts_at,
                created_at__date__gte=start,
                created_at__lte=quest.season.ends_at,
            )
            .count()
        )


class DjangoFishingRepository(IFishingRepository):
    """Adaptador Django de ``IFishingRepository``."""

    def require_user(self, user_id: UUID):
        return User.objects.get(id=user_id)

    def require_user_locked(self, user_id: UUID):
        return User.objects.select_for_update().get(id=user_id)

    def get_config(self) -> GameConfig | None:
        return GameConfig.objects.filter(code="fishing").first()

    def get_or_create_rod(self, user) -> FishingRod:
        rod, _ = FishingRod.objects.get_or_create(user=user)
        return rod

    def get_or_create_rod_locked(self, user) -> FishingRod:
        rod, _ = FishingRod.objects.select_for_update().get_or_create(user=user)
        return rod

    def save_rod(self, rod, *, update_fields: list[str]) -> None:
        rod.save(update_fields=update_fields)

    def list_active_fish(self) -> list[Fish]:
        return list(Fish.objects.filter(active=True))

    def list_fish_for_rod(self, rod_level: int) -> list[Fish]:
        return list(Fish.objects.filter(active=True, min_rod_level__lte=rod_level))

    def list_recent_catches(self, user, *, limit: int = 8) -> list[FishingCatch]:
        return list(
            FishingCatch.objects.select_related("fish")
            .filter(user=user)
            .order_by("-created_at")[:limit]
        )

    def create_catch(self, *, user, fish, success: bool, rod_level: int) -> FishingCatch:
        return FishingCatch.objects.create(
            user=user, fish=fish, success=success, rod_level=rod_level
        )

    def get_bait_stock_locked(self, user, bait_id: UUID) -> UserFishingBait | None:
        return (
            UserFishingBait.objects.select_for_update()
            .select_related("bait")
            .filter(user=user, bait__id=bait_id, bait__active=True)
            .first()
        )

    def save_bait_stock(self, stock, *, update_fields: list[str] | None = None) -> None:
        if update_fields is None:
            stock.save()
        else:
            stock.save(update_fields=update_fields)

    def list_active_baits(self) -> list[FishingBait]:
        return list(FishingBait.objects.filter(active=True))

    def get_active_bait(self, bait_id: UUID) -> FishingBait | None:
        return FishingBait.objects.filter(id=bait_id, active=True).first()

    def bait_stock_map(self, user) -> dict:
        return dict(UserFishingBait.objects.filter(user=user).values_list("bait_id", "quantity"))

    def catch_collection_map(self, user) -> dict:
        return dict(
            FishingCatch.objects.filter(user=user, success=True)
            .values("fish_id")
            .annotate(total=Count("pk"))
            .values_list("fish_id", "total")
        )

    def get_or_create_bait_stock(self, user, bait) -> UserFishingBait:
        stock, _ = UserFishingBait.objects.get_or_create(user=user, bait=bait)
        return stock


class DjangoEconomyRepository(IEconomyRepository):
    """Adaptador Django de ``IEconomyRepository``."""

    def require_user(self, user_id: UUID):
        return User.objects.get(id=user_id)

    def require_user_locked(self, user_id: UUID):
        return User.objects.select_for_update().get(id=user_id)

    def get_active_config(self) -> GameConfig | None:
        return GameConfig.objects.filter(code="economy", active=True).first()

    def get_or_create_weapon(self, user) -> EconomyWeapon:
        weapon, _ = EconomyWeapon.objects.get_or_create(user=user)
        return weapon

    def get_or_create_weapon_locked(self, user) -> EconomyWeapon:
        weapon, _ = EconomyWeapon.objects.select_for_update().get_or_create(user=user)
        return weapon

    def save_weapon(self, weapon, *, update_fields: list[str]) -> None:
        weapon.save(update_fields=update_fields)

    def list_active_monsters(self) -> list[Monster]:
        return list(Monster.objects.filter(active=True).order_by("level"))

    def get_active_monster(self, monster_id: UUID) -> Monster | None:
        return Monster.objects.filter(id=monster_id, active=True).first()

    def save_monster(self, monster, *, update_fields: list[str]) -> None:
        monster.save(update_fields=update_fields)

    def create_fight_log(
        self,
        *,
        user,
        monster,
        won: bool,
        rounds: int,
        fragments_earned: int,
    ) -> EconomyFightLog:
        return EconomyFightLog.objects.create(
            user=user,
            monster=monster,
            won=won,
            rounds=rounds,
            fragments_earned=fragments_earned,
        )


class DjangoDailyBonusRepository(IDailyBonusRepository):
    """Adaptador Django de ``IDailyBonusRepository``."""

    def require_user(self, user_id: UUID):
        return User.objects.get(id=user_id)

    def require_user_locked(self, user_id: UUID):
        return User.objects.select_for_update().get(id=user_id)

    def get_config(self) -> GameConfig | None:
        return GameConfig.objects.filter(code="daily_bonus").first()

    def has_active_config(self) -> bool:
        return GameConfig.objects.filter(code="daily_bonus", active=True).exists()

    def has_claim(self, user, claimed_on: date) -> bool:
        return DailyBonusClaim.objects.filter(user=user, claimed_on=claimed_on).exists()

    def has_claim_for_user_id(self, user_id: UUID, claimed_on: date) -> bool:
        return DailyBonusClaim.objects.filter(user__id=user_id, claimed_on=claimed_on).exists()

    def create_claim(self, user, *, claimed_on: date, amount: Decimal) -> DailyBonusClaim:
        return DailyBonusClaim.objects.create(user=user, claimed_on=claimed_on, amount=amount)

    def create_reward_log(
        self,
        *,
        user,
        kind: str,
        label: str,
        rewards: list | None = None,
        source=None,
        season=None,
    ) -> GameRewardLog:
        return GameRewardLog.objects.create(
            user=user,
            kind=kind,
            label=label,
            rewards=rewards or [],
            source=source,
            season=season,
        )

    def active_season(self) -> DailyBonusSeason | None:
        today = timezone.localdate()
        return (
            DailyBonusSeason.objects.filter(
                active=True, starts_on__lte=today, ends_on__gte=today
            )
            .order_by("-starts_on")
            .first()
        )

    def list_season_days(self, season) -> list:
        return list(season.days.all())

    def get_season_day(self, season, day: int):
        return season.days.filter(day=day).first()

    def list_season_pool(self, season) -> list:
        return list(season.pool.filter(weight__gt=0))

    def list_daily_reward_logs(self, user, *, limit: int = 60) -> list[GameRewardLog]:
        return list(GameRewardLog.objects.filter(user=user, kind="daily_bonus")[:limit])


class DjangoBattlePassRepository(IBattlePassRepository):
    """Adaptador Django de ``IBattlePassRepository``."""

    def require_user(self, user_id: UUID):
        return User.objects.get(id=user_id)

    def require_user_locked(self, user_id: UUID):
        return User.objects.select_for_update().get(id=user_id)

    def active_season(self) -> BattlePassSeason | None:
        now = timezone.now()
        return (
            BattlePassSeason.objects.filter(
                active=True, starts_at__lte=now, ends_at__gte=now
            )
            .order_by("-starts_at")
            .first()
        )

    def get_or_create_progress(self, user, season) -> UserBattlePassProgress:
        progress, _ = UserBattlePassProgress.objects.get_or_create(user=user, season=season)
        return progress

    def save_progress(self, progress, *, update_fields: list[str]) -> None:
        progress.save(update_fields=update_fields)

    def add_progress_xp(self, progress, amount: int) -> UserBattlePassProgress:
        UserBattlePassProgress.objects.filter(pk=progress.pk).update(
            xp=F("xp") + max(amount, 0)
        )
        progress.refresh_from_db()
        return progress

    def lock_user_row(self, user) -> None:
        type(user).objects.select_for_update().get(pk=user.pk)

    def current_level(self, progress) -> int:
        row = (
            BattlePassLevel.objects.filter(
                season=progress.season, required_xp__lte=progress.xp
            )
            .order_by("-level")
            .first()
        )
        return row.level if row else 0

    def list_levels(self, season) -> list[BattlePassLevel]:
        return list(
            BattlePassLevel.objects.filter(season=season).prefetch_related("rewards")
        )

    def list_claimed_reward_ids(self, user) -> set:
        return set(
            UserBattlePassClaim.objects.filter(user=user).values_list("reward_id", flat=True)
        )

    def get_reward(self, reward_id: UUID) -> BattlePassReward | None:
        return (
            BattlePassReward.objects.select_related("level_row", "level_row__season")
            .filter(id=reward_id)
            .first()
        )

    def has_claim(self, user, reward) -> bool:
        return UserBattlePassClaim.objects.filter(user=user, reward=reward).exists()

    def create_claim(self, user, reward) -> UserBattlePassClaim:
        return UserBattlePassClaim.objects.create(user=user, reward=reward)

    def list_claimable_rewards(self, user, progress) -> list[BattlePassReward]:
        rewards = BattlePassReward.objects.filter(
            level_row__season=progress.season, level_row__required_xp__lte=progress.xp
        ).exclude(claims__user=user)
        if not progress.has_premium:
            rewards = rewards.filter(is_premium=False)
        return list(rewards)

    def create_reward_log(
        self,
        *,
        user,
        kind: str,
        label: str,
        rewards: list | None = None,
        source=None,
        season=None,
    ) -> GameRewardLog:
        return GameRewardLog.objects.create(
            user=user,
            kind=kind,
            label=label,
            rewards=rewards or [],
            source=source,
            season=season,
        )

    def list_reward_logs(
        self, user, *, exclude_daily: bool = True, limit: int = 100
    ) -> list[GameRewardLog]:
        logs = GameRewardLog.objects.filter(user=user)
        if exclude_daily:
            logs = logs.exclude(kind="daily_bonus")
        return list(logs[:limit])

    def count_logs(self, user, *, kind: str, source=None, season=None) -> int:
        qs = GameRewardLog.objects.filter(user=user, kind=kind)
        if source is not None:
            qs = qs.filter(source=source)
        if season is not None:
            qs = qs.filter(season=season)
        return qs.count()

    def has_log(self, user, *, kind: str, source) -> bool:
        return GameRewardLog.objects.filter(user=user, kind=kind, source=source).exists()

    def get_active_quest(self, season, quest_id) -> BattlePassQuest | None:
        return BattlePassQuest.objects.filter(
            id=quest_id, season=season, active=True
        ).first()

    def has_quest_claim(self, user, quest, period_start) -> bool:
        return BattlePassQuestClaim.objects.filter(
            user=user, quest=quest, period_start=period_start
        ).exists()

    def create_quest_claim(self, user, quest, period_start) -> BattlePassQuestClaim:
        return BattlePassQuestClaim.objects.create(
            user=user, quest=quest, period_start=period_start
        )

    def count_quest_claims(self, user, season) -> int:
        return BattlePassQuestClaim.objects.filter(user=user, quest__season=season).count()

    def get_active_exchange(self, season, exchange_id) -> BattlePassExchange | None:
        return BattlePassExchange.objects.filter(
            id=exchange_id, season=season, active=True
        ).first()

    def get_milestone(self, season, milestone_id) -> BattlePassMilestone | None:
        return BattlePassMilestone.objects.filter(id=milestone_id, season=season).first()

    def count_season_reward_claims(self, user, season) -> int:
        return user.battle_pass_claims.filter(reward__level_row__season=season).count()
