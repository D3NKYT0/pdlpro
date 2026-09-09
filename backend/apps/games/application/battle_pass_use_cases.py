from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID

from django.utils import timezone

from apps.games.application.bag import add_to_bag
from apps.games.domain.repositories import IBagRepository, IBattlePassRepository
from apps.wallet.domain.repositories import IWalletRepository
from common.architecture.base import UnitOfWork, UseCase
from common.architecture.exceptions import EntityNotFoundError, ValidationDomainError


def _resolve_battle_pass(
    battle_pass: IBattlePassRepository | None,
) -> IBattlePassRepository:
    if battle_pass is not None:
        return battle_pass
    from common.di.bootstrap import DependencyInjection

    return DependencyInjection.root().create_scope().resolve(IBattlePassRepository)


def _resolve_bags(bags: IBagRepository | None) -> IBagRepository:
    if bags is not None:
        return bags
    from common.di.bootstrap import DependencyInjection

    return DependencyInjection.root().create_scope().resolve(IBagRepository)


class GetBattlePassUseCase(UseCase[UUID, dict]):
    """Monta a temporada ativa, o progresso e os níveis do passe; pode criar o progresso inicial do
    jogador.

    Uso: resolva pelo container e chame ``execute(data)`` com ``UUID``. O retorno é ``dict``.
    """

    def __init__(self, battle_pass: IBattlePassRepository) -> None:
        self._battle_pass = battle_pass

    def execute(self, data: UUID) -> dict:
        season = self._battle_pass.active_season()
        if season is None:
            return {"season": None, "levels": []}
        user = self._battle_pass.require_user(data)
        progress = self._battle_pass.get_or_create_progress(user, season)
        claimed = self._battle_pass.list_claimed_reward_ids(user)
        current = self._battle_pass.current_level(progress)
        levels = []
        for row in self._battle_pass.list_levels(season):
            levels.append(
                {
                    "level": row.level,
                    "required_xp": row.required_xp,
                    "unlocked": progress.xp >= row.required_xp,
                    "rewards": [
                        {
                            "id": str(reward.id),
                            "is_premium": reward.is_premium,
                            "item_id": reward.item_id,
                            "item_name": reward.item_name,
                            "quantity": reward.quantity,
                            "description": reward.description,
                            "claimed": reward.pk in claimed,
                            "locked_premium": reward.is_premium
                            and not progress.has_premium,
                        }
                        for reward in row.rewards.all()
                    ],
                }
            )
        return {
            "season": {
                "id": str(season.id),
                "name": season.name,
                "premium_price": str(season.premium_price),
                "ends_at": season.ends_at.isoformat(),
            },
            "xp": progress.xp,
            "has_premium": progress.has_premium,
            "current_level": current,
            "levels": levels,
        }


@dataclass(frozen=True, slots=True)
class ClaimBattlePassRewardInput:
    """Dados de entrada de ``ClaimBattlePassRewardUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID
    reward_id: UUID


def claim_battle_pass_reward(
    *,
    user_id: UUID,
    reward_id: UUID,
    battle_pass: IBattlePassRepository | None = None,
    bags: IBagRepository | None = None,
) -> dict:
    """Entrega um prêmio do passe na bag e registra o resgate.

    Compartilhado por ``ClaimBattlePassRewardUseCase`` e pelo auto-claim. Deve rodar dentro
    de uma transação quando o chamador precisar atomicidade com outras escritas.
    """

    repo = _resolve_battle_pass(battle_pass)
    bag_repo = _resolve_bags(bags)
    reward = repo.get_reward(reward_id)
    if reward is None:
        raise EntityNotFoundError("Recompensa do passe não encontrada.")
    user = repo.require_user_locked(user_id)
    season = reward.level_row.season
    if not season.active or not season.starts_at <= timezone.now() <= season.ends_at:
        raise ValidationDomainError("Esta temporada não está ativa.")
    progress = repo.get_or_create_progress(user, reward.level_row.season)
    if progress.xp < reward.level_row.required_xp:
        raise ValidationDomainError("Nível do passe insuficiente.")
    if reward.is_premium and not progress.has_premium:
        raise ValidationDomainError("Compre o passe premium para este prêmio.")
    if repo.has_claim(user, reward):
        raise ValidationDomainError("Recompensa já resgatada.")
    add_to_bag(
        user,
        item_id=reward.item_id,
        item_name=reward.item_name,
        enchant=reward.enchant,
        quantity=reward.quantity,
        bags=bag_repo,
    )
    repo.create_claim(user, reward)
    repo.create_reward_log(
        user=user,
        season=season,
        kind="reward",
        source=reward.id,
        label=reward.item_name,
        rewards=[
            {
                "kind": "item",
                "item_id": reward.item_id,
                "name": reward.item_name,
                "quantity": reward.quantity,
                "enchant": reward.enchant,
            }
        ],
    )
    return {
        "claimed": True,
        "item_id": reward.item_id,
        "item_name": reward.item_name,
    }


class ClaimBattlePassRewardUseCase(UseCase[ClaimBattlePassRewardInput, dict]):
    """Valida temporada, nível, acesso premium e resgate anterior, entrega o item na bag e registra
    o prêmio.

    Uso: resolva pelo container e chame ``execute(data)`` com ``ClaimBattlePassRewardInput``. O
    retorno é ``dict``.
    """

    def __init__(
        self,
        battle_pass: IBattlePassRepository,
        bags: IBagRepository,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._battle_pass = battle_pass
        self._bags = bags
        self._unit_of_work = unit_of_work

    def execute(self, data: ClaimBattlePassRewardInput) -> dict:
        with self._unit_of_work:
            return claim_battle_pass_reward(
                user_id=data.user_id,
                reward_id=data.reward_id,
                battle_pass=self._battle_pass,
                bags=self._bags,
            )


@dataclass(frozen=True, slots=True)
class BuyBattlePassPremiumInput:
    """Dados de entrada de ``BuyBattlePassPremiumUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID


class BuyBattlePassPremiumUseCase(UseCase[BuyBattlePassPremiumInput, dict]):
    """Debita a carteira e habilita o passe premium da temporada ativa, aplicando o resgate
    automático quando previsto.

    Uso: resolva pelo container e chame ``execute(data)`` com ``BuyBattlePassPremiumInput``. O
    retorno é ``dict``.
    """

    def __init__(
        self,
        wallets: IWalletRepository,
        battle_pass: IBattlePassRepository,
        bags: IBagRepository,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._wallets = wallets
        self._battle_pass = battle_pass
        self._bags = bags
        self._unit_of_work = unit_of_work

    def execute(self, data: BuyBattlePassPremiumInput) -> dict:
        season = self._battle_pass.active_season()
        if season is None:
            raise EntityNotFoundError("Nenhuma temporada ativa.")
        with self._unit_of_work:
            user = self._battle_pass.require_user_locked(data.user_id)
            progress = self._battle_pass.get_or_create_progress(user, season)
            if progress.has_premium:
                raise ValidationDomainError("Você já tem o passe premium.")
            wallet = self._wallets.get_or_create(data.user_id)
            self._wallets.debit(
                wallet.id,
                Decimal(season.premium_price),
                destination="battle_pass",
                description=f"Passe premium {season.name}",
            )
            progress.has_premium = True
            self._battle_pass.save_progress(
                progress, update_fields=["has_premium", "updated_at"]
            )
            if progress.auto_claim:
                auto_claim_rewards(
                    user, progress, battle_pass=self._battle_pass, bags=self._bags
                )
        return {"has_premium": True}


def auto_claim_rewards(
    user,
    progress,
    *,
    battle_pass: IBattlePassRepository | None = None,
    bags: IBagRepository | None = None,
):
    repo = _resolve_battle_pass(battle_pass)
    bag_repo = _resolve_bags(bags)
    for reward in repo.list_claimable_rewards(user, progress):
        claim_battle_pass_reward(
            user_id=user.id,
            reward_id=reward.id,
            battle_pass=repo,
            bags=bag_repo,
        )
