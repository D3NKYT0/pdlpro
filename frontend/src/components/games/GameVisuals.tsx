import type { CSSProperties } from 'react'
import { Trophy } from 'lucide-react'
import { DICE_FACES, inferBoxRarity, monsterHue, type GameRarity } from './gameArt'

export function RouletteWheel({
  tokens,
  spinning = false,
  missed = false,
  prizeName,
}: {
  tokens: number
  spinning?: boolean
  missed?: boolean
  prizeName?: string | null
}) {
  const state = spinning ? 'is-spinning' : missed ? 'is-miss' : prizeName ? 'is-win' : ''
  return (
    <div className={`roulette-orbit ${state}`.trim()} data-theme-part="game-stage" aria-hidden="true">
      <i className="roulette-orbit-ring">
        <i className="roulette-orbit-flare" />
      </i>
      <Trophy />
      <span>{tokens}</span>
    </div>
  )
}

export function BoxChest({
  name,
  price,
  opening = false,
}: {
  name: string
  price?: string | number
  opening?: boolean
}) {
  const rarity: GameRarity = inferBoxRarity(name, price)
  return (
    <div
      className={`game-chest rarity-${rarity}${opening ? ' is-opening' : ''}`}
      data-theme-part="game-chest"
      data-rarity={rarity}
      aria-hidden="true"
    />
  )
}

export function ChanceStage({
  rolling = false,
  roll,
  spinningSlots = false,
  reels,
  symbols = [],
}: {
  rolling?: boolean
  roll?: number
  spinningSlots?: boolean
  reels?: string[]
  symbols?: string[]
}) {
  const face = roll && roll >= 1 && roll <= 6 ? DICE_FACES[roll] : '🎲'
  const shown = reels?.length ? reels : symbols.slice(0, 3)
  const slots = shown.length ? shown : ['♦', '♦', '♦']
  return (
    <div className="chance-stage" data-theme-part="game-stage">
      <div className={`chance-dice${rolling ? ' is-rolling' : ''}`} aria-hidden="true">
        <b>{face}</b>
      </div>
      <div className={`chance-slots${spinningSlots ? ' is-spinning' : ''}`} aria-hidden="true">
        {slots.map((symbol, index) => (
          <span className="chance-reel" key={`${symbol}-${index}`}>
            {symbol}
          </span>
        ))}
      </div>
    </div>
  )
}

export function MonsterPortrait({ id, down = false, fighting = false }: { id: string; down?: boolean; fighting?: boolean }) {
  return (
    <div
      className={`monster-portrait${down ? ' is-down' : ''}${fighting ? ' is-fighting' : ''}`}
      data-theme-part="game-portrait"
      style={{ '--monster-hue': `${monsterHue(id)}deg` } as CSSProperties}
      aria-hidden="true"
    />
  )
}

export function FishingPond({
  state = 'idle',
}: {
  state?: 'idle' | 'casting' | 'caught' | 'escaped'
}) {
  return (
    <div className={`fishing-pond is-${state}`} data-theme-part="game-stage" aria-hidden="true">
      <i className="fishing-pond-art" />
      <i className="fishing-pond-ripple" />
    </div>
  )
}
