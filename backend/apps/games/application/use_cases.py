from __future__ import annotations

import random
import time
from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID

from django.utils import timezone

from apps.games.application.configuration import require_active_game
from apps.games.domain.exceptions import AlreadyClaimedError, InsufficientTokensError
from apps.games.domain.repositories import (
    IBagRepository,
    IDailyBonusRepository,
    IGameCatalogRepository,
)
from apps.wallet.domain.repositories import IWalletRepository
from common.architecture.base import UnitOfWork, UseCase
from common.architecture.exceptions import EntityNotFoundError


class GetRouletteStateUseCase(UseCase[UUID, dict]):
    """Lista prêmios ativos, custo e chance configurada de falha da roleta, junto ao saldo de
    fichas.

    Uso: resolva pelo container e chame ``execute(data)`` com ``UUID``. O retorno é ``dict``.
    """

    def __init__(self, catalog: IGameCatalogRepository) -> None:
        self._catalog = catalog

    def execute(self, data: UUID) -> dict:
        user = self._catalog.require_user(data)
        prizes = self._catalog.list_active_prizes(order_by_name=True)
        config = self._catalog.get_config_by_code("roulette")
        return {
            "fichas": user.fichas,
            "fail_chance": (config.settings or {}).get("fail_chance", 20) if config else 20,
            "cost": (config.settings or {}).get("cost", 1) if config else 1,
            "prizes": [
                {
                    "id": str(prize.id),
                    "name": prize.name,
                    "weight": prize.weight,
                    "rarity": prize.rarity,
                    "item_id": prize.item_id,
                }
                for prize in prizes
            ],
        }


@dataclass(frozen=True, slots=True)
class SpinRouletteInput:
    """Dados de entrada de ``SpinRouletteUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID


class SpinRouletteUseCase(UseCase[SpinRouletteInput, dict]):
    """Consome fichas e sorteia prêmio ou falha, registrando o giro e adicionando o prêmio à bag
    quando houver.

    Uso: resolva pelo container e chame ``execute(data)`` com ``SpinRouletteInput``. O retorno é
    ``dict``.
    """

    def __init__(
        self,
        catalog: IGameCatalogRepository,
        bags: IBagRepository,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._catalog = catalog
        self._bags = bags
        self._unit_of_work = unit_of_work

    def execute(self, data: SpinRouletteInput) -> dict:
        config = require_active_game("roulette", catalog=self._catalog)
        cost = int((config.settings or {}).get("cost", 1))
        fail_chance = int((config.settings or {}).get("fail_chance", 20))
        prizes = self._catalog.list_active_prizes()
        if not prizes:
            raise EntityNotFoundError("Nenhum prêmio cadastrado na roleta.")
        with self._unit_of_work:
            user = self._catalog.require_user_locked(data.user_id)
            if user.fichas < cost:
                raise InsufficientTokensError()
            user.fichas -= cost
            user.save(update_fields=["fichas", "updated_at"])
            fail_chance = max(0, min(100, fail_chance))
            total_weight = sum(prize.weight for prize in prizes) or 1
            seed = time.time_ns()
            random.seed(seed)
            prize_weights = [prize.weight for prize in prizes]
            if fail_chance >= 100:
                chosen = None
            elif fail_chance <= 0:
                chosen = random.choices(prizes, weights=prize_weights, k=1)[0]
            else:
                fail_weight = total_weight * (fail_chance / (100 - fail_chance))
                chosen = random.choices([*prizes, None], weights=[*prize_weights, fail_weight], k=1)[0]
            if chosen is None:
                self._catalog.create_spin_history(user=user, prize=None, failed=True, seed=seed)
                return {"failed": True, "fichas": user.fichas, "prize": None}
            self._bags.add_item(
                user,
                item_id=chosen.item_id or 0,
                item_name=chosen.name,
                enchant=chosen.enchant,
                quantity=1,
            )
            self._catalog.create_spin_history(user=user, prize=chosen, failed=False, seed=seed)
            return {
                "failed": False,
                "fichas": user.fichas,
                "prize": {
                    "item_id": chosen.item_id,
                    "name": chosen.name,
                    "rarity": chosen.rarity,
                    "enchant": chosen.enchant,
                },
            }


@dataclass(frozen=True, slots=True)
class BuyTokensInput:
    """Dados de entrada de ``BuyTokensUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID
    amount: int


class BuyTokensUseCase(UseCase[BuyTokensInput, dict]):
    """Converte saldo da carteira em fichas e retorna o saldo de fichas atualizado.

    Uso: resolva pelo container e chame ``execute(data)`` com ``BuyTokensInput``. O retorno é
    ``dict``.
    """

    def __init__(
        self,
        wallets: IWalletRepository,
        catalog: IGameCatalogRepository,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._wallets = wallets
        self._catalog = catalog
        self._unit_of_work = unit_of_work

    def execute(self, data: BuyTokensInput) -> dict:
        if data.amount < 1 or data.amount > 1000:
            from common.architecture.exceptions import ValidationDomainError

            raise ValidationDomainError("Compre entre 1 e 1000 fichas.")
        price = Decimal(str(data.amount))
        with self._unit_of_work:
            wallet = self._wallets.get_or_create(data.user_id)
            self._wallets.debit(
                wallet.id,
                price,
                destination="games",
                description=f"Compra de {data.amount} fichas",
            )
            user = self._catalog.add_fichas(data.user_id, data.amount)
        return {"fichas": user.fichas}


@dataclass(frozen=True, slots=True)
class ClaimDailyBonusInput:
    """Dados de entrada de ``ClaimDailyBonusUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID


class ClaimDailyBonusUseCase(UseCase[ClaimDailyBonusInput, dict]):
    """Impede um segundo resgate na mesma data local, credita o bônus diário e registra recompensa
    e progresso.

    Uso: resolva pelo container e chame ``execute(data)`` com ``ClaimDailyBonusInput``. O
    retorno é ``dict``.
    """

    def __init__(
        self,
        wallets: IWalletRepository,
        catalog: IGameCatalogRepository,
        daily_bonus: IDailyBonusRepository,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._wallets = wallets
        self._catalog = catalog
        self._daily_bonus = daily_bonus
        self._unit_of_work = unit_of_work

    def execute(self, data: ClaimDailyBonusInput) -> dict:
        config = require_active_game("daily_bonus", catalog=self._catalog)
        amount = Decimal(str((config.settings or {}).get("amount", "10.00")))
        today = timezone.localdate()
        with self._unit_of_work:
            user = self._daily_bonus.require_user_locked(data.user_id)
            if self._daily_bonus.has_claim(user, today):
                raise AlreadyClaimedError()
            wallet = self._wallets.get_or_create(data.user_id)
            self._wallets.credit(wallet.id, amount, origin="daily_bonus", description="Bônus diário")
            self._daily_bonus.create_claim(user, claimed_on=today, amount=amount)
            self._daily_bonus.create_reward_log(
                user=user,
                kind="daily_bonus",
                label="Bônus diário",
                rewards=[{"kind": "balance", "quantity": str(amount)}],
            )
            from apps.accounts.application.progress import add_xp
            from apps.games.application.battle_pass_xp import add_battle_pass_xp

            add_xp(user, 15)
            add_battle_pass_xp(user, 10)
        return {"amount": str(amount), "claimed_on": today.isoformat()}


class GetDailyBonusStateUseCase(UseCase[UUID, dict]):
    """Informa se o bônus diário está ativo, o valor configurado e se o usuário já resgatou hoje.

    Uso: resolva pelo container e chame ``execute(data)`` com ``UUID``. O retorno é ``dict``.
    """

    def __init__(self, daily_bonus: IDailyBonusRepository) -> None:
        self._daily_bonus = daily_bonus

    def execute(self, data: UUID) -> dict:
        config = self._daily_bonus.get_config()
        today = timezone.localdate()
        claimed = self._daily_bonus.has_claim_for_user_id(data, today)
        amount = str((config.settings or {}).get("amount", "10.00")) if config else "10.00"
        return {"claimed": claimed, "amount": amount, "active": bool(config and config.active)}


class GetBagUseCase(UseCase[UUID, list[dict]]):
    """Lista os itens acumulados na bag do usuário; devolve lista vazia se ela ainda não existir.

    Uso: resolva pelo container e chame ``execute(data)`` com ``UUID``. O retorno é
    ``list[dict]``.
    """

    def __init__(self, bags: IBagRepository) -> None:
        self._bags = bags

    def execute(self, data: UUID) -> list[dict]:
        bag = self._bags.get_by_user_id(data)
        if bag is None:
            return []
        return [
            {
                "item_id": item.item_id,
                "item_name": item.item_name,
                "quantity": item.quantity,
                "enchant": item.enchant,
            }
            for item in self._bags.list_items(bag)
        ]
