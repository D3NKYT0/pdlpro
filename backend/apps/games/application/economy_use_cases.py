from __future__ import annotations

import random
from dataclasses import dataclass
from uuid import UUID

from django.utils import timezone

from apps.accounts.application.progress import add_xp
from apps.games.application.bag import add_to_bag
from apps.games.application.battle_pass_xp import add_battle_pass_xp
from apps.games.domain.exceptions import GameInactiveError, InsufficientTokensError
from apps.games.infrastructure.models import EconomyFightLog, EconomyWeapon, GameConfig, Monster
from common.architecture.base import UnitOfWork, UseCase
from common.architecture.exceptions import EntityNotFoundError, ValidationDomainError


def _config() -> GameConfig:
    row = GameConfig.objects.filter(code="economy", active=True).first()
    if row is None:
        raise GameInactiveError()
    return row


def _monster_alive(monster: Monster) -> bool:
    if monster.defeated_at is None:
        return True
    elapsed = (timezone.now() - monster.defeated_at).total_seconds()
    return elapsed >= monster.respawn_seconds


class GetEconomyStateUseCase(UseCase[UUID, dict]):
    """Monta fichas, arma e monstros com disponibilidade de combate; cria a arma inicial se
    necessário.

    Uso: resolva pelo container e chame ``execute(data)`` com ``UUID``. O retorno é ``dict``.
    """

    def execute(self, data: UUID) -> dict:
        from django.contrib.auth import get_user_model

        user = get_user_model().objects.get(id=data)
        weapon, _ = EconomyWeapon.objects.get_or_create(user=user)
        monsters = []
        for monster in Monster.objects.filter(active=True).order_by("level"):
            alive = _monster_alive(monster)
            remaining = 0
            if not alive and monster.defeated_at:
                remaining = max(0, int(monster.respawn_seconds - (timezone.now() - monster.defeated_at).total_seconds()))
            monsters.append(
                {
                    "id": str(monster.id),
                    "name": monster.name,
                    "level": monster.level,
                    "required_weapon_level": monster.required_weapon_level,
                    "fragment_reward": monster.fragment_reward,
                    "alive": alive,
                    "respawn_in": remaining,
                }
            )
        return {
            "fichas": user.fichas,
            "weapon": {"level": weapon.level, "fragments": weapon.fragments},
            "monsters": monsters,
        }


@dataclass(frozen=True, slots=True)
class FightMonsterInput:
    """Dados de entrada de ``FightMonsterUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID
    monster_id: UUID


class FightMonsterUseCase(UseCase[FightMonsterInput, dict]):
    """Consome fichas para enfrentar um monstro disponível e registra combate, fragmentos, XP e
    progresso resultantes.

    Uso: resolva pelo container e chame ``execute(data)`` com ``FightMonsterInput``. O retorno é
    ``dict``.
    """

    def __init__(self, unit_of_work: UnitOfWork) -> None:
        self._unit_of_work = unit_of_work

    def execute(self, data: FightMonsterInput) -> dict:
        from django.contrib.auth import get_user_model

        _config()
        with self._unit_of_work:
            user = get_user_model().objects.select_for_update().get(id=data.user_id)
            if user.fichas < 1:
                raise InsufficientTokensError()
            monster = Monster.objects.filter(id=data.monster_id, active=True).first()
            if monster is None:
                raise EntityNotFoundError("Monstro não encontrado.")
            if not _monster_alive(monster):
                raise ValidationDomainError("O monstro ainda não respawnou.")
            weapon, _ = EconomyWeapon.objects.select_for_update().get_or_create(user=user)
            if weapon.level < monster.required_weapon_level:
                raise ValidationDomainError("Sua arma é fraca demais para este monstro.")
            user.fichas -= 1
            player_hp = 50 + weapon.level * 10
            monster_hp = monster.hp
            rounds = 0
            while player_hp > 0 and monster_hp > 0 and rounds < 25:
                monster_hp -= max(1, weapon.level * 10 + 8 - monster.defense)
                rounds += 1
                if monster_hp <= 0:
                    break
                player_hp -= max(1, monster.attack - weapon.level * 2)
            won = monster_hp <= 0
            fragments = monster.fragment_reward if won else 0
            if won:
                weapon.fragments += fragments
                weapon.save(update_fields=["fragments", "updated_at"])
                monster.defeated_at = timezone.now()
                monster.save(update_fields=["defeated_at", "updated_at"])
                add_xp(user, 6)
                add_battle_pass_xp(user, 4)
            user.save(update_fields=["fichas", "updated_at"])
            EconomyFightLog.objects.create(
                user=user, monster=monster, won=won, rounds=rounds, fragments_earned=fragments
            )
        return {
            "won": won,
            "rounds": rounds,
            "fragments_earned": fragments,
            "weapon": {"level": weapon.level, "fragments": weapon.fragments},
            "fichas": user.fichas,
        }


@dataclass(frozen=True, slots=True)
class EnchantWeaponInput:
    """Dados de entrada de ``EnchantWeaponUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID


class EnchantWeaponUseCase(UseCase[EnchantWeaponInput, dict]):
    """Consome fragmentos para tentar evoluir a arma e aplica o resultado do sorteio e eventuais
    recompensas.

    Uso: resolva pelo container e chame ``execute(data)`` com ``EnchantWeaponInput``. O retorno
    é ``dict``.
    """

    def __init__(self, unit_of_work: UnitOfWork) -> None:
        self._unit_of_work = unit_of_work

    def execute(self, data: EnchantWeaponInput) -> dict:
        from django.contrib.auth import get_user_model

        with self._unit_of_work:
            user = get_user_model().objects.get(id=data.user_id)
            weapon, _ = EconomyWeapon.objects.select_for_update().get_or_create(user=user)
            if weapon.fragments < 10:
                raise ValidationDomainError("Você precisa de 10 fragmentos.")
            weapon.fragments -= 10
            chance = max(20, int(95 - weapon.level * 7))
            success = random.randint(1, 100) <= chance
            if success:
                weapon.level += 1
                if weapon.level >= 10:
                    add_to_bag(user, item_id=57, item_name="Adena", quantity=500)
                    weapon.level = 0
            weapon.save(update_fields=["level", "fragments", "updated_at"])
        return {"success": success, "weapon": {"level": weapon.level, "fragments": weapon.fragments}}
