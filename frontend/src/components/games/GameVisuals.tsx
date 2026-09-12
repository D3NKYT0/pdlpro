import type { CSSProperties } from 'react'
import { Coins, Crown, Gem, ScrollText, Shield, Sword, Trophy, X, type LucideIcon } from 'lucide-react'
import { ItemIcon } from '../ItemIcon'
import { formatCompactQuantity } from '../../lib/formatters'
import {
  DICE_PIP_FACES,
  inferBoxRarity,
  isSlotSymbol,
  monsterHue,
  normalizeRouletteRarity,
  rouletteReelStrip,
  type GameRarity,
  type RouletteReelPrize,
  type SlotSymbol,
  visibleSlotReels,
} from './gameArt'

const SLOT_ICONS: Record<SlotSymbol, LucideIcon> = {
  sword: Sword,
  shield: Shield,
  crown: Crown,
  adena: Coins,
  scroll: ScrollText,
}

const ROULETTE_SPARKS = 12
const ROULETTE_BOOMS = [
  { x: '22%', y: '18%' },
  { x: '78%', y: '20%' },
  { x: '16%', y: '62%' },
  { x: '84%', y: '58%' },
  { x: '38%', y: '12%' },
  { x: '64%', y: '80%' },
] as const

export function RouletteWheel({
  tokens,
  spinning = false,
  slowing = false,
  missed = false,
  prizeName,
  prizeQuantity,
  prizeItemId,
  prizes = [],
  missLabel,
}: {
  tokens: number
  spinning?: boolean
  slowing?: boolean
  missed?: boolean
  prizeName?: string | null
  prizeQuantity?: number
  prizeItemId?: number
  prizes?: RouletteReelPrize[]
  missLabel: string
}) {
  const won = Boolean(prizeName) && !spinning
  const state = [
    spinning ? 'is-spinning' : '',
    spinning && slowing ? 'is-slowing' : '',
    missed && !spinning ? 'is-miss' : '',
    won ? 'is-win' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const strip = rouletteReelStrip(prizes)
  const quantity = prizeQuantity ?? 1
  return (
    <div className={`roulette-stage ${state}`.trim()} data-theme-part="game-stage">
      <div className={`roulette-orbit ${state}`.trim()} aria-hidden={won || missed ? undefined : true}>
        <div className="roulette-reel">
          <div className="roulette-reel-track">
            {strip.map((prize, index) => (
              <span
                className="roulette-reel-item"
                data-rarity={normalizeRouletteRarity(prize.rarity)}
                key={`${prize.id}-${index}`}
              >
                <ItemIcon itemId={prize.item_id} name={prize.name} size={28} />
              </span>
            ))}
          </div>
        </div>
        <i className="roulette-window" />
        <i className="roulette-orbit-ring">
          <i className="roulette-orbit-flare" />
        </i>
        {won ? (
          <div className="roulette-burst" aria-hidden="true">
            <i className="roulette-flash" />
            {Array.from({ length: ROULETTE_SPARKS }, (_, index) => (
              <i
                key={index}
                className="roulette-spark"
                style={{ '--spark-a': `${index * (360 / ROULETTE_SPARKS)}deg` } as CSSProperties}
              />
            ))}
            {ROULETTE_BOOMS.map((boom) => (
              <i
                key={`${boom.x}-${boom.y}`}
                className="roulette-boom"
                style={{ top: boom.y, left: boom.x }}
              />
            ))}
          </div>
        ) : null}
        {won ? (
          <div className="roulette-prize" role="status">
            <ItemIcon itemId={prizeItemId} name={prizeName} size={48} />
            <strong>{prizeName}</strong>
            <small>{formatCompactQuantity(quantity)}</small>
          </div>
        ) : null}
        {missed && !spinning ? (
          <>
            <div className="roulette-miss-burst" aria-hidden="true">
              <i className="roulette-miss-flash" />
              <i className="roulette-miss-ember" />
              <i className="roulette-miss-ember" />
              <i className="roulette-miss-ember" />
            </div>
            <p className="roulette-prize is-miss" role="status">
              <X aria-hidden="true" />
              <span>{missLabel}</span>
            </p>
          </>
        ) : null}
        {!spinning && !prizeName && !missed ? (
          <div className="roulette-hub">
            <Trophy />
            <span>{tokens}</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

const BOX_SPARKS = 22
const PRIZE_MOTES = 16
const BOX_BOOMS = [
  { x: '14%', y: '16%' },
  { x: '50%', y: '8%' },
  { x: '86%', y: '18%' },
  { x: '10%', y: '48%' },
  { x: '90%', y: '46%' },
  { x: '22%', y: '78%' },
  { x: '50%', y: '86%' },
  { x: '78%', y: '76%' },
] as const

export function BoxChest({
  name,
  price,
  opening = false,
  claimed = false,
  variant = 'card',
  prizeName,
  prizeItemId,
  prizeCaption,
}: {
  name: string
  price?: string | number
  opening?: boolean
  claimed?: boolean
  variant?: 'card' | 'hero'
  prizeName?: string | null
  prizeItemId?: number
  prizeCaption?: string
}) {
  const rarity: GameRarity = inferBoxRarity(name, price)
  const hero = variant === 'hero'
  const won = Boolean(prizeName) && !opening
  const burst = won ? (
    <div className="game-chest-burst" aria-hidden="true">
      <i className="game-chest-flash" />
      <i className="game-chest-flash is-late" />
      {hero ? (
        <>
          <i className="game-chest-ring" />
          <i className="game-chest-ring" />
          <i className="game-chest-ring" />
        </>
      ) : null}
      {Array.from({ length: hero ? BOX_SPARKS : 10 }, (_, index) => (
        <i
          key={index}
          className="game-chest-spark"
          style={
            {
              '--spark-a': `${index * (360 / (hero ? BOX_SPARKS : 10))}deg`,
              '--spark-d': `${(index % 7) * 70}ms`,
            } as CSSProperties
          }
        />
      ))}
      {BOX_BOOMS.map((boom, index) => (
        <i
          key={`${boom.x}-${boom.y}`}
          className="game-chest-boom"
          style={{ top: boom.y, left: boom.x, animationDelay: `${index * 70}ms` }}
        />
      ))}
    </div>
  ) : null
  return (
    <div
      className={`game-chest rarity-${rarity}${hero ? ' is-hero' : ''}${opening ? ' is-opening' : ''}${won ? ' is-win' : ''}${claimed && !hero ? ' is-claimed' : ''}`}
      data-theme-part="game-chest"
      data-rarity={rarity}
      aria-hidden={won ? undefined : true}
    >
      {hero ? (
        <span className="game-chest-stage">
          <i className="game-chest-glow" />
          <i className="game-chest-beam" />
          <i className="game-chest-art" />
          {burst}
        </span>
      ) : (
        <>
          <i className="game-chest-glow" />
          <i className="game-chest-art" />
          {claimed ? <i className="game-chest-claimed" aria-hidden="true" /> : null}
          {burst}
        </>
      )}
      {won ? (
        <div className="game-chest-prize" role="status">
          {hero ? (
            <span className="game-chest-prize-icon">
              <span className="game-chest-prize-aura" aria-hidden="true">
                <i className="game-chest-rays" />
                <i className="game-chest-rays is-cross" />
                {Array.from({ length: PRIZE_MOTES }, (_, index) => (
                  <i
                    key={index}
                    className="game-chest-mote"
                    style={
                      {
                        '--mote-a': `${index * (360 / PRIZE_MOTES)}deg`,
                        '--mote-d': `${(index % 8) * 90}ms`,
                      } as CSSProperties
                    }
                  />
                ))}
              </span>
              <span className="game-chest-prize-core">
                <i className="game-chest-prize-shine" aria-hidden="true" />
                <ItemIcon itemId={prizeItemId} name={prizeName} size={72} />
              </span>
            </span>
          ) : (
            <ItemIcon itemId={prizeItemId} name={prizeName} size={48} />
          )}
          <strong>{prizeName}</strong>
          {prizeCaption ? <small>{prizeCaption}</small> : null}
        </div>
      ) : null}
    </div>
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
