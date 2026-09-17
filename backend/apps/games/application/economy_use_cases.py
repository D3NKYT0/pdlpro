from __future__ import annotations

import random
from dataclasses import dataclass
from uuid import UUID

from django.utils import timezone

from apps.accounts.application.progress import add_xp
from apps.accounts.domain.repositories import IProgressRepository
from apps.games.application.bag import add_to_bag
from apps.games.application.battle_pass_xp import add_battle_pass_xp
from apps.games.domain.arena_combat import (
    arena_player_stats,
    is_arena_overlevel,
    resolve_arena_fight,
    resolve_arena_round,
)
from apps.games.domain.arena_roster import (
    ARENA_BOSS_ADENA,
    ARENA_BOSS_ITEM_ID,
    ARENA_BOSS_ITEM_NAME,
    ARENA_WEAPON_MAX,
    is_arena_boss,
    is_arena_regular_locked,
)
from apps.games.domain.exceptions import GameInactiveError, InsufficientTokensError
from apps.games.domain.repositories import (
    IBagRepository,
    IBattlePassRepository,
    IEconomyRepository,
)
from common.architecture.base import UnitOfWork, UseCase
from common.architecture.exceptions import EntityNotFoundError, ValidationDomainError


def _monster_alive(monster) -> bool:
    if monster.defeated_at is None:
        return True
    elapsed = (timezone.now() - monster.defeated_at).total_seconds()
    return elapsed >= monster.respawn_seconds


def _hit_dict(hit) -> dict | None:
    if hit is None:
        return None
    return {"damage": int(hit.damage), "crit": bool(hit.crit)}


def _duel_dict(duel) -> dict:
    return {
        "monster_id": str(duel.monster.id),
        "player_hp": int(duel.player_hp),
        "player_max_hp": int(duel.player_max_hp),
        "boss_hp": int(duel.boss_hp),
        "boss_max_hp": int(duel.boss_max_hp),
        "round": int(duel.round),
        "player_crits": int(duel.player_crits),
        "boss_crits": int(duel.boss_crits),
        "player_damage": int(duel.player_damage),
        "boss_damage": int(duel.boss_damage),
    }


def _fight_result(
    *,
    won: bool | None,
    phase: str,
    rounds: int,
    fragments: int,
    prize,
    run,
    weapon,
    fichas: int,
    duel=None,
    last=None,
) -> dict:
    return {
        "won": won,
        "phase": phase,
        "rounds": int(rounds),
        "fragments_earned": int(fragments),
        "prize": prize,
        "run": run,
        "weapon": {"level": weapon.level, "fragments": weapon.fragments},
        "fichas": fichas,
        "duel": duel,
        "last": last,
    }


class GetEconomyStateUseCase(UseCase[UUID, dict]):
    """Monta fichas, arma e monstros com disponibilidade de combate; cria a arma inicial se
    necessário. Inclui o duelo do chefe em andamento, quando houver.

    Uso: resolva pelo container e chame ``execute(data)`` com ``UUID``. O retorno é ``dict``.
    """

    def __init__(self, economy: IEconomyRepository) -> None:
        self._economy = economy

    def execute(self, data: UUID) -> dict:
        user = self._economy.require_user(data)
        weapon = self._economy.get_or_create_weapon(user)
        monsters = []
        for monster in self._economy.list_active_monsters():
            alive = _monster_alive(monster)
            remaining = 0
            if not alive and monster.defeated_at:
                remaining = max(
                    0,
                    int(
                        monster.respawn_seconds
                        - (timezone.now() - monster.defeated_at).total_seconds()
                    ),
                )
            monsters.append(
                {
                    "id": str(monster.id),
                    "name": monster.name,
                    "level": monster.level,
                    "required_weapon_level": monster.required_weapon_level,
                    "fragment_reward": monster.fragment_reward,
                    "is_boss": is_arena_boss(monster),
                    "alive": alive,
                    "respawn_in": remaining,
                }
            )
        duel = self._economy.get_boss_duel(user)
        return {
            "fichas": user.fichas,
            "weapon": {"level": weapon.level, "fragments": weapon.fragments},
            "monsters": monsters,
            "duel": _duel_dict(duel) if duel is not None else None,
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
    strike: bool = False


class FightMonsterUseCase(UseCase[FightMonsterInput, dict]):
    """Consome fichas para enfrentar um monstro disponível e registra combate, fragmentos, XP e
    progresso resultantes. Com a arma no máximo, só o chefe pode ser enfrentado. O chefe é um
    duelo de HP: o primeiro POST inicia (gasta a ficha) e os seguintes com ``strike`` resolvem
    uma rodada com crítico. Vitória entrega Adena, devolve ``run`` da corrida e zera encante e
    fragmentos da arma.

    Uso: resolva pelo container e chame ``execute(data)`` com ``FightMonsterInput``. O retorno é
    ``dict``.
    """

    def __init__(
        self,
        economy: IEconomyRepository,
        progress: IProgressRepository,
        battle_pass: IBattlePassRepository,
        bags: IBagRepository,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._economy = economy
        self._progress = progress
        self._battle_pass = battle_pass
        self._bags = bags
        self._unit_of_work = unit_of_work

    def execute(self, data: FightMonsterInput) -> dict:
        if self._economy.get_active_config() is None:
            raise GameInactiveError()
        with self._unit_of_work:
            user = self._economy.require_user_locked(data.user_id)
            weapon = self._economy.get_or_create_weapon_locked(user)
            duel = self._economy.get_boss_duel_locked(user)
            if data.strike:
                return self._strike_boss(user, weapon, duel, data.monster_id)
            monster = self._economy.get_active_monster(data.monster_id)
            if monster is None:
                raise EntityNotFoundError("Monstro não encontrado.")
            if is_arena_boss(monster):
                return self._start_or_resume_boss(user, weapon, monster, duel)
            if duel is not None:
                raise ValidationDomainError("Termine o duelo do chefe em andamento.")
            return self._fight_regular(user, weapon, monster)

    def _require_ready_weapon(self, weapon, monster) -> None:
        needed = monster.required_weapon_level
        if is_arena_boss(monster):
            needed = max(needed, ARENA_WEAPON_MAX)
        if weapon.level < needed:
            raise ValidationDomainError("Sua arma é fraca demais para este monstro.")
        if is_arena_regular_locked(
            weapon_level=int(weapon.level),
            is_boss=is_arena_boss(monster),
        ):
            raise ValidationDomainError(
                "A arma no máximo só enfrenta o chefe da arena."
            )

    def _start_or_resume_boss(self, user, weapon, monster, duel) -> dict:
        if duel is not None:
            if str(duel.monster.id) != str(monster.id):
                raise ValidationDomainError("Termine o duelo do chefe em andamento.")
            return _fight_result(
                won=None,
                phase="resume",
                rounds=duel.round,
                fragments=0,
                prize=None,
                run=None,
                weapon=weapon,
                fichas=user.fichas,
                duel=_duel_dict(duel),
            )
        if not _monster_alive(monster):
            raise ValidationDomainError("O monstro ainda não respawnou.")
        self._require_ready_weapon(weapon, monster)
        if user.fichas < 1:
            raise InsufficientTokensError()
        player_hp, _, _ = arena_player_stats(int(weapon.level))
        boss_hp = max(1, int(monster.hp))
        user.fichas -= 1
        user.save(update_fields=["fichas", "updated_at"])
        duel = self._economy.create_boss_duel(
            user=user,
            monster=monster,
            player_hp=player_hp,
            player_max_hp=player_hp,
            boss_hp=boss_hp,
            boss_max_hp=boss_hp,
        )
        return _fight_result(
            won=None,
            phase="start",
            rounds=0,
            fragments=0,
            prize=None,
            run=None,
            weapon=weapon,
            fichas=user.fichas,
            duel=_duel_dict(duel),
        )

    def _strike_boss(self, user, weapon, duel, monster_id: UUID) -> dict:
        if duel is None or str(duel.monster.id) != str(monster_id):
            raise ValidationDomainError("Não há duelo em andamento com este chefe.")
        monster = duel.monster
        _, player_attack, player_defense = arena_player_stats(int(weapon.level))
        outcome = resolve_arena_round(
            player_hp=int(duel.player_hp),
            player_attack=player_attack,
            player_defense=player_defense,
            boss_hp=int(duel.boss_hp),
            boss_attack=int(monster.attack),
            boss_defense=int(monster.defense),
        )
        duel.round = int(duel.round) + 1
        duel.player_hp = outcome.player_hp
        duel.boss_hp = outcome.boss_hp
        duel.player_damage = int(duel.player_damage) + int(outcome.player_hit.damage)
        if outcome.player_hit.crit:
            duel.player_crits = int(duel.player_crits) + 1
        if outcome.boss_hit is not None:
            duel.boss_damage = int(duel.boss_damage) + int(outcome.boss_hit.damage)
            if outcome.boss_hit.crit:
                duel.boss_crits = int(duel.boss_crits) + 1
        last = {
            "player": _hit_dict(outcome.player_hit),
            "boss": _hit_dict(outcome.boss_hit),
        }
        if outcome.boss_hp <= 0:
            return self._finish_boss(
                user=user,
                weapon=weapon,
                monster=monster,
                duel=duel,
                won=True,
                last=last,
            )
        if outcome.player_hp <= 0:
            return self._finish_boss(
                user=user,
                weapon=weapon,
                monster=monster,
                duel=duel,
                won=False,
                last=last,
            )
        self._economy.save_boss_duel(
            duel,
            update_fields=[
                "round",
                "player_hp",
                "boss_hp",
                "player_crits",
                "boss_crits",
                "player_damage",
                "boss_damage",
                "updated_at",
            ],
        )
        return _fight_result(
            won=None,
            phase="round",
            rounds=duel.round,
            fragments=0,
            prize=None,
            run=None,
            weapon=weapon,
            fichas=user.fichas,
            duel=_duel_dict(duel),
            last=last,
        )

    def _finish_boss(self, *, user, weapon, monster, duel, won: bool, last) -> dict:
        weapon_level = int(weapon.level)
        fragments = 0
        prize = None
        run = {
            "weapon_level": weapon_level,
            "fragments": int(weapon.fragments),
            "rounds": int(duel.round),
            "boss_name": monster.name,
            "player_crits": int(duel.player_crits),
            "boss_crits": int(duel.boss_crits),
            "player_damage": int(duel.player_damage),
            "boss_damage": int(duel.boss_damage),
        }
        if won:
            add_to_bag(
                user,
                item_id=ARENA_BOSS_ITEM_ID,
                item_name=ARENA_BOSS_ITEM_NAME,
                quantity=ARENA_BOSS_ADENA,
                bags=self._bags,
            )
            weapon.level = 0
            weapon.fragments = 0
            self._economy.save_weapon(
                weapon, update_fields=["level", "fragments", "updated_at"]
            )
            monster.defeated_at = timezone.now()
            self._economy.save_monster(
                monster, update_fields=["defeated_at", "updated_at"]
            )
            add_xp(user, 6, self._progress)
            add_battle_pass_xp(
                user, 4, battle_pass=self._battle_pass, bags=self._bags
            )
            prize = {
                "item_id": ARENA_BOSS_ITEM_ID,
                "item_name": ARENA_BOSS_ITEM_NAME,
                "quantity": ARENA_BOSS_ADENA,
            }
        else:
            run = None
        self._economy.create_fight_log(
            user=user,
            monster=monster,
            won=won,
            rounds=int(duel.round),
            fragments_earned=fragments,
        )
        self._economy.delete_boss_duel(user)
        return _fight_result(
            won=won,
            phase="win" if won else "loss",
            rounds=int(duel.round),
            fragments=fragments,
            prize=prize,
            run=run,
            weapon=weapon,
            fichas=user.fichas,
            last=last,
        )

    def _fight_regular(self, user, weapon, monster) -> dict:
        if not _monster_alive(monster):
            raise ValidationDomainError("O monstro ainda não respawnou.")
        self._require_ready_weapon(weapon, monster)
        if user.fichas < 1:
            raise InsufficientTokensError()
        user.fichas -= 1
        weapon_level = int(weapon.level)
        required = int(monster.required_weapon_level)
        if is_arena_overlevel(
            weapon_level=weapon_level,
            required_weapon_level=required,
            is_boss=False,
        ):
            won, rounds = True, random.randint(2, 6)
        else:
            won, rounds = resolve_arena_fight(
                weapon_level=weapon_level,
                required_weapon_level=required,
                monster_attack=int(monster.attack),
                is_boss=False,
            )
        fragments = monster.fragment_reward if won else 0
        prize = None
        if won:
            weapon.fragments += fragments
            self._economy.save_weapon(
                weapon, update_fields=["fragments", "updated_at"]
            )
            monster.defeated_at = timezone.now()
            self._economy.save_monster(
                monster, update_fields=["defeated_at", "updated_at"]
            )
            add_xp(user, 6, self._progress)
            add_battle_pass_xp(
                user, 4, battle_pass=self._battle_pass, bags=self._bags
            )
        user.save(update_fields=["fichas", "updated_at"])
        self._economy.create_fight_log(
            user=user,
            monster=monster,
            won=won,
            rounds=rounds,
            fragments_earned=fragments,
        )
        return _fight_result(
            won=won,
            phase="win" if won else "loss",
            rounds=rounds,
            fragments=fragments,
            prize=prize,
            run=None,
            weapon=weapon,
            fichas=user.fichas,
        )


@dataclass(frozen=True, slots=True)
class EnchantWeaponInput:
    """Dados de entrada de ``EnchantWeaponUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID


class EnchantWeaponUseCase(UseCase[EnchantWeaponInput, dict]):
    """Consome fragmentos para tentar evoluir a arma até o máximo da arena.

    Uso: resolva pelo container e chame ``execute(data)`` com ``EnchantWeaponInput``. O retorno
    é ``dict``. O prêmio da arena sai da vitória contra o chefe, não deste encante.
    """

    def __init__(
        self,
        economy: IEconomyRepository,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._economy = economy
        self._unit_of_work = unit_of_work

    def execute(self, data: EnchantWeaponInput) -> dict:
        with self._unit_of_work:
            user = self._economy.require_user(data.user_id)
            weapon = self._economy.get_or_create_weapon_locked(user)
            if weapon.level >= ARENA_WEAPON_MAX:
                raise ValidationDomainError(
                    "A arma já está no máximo. Derrote o chefe da arena para receber o prêmio."
                )
            if weapon.fragments < 10:
                raise ValidationDomainError("Você precisa de 10 fragmentos.")
            weapon.fragments -= 10
            chance = max(20, int(95 - weapon.level * 7))
            success = random.randint(1, 100) <= chance
            if success:
                weapon.level += 1
            self._economy.save_weapon(
                weapon, update_fields=["level", "fragments", "updated_at"]
            )
        return {
            "success": success,
            "weapon": {"level": weapon.level, "fragments": weapon.fragments},
        }
