from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from apps.accounts.application.progress import add_xp, unlock_achievements, xp_for_level
from apps.accounts.domain.achievement_facts import IAchievementFacts
from apps.accounts.domain.bag import IRewardBagPort
from apps.accounts.domain.repositories import IProgressRepository
from common.architecture.base import UseCase
from common.architecture.exceptions import EntityNotFoundError, ValidationDomainError

_REWARD_KIND_LEVEL = "level"
_REWARD_KIND_ACHIEVEMENT = "achievement"


class GetGamerProfileUseCase(UseCase[UUID, dict]):
    """Monta progresso, conquistas e recompensas do jogador. Pode criar o perfil e desbloquear
    conquistas durante a consulta.

    Uso: resolva pelo container e chame ``execute(data)`` com ``UUID``. O retorno é ``dict``.
    """

    def __init__(self, progress: IProgressRepository, facts: IAchievementFacts) -> None:
        self._progress = progress
        self._facts = facts

    def execute(self, data: UUID) -> dict:
        user = self._progress.require_user(data)
        profile = self._progress.get_or_create_profile(user)
        unlocked = unlock_achievements(user, self._progress, facts=self._facts)
        unlocked_codes = self._progress.list_unlocked_codes(user)
        achievements = [
            {
                "code": row.code,
                "name": row.name,
                "description": row.description,
                "unlocked": row.code in unlocked_codes,
            }
            for row in self._progress.list_achievements(order_by_name=True)
        ]
        claimed_ids = self._progress.list_claimed_reward_ids(user)
        rewards = []
        for reward in self._progress.list_rewards():
            available = False
            if reward.kind == _REWARD_KIND_LEVEL:
                available = profile.level >= int(reward.reference)
            elif reward.kind == _REWARD_KIND_ACHIEVEMENT:
                available = self._progress.has_achievement(user, reward.reference)
            rewards.append(
                {
                    "id": str(reward.id),
                    "kind": reward.kind,
                    "reference": reward.reference,
                    "description": reward.description or reward.item_name,
                    "item_id": reward.item_id,
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
            "unlocked_count": len(unlocked_codes),
            "total_achievements": len(achievements),
            "achievements": achievements,
            "rewards": rewards,
        }


@dataclass(frozen=True, slots=True)
class ClaimRewardInput:
    """Dados de entrada de ``ClaimRewardUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID
    reward_id: UUID


class ClaimRewardUseCase(UseCase[ClaimRewardInput, dict]):
    """Verifica nível ou conquista e resgate anterior, adiciona o prêmio à bag e registra o resgate
    e XP.

    Uso: resolva pelo container e chame ``execute(data)`` com ``ClaimRewardInput``. O retorno é
    ``dict``. Entrega itens via ``IRewardBagPort`` (sem import direto de games).
    """

    def __init__(self, reward_bag: IRewardBagPort, progress: IProgressRepository) -> None:
        self._reward_bag = reward_bag
        self._progress = progress

    def execute(self, data: ClaimRewardInput) -> dict:
        user = self._progress.require_user(data.user_id)
        profile = self._progress.get_or_create_profile(user)
        reward = self._progress.get_reward(data.reward_id)
        if reward is None:
            raise EntityNotFoundError("Recompensa não encontrada.")
        if self._progress.has_claimed(user, reward):
            raise ValidationDomainError("Recompensa já resgatada.")
        if reward.kind == _REWARD_KIND_LEVEL and profile.level < int(reward.reference):
            raise ValidationDomainError("Nível insuficiente.")
        if (
            reward.kind == _REWARD_KIND_ACHIEVEMENT
            and not self._progress.has_achievement(user, reward.reference)
        ):
            raise ValidationDomainError("Conquista não desbloqueada.")
        self._reward_bag.add_item(
            user,
            item_id=reward.item_id,
            item_name=reward.item_name,
            enchant=reward.enchant,
            quantity=reward.quantity,
        )
        self._progress.create_claim(user, reward)
        add_xp(user, 5, self._progress)
        return {"claimed": True, "item_id": reward.item_id, "item_name": reward.item_name}
