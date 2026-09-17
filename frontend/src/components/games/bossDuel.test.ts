import { expect, it, vi } from 'vitest'
import {
  BOSS_BOSS_ACT_MS,
  BOSS_PLAYER_ACT_MS,
  arenaHpRatio,
  bossDuelView,
  playBossRound,
} from './bossDuel'

it('mapeia HP real para a barra e a próxima rodada', () => {
  expect(arenaHpRatio(135, 270)).toBe(0.5)
  expect(arenaHpRatio(0, 480)).toBe(0)
  const view = bossDuelView({
    player_hp: 270,
    player_max_hp: 270,
    boss_hp: 480,
    boss_max_hp: 480,
    round: 0,
  })
  expect(view.open).toBe(true)
  expect(view.turn).toBe(1)
  expect(view.playerHp).toBe(1)
  expect(view.bossHp).toBe(1)
})

it('anima o golpe do jogador e só então o do chefe', () => {
  vi.useFakeTimers()
  const phases: string[] = []
  const done = vi.fn()
  playBossRound({
    bossReplies: true,
    onPhase: (phase) => phases.push(phase),
    onDone: done,
  })
  expect(phases).toEqual(['playerAct'])
  expect(done).not.toHaveBeenCalled()
  vi.advanceTimersByTime(BOSS_PLAYER_ACT_MS)
  expect(phases).toEqual(['playerAct', 'bossAct'])
  vi.advanceTimersByTime(BOSS_BOSS_ACT_MS)
  expect(done).toHaveBeenCalledTimes(1)
  vi.useRealTimers()
})

it('encerra na hora quando o chefe cai no golpe do jogador', () => {
  vi.useFakeTimers()
  const phases: string[] = []
  const done = vi.fn()
  playBossRound({
    bossReplies: false,
    onPhase: (phase) => phases.push(phase),
    onDone: done,
  })
  vi.advanceTimersByTime(BOSS_PLAYER_ACT_MS)
  expect(phases).toEqual(['playerAct'])
  expect(done).toHaveBeenCalledTimes(1)
  vi.useRealTimers()
})
