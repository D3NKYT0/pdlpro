/** Animação de uma rodada do duelo do chefe: o jogador golpeia e o chefe responde. */
export const BOSS_PLAYER_ACT_MS = 720
export const BOSS_BOSS_ACT_MS = 980

export type BossDuelPhase = 'player' | 'playerAct' | 'bossAct'

export type ArenaCombatHit = {
  damage: number
  crit: boolean
}

export type BossDuelSnapshot = {
  player_hp: number
  player_max_hp: number
  boss_hp: number
  boss_max_hp: number
  round: number
}

export type BossDuelView = {
  open: boolean
  hits: number
  phase: BossDuelPhase
  turn: number
  playerHp: number
  bossHp: number
  playerHpNow: number
  playerMaxHp: number
  bossHpNow: number
  bossMaxHp: number
  playerHit?: ArenaCombatHit | null
  bossHit?: ArenaCombatHit | null
}

export function arenaHpRatio(current: number, max: number) {
  if (max <= 0) return 1
  return Math.max(0, Math.min(1, current / max))
}

export function bossDuelView(
  duel: BossDuelSnapshot,
  extras: Partial<Pick<BossDuelView, 'open' | 'phase' | 'playerHit' | 'bossHit'>> = {},
): BossDuelView {
  const phase = extras.phase ?? 'player'
  return {
    open: extras.open ?? phase === 'player',
    hits: duel.round,
    phase,
    turn: Math.max(1, duel.round + (phase === 'player' ? 1 : 0)),
    playerHp: arenaHpRatio(duel.player_hp, duel.player_max_hp),
    bossHp: arenaHpRatio(duel.boss_hp, duel.boss_max_hp),
    playerHpNow: duel.player_hp,
    playerMaxHp: duel.player_max_hp,
    bossHpNow: duel.boss_hp,
    bossMaxHp: duel.boss_max_hp,
    playerHit: extras.playerHit,
    bossHit: extras.bossHit,
  }
}

export function playBossRound({
  bossReplies,
  onPhase,
  onDone,
}: {
  bossReplies: boolean
  onPhase: (phase: BossDuelPhase) => void
  onDone: () => void
}) {
  let stopped = false
  let timer: ReturnType<typeof globalThis.setTimeout> | undefined

  const clear = () => {
    if (timer !== undefined) globalThis.clearTimeout(timer)
    timer = undefined
  }

  onPhase('playerAct')
  timer = globalThis.setTimeout(() => {
    if (stopped) return
    if (!bossReplies) {
      onDone()
      return
    }
    onPhase('bossAct')
    timer = globalThis.setTimeout(() => {
      if (stopped) return
      onDone()
    }, BOSS_BOSS_ACT_MS)
  }, BOSS_PLAYER_ACT_MS)

  return {
    stop() {
      stopped = true
      clear()
    },
  }
}
