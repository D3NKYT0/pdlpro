from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from apps.accounts.application.progress import add_xp, unlock_achievements, xp_for_level
from apps.accounts.infrastructure.models import Achievement, GamerProfile, RewardClaim, RewardDefinition, UserAchievement
from apps.games.application.bag import add_to_bag
from common.architecture.base import UseCase
from common.architecture.exceptions import EntityNotFoundError, ValidationDomainError


class GetGamerProfileUseCase(UseCase[UUID, dict]):
    def execute(self, data: UUID) -> dict:
        from django.contrib.auth import get_user_model

        user = get_user_model().objects.get(id=data)
        profile, _ = GamerProfile.objects.get_or_create(user=user)
        unlocked = unlock_achievements(user)
        achievements = [
            {"code": row.achievement.code, "name": row.achievement.name, "description": row.achievement.description}
            for row in UserAchievement.objects.select_related("achievement").filter(user=user)
        ]
        claimed_ids = set(RewardClaim.objects.filter(user=user).values_list("reward_id", flat=True))
        rewards = []
        for reward in RewardDefinition.objects.all():
            available = False
            if reward.kind == RewardDefinition.Kind.LEVEL:
                available = profile.level >= int(reward.reference)
            elif reward.kind == RewardDefinition.Kind.ACHIEVEMENT:
                available = UserAchievement.objects.filter(user=user, achievement__code=reward.reference).exists()
            rewards.append(
                {
                    "id": str(reward.id),
                    "kind": reward.kind,
                    "reference": reward.reference,
                    "description": reward.description or reward.item_name,
                    "item_name": reward.item_name,
                    "quantity": reward.quantity,
                    "claimed": reward.pk in claimed_ids,
                    "available": available and reward.pk not in claimed_ids,
                }
            )
        return {
            "xp": profile.xp,
            "level": profile.level,
            "xp_next": xp_for_level(profile.level),
            "unlocked_now": unlocked,
            "achievements": achievements,
            "rewards": rewards,
        }


@dataclass(frozen=True, slots=True)
class ClaimRewardInput:
    user_id: UUID
    reward_id: UUID


class ClaimRewardUseCase(UseCase[ClaimRewardInput, dict]):
    def execute(self, data: ClaimRewardInput) -> dict:
        from django.contrib.auth import get_user_model

        user = get_user_model().objects.get(id=data.user_id)
        profile, _ = GamerProfile.objects.get_or_create(user=user)
        reward = RewardDefinition.objects.filter(id=data.reward_id).first()
        if reward is None:
            raise EntityNotFoundError("Recompensa não encontrada.")
        if RewardClaim.objects.filter(user=user, reward=reward).exists():
            raise ValidationDomainError("Recompensa já resgatada.")
        if reward.kind == RewardDefinition.Kind.LEVEL and profile.level < int(reward.reference):
            raise ValidationDomainError("Nível insuficiente.")
        if reward.kind == RewardDefinition.Kind.ACHIEVEMENT:
            if not UserAchievement.objects.filter(user=user, achievement__code=reward.reference).exists():
                raise ValidationDomainError("Conquista não desbloqueada.")
        add_to_bag(
            user,
            item_id=reward.item_id,
            item_name=reward.item_name,
            enchant=reward.enchant,
            quantity=reward.quantity,
        )
        RewardClaim.objects.create(user=user, reward=reward)
        add_xp(user, 5)
        return {"claimed": True, "item_name": reward.item_name}
