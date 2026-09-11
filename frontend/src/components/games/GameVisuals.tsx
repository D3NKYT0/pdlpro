import type { CSSProperties } from 'react'
import { Coins, Crown, Gem, ScrollText, Shield, Sword, Trophy, type LucideIcon } from 'lucide-react'
import {
  DICE_PIP_FACES,
  inferBoxRarity,
  isSlotSymbol,
  monsterHue,
  visibleSlotReels,
  type GameRarity,
  type SlotSymbol,
} from './gameArt'

const SLOT_ICONS: Record<SlotSymbol, LucideIcon> = {
  sword: Sword,
  shield: Shield,
  crown: Crown,
  adena: Coins,
  scroll: ScrollText,
}

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

function DicePips({ face }: { face: number }) {
  const pips = DICE_PIP_FACES[face] ?? DICE_PIP_FACES[5]
  return (
    <span className="chance-die" data-face={face} aria-hidden="true">
      {Array.from({ length: 9 }, (_, index) => (
        <i key={index} data-pip={index + 1} className={pips.includes(index + 1) ? 'is-on' : undefined} />
      ))}
    </span>
  )
}

export function ChanceStage({
  rolling = false,
  roll,
  spinningSlots = false,
  reels,
  symbols = [],
  diceLabel,
  slotsLabel,
  symbolLabel,
}: {
  rolling?: boolean
  roll?: number
  spinningSlots?: boolean
  reels?: string[]
  symbols?: string[]
  diceLabel: string
  slotsLabel: string
  symbolLabel: (symbol: string) => string
}) {
  const face = roll && roll >= 1 && roll <= 6 ? roll : 5
  const slots = visibleSlotReels(reels, symbols)
  return (
    <div className="chance-stage" data-theme-part="game-stage">
      <div className={`chance-dice${rolling ? ' is-rolling' : roll ? '' : ' is-idle'}`}>
        <span className="panel-eyebrow">{diceLabel}</span>
        <DicePips face={face} />
      </div>
      <div className={`chance-slots${spinningSlots ? ' is-spinning' : ''}`}>
        <span className="panel-eyebrow">{slotsLabel}</span>
        <div className="chance-reels">
          {slots.map((symbol, index) => {
            const Icon = isSlotSymbol(symbol) ? SLOT_ICONS[symbol] : Gem
            return (
              <span className="chance-reel" data-symbol={symbol} key={`${symbol}-${index}`}>
                <Icon aria-hidden="true" />
                <small>{symbolLabel(symbol)}</small>
              </span>
            )
          })}
        </div>
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
