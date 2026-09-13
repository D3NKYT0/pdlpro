import type { CSSProperties } from 'react'
import { Trophy, X } from 'lucide-react'
import { ItemIcon } from '../ItemIcon'
import { formatCompactQuantity } from '../../lib/formatters'
import {
  DICE_PIP_FACES,
  inferBoxRarity,
  monsterHue,
  normalizeGameRarity,
  normalizeRouletteRarity,
  resolveFishArt,
  rouletteReelStrip,
  type FishArtId,
  type GameRarity,
  type RouletteReelPrize,
  SLOT_SYMBOLS,
  visibleSlotReels,
} from './gameArt'
import { SlotMark } from './slotSymbols'

const ROULETTE_SPARKS = 12
const ROULETTE_BOOMS = 6
const ROULETTE_MOTES = 12
const ROULETTE_FIELD_SPECKS = 18

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
        <div className="roulette-backdrop" aria-hidden="true">
          <i className="roulette-backdrop-wash" />
          <i className="roulette-backdrop-rays" />
          <i className="roulette-backdrop-dust" />
          {Array.from({ length: ROULETTE_MOTES }, (_, index) => (
            <i
              key={index}
              className="roulette-mote"
              style={
                {
                  '--mote-a': `${index * (360 / ROULETTE_MOTES)}deg`,
                  '--mote-d': `${(index % 6) * 0.4}s`,
                  '--mote-r': `${72 + (index % 4) * 18}px`,
                } as CSSProperties
              }
            />
          ))}
        </div>
        <i className="roulette-orbit-ring" />
        <div className="roulette-core">
          <i className="roulette-core-glow" />
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
              {Array.from({ length: ROULETTE_BOOMS }, (_, index) => (
                <i
                  key={index}
                  className="roulette-boom"
                  style={{ '--boom-a': `${index * (360 / ROULETTE_BOOMS)}deg` } as CSSProperties}
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
    </div>
  )
}

export function RouletteField() {
  return (
    <div className="roulette-field" aria-hidden="true">
      <i className="roulette-field-veil" />
      <i className="roulette-field-band" />
      <i className="roulette-field-band is-late" />
      {Array.from({ length: ROULETTE_FIELD_SPECKS }, (_, index) => (
        <i
          key={index}
          className="roulette-field-speck"
          style={
            {
              '--speck-x': `${6 + ((index * 17) % 88)}%`,
              '--speck-d': `${(index % 9) * 0.45}s`,
              '--speck-s': `${0.55 + (index % 5) * 0.18}`,
            } as CSSProperties
          }
        />
      ))}
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
  hunt = false,
  variant = 'card',
  prizeName,
  prizeItemId,
  prizeCaption,
}: {
  name: string
  price?: string | number
  opening?: boolean
  claimed?: boolean
  hunt?: boolean
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
      className={`game-chest rarity-${rarity}${hero ? ' is-hero' : ''}${opening ? ' is-opening' : ''}${won ? ' is-win' : ''}${claimed && !hero ? ' is-claimed' : ''}${hunt && won ? ' is-hunt' : ''}`}
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

function DieFace({ face, chosen = false }: { face: number; chosen?: boolean }) {
  const pips = DICE_PIP_FACES[face] ?? DICE_PIP_FACES[5]
  return (
    <span className={`chance-die-face${chosen ? ' is-front' : ''}`} data-pip-face={face}>
      {Array.from({ length: 9 }, (_, index) => (
        <i key={index} data-pip={index + 1} className={pips.includes(index + 1) ? 'is-on' : undefined} />
      ))}
    </span>
  )
}

function DiceCube({ face, chosen = false }: { face: number; chosen?: boolean }) {
  return (
    <div className="chance-die" data-face={face} aria-hidden="true">
      <div className="chance-die-cube">
        {([1, 2, 3, 4, 5, 6] as const).map((side) => (
          <DieFace key={side} face={side} chosen={chosen && side === face} />
        ))}
      </div>
    </div>
  )
}

export function ChanceStage({
  rolling = false,
  roll,
  chosen = false,
  won = false,
  spinningSlots = false,
  slotsWon = false,
  reels,
  symbols = [],
  diceLabel,
  slotsLabel,
  symbolLabel,
}: {
  rolling?: boolean
  roll?: number
  chosen?: boolean
  won?: boolean
  spinningSlots?: boolean
  slotsWon?: boolean
  reels?: string[]
  symbols?: string[]
  diceLabel: string
  slotsLabel: string
  symbolLabel: (symbol: string) => string
}) {
  const face = roll && roll >= 1 && roll <= 6 ? roll : 5
  const slots = visibleSlotReels(reels, symbols)
  const strip = [...SLOT_SYMBOLS, ...SLOT_SYMBOLS, ...SLOT_SYMBOLS, ...SLOT_SYMBOLS]
  const diceState = rolling
    ? ' is-rolling'
    : chosen
      ? ` is-chosen${won ? ' is-win' : ''}`
      : roll
        ? ' is-rest'
        : ' is-idle'
  return (
    <div className="chance-stage" data-theme-part="game-stage">
      <div className={`chance-dice${diceState}`}>
        <span className="panel-eyebrow">{diceLabel}</span>
        <div className="chance-dice-felt">
          <i className="chance-dice-glow" aria-hidden="true" />
          <i className="chance-die-ring" aria-hidden="true" />
          <DiceCube key={rolling ? 'rolling' : `rest-${face}`} face={face} chosen={chosen} />
          <i className="chance-die-shadow" aria-hidden="true" />
        </div>
      </div>
      <div className={`chance-slots${spinningSlots ? ' is-spinning' : ''}${slotsWon && !spinningSlots ? ' is-win' : ''}`}>
        <span className="panel-eyebrow">{slotsLabel}</span>
        <div className="chance-slots-cabinet" key={spinningSlots ? 'spin' : 'rest'}>
          <span className="chance-slots-marquee" aria-hidden="true">
            {Array.from({ length: 7 }, (_, index) => (
              <i key={index} />
            ))}
          </span>
          <div className="chance-slots-screen">
            <i className="chance-slots-glass" aria-hidden="true" />
            <div className="chance-reels">
              <i className="chance-slots-payline" aria-hidden="true" />
              {slots.map((symbol, index) => (
                <span className="chance-reel" data-symbol={symbol} key={`${symbol}-${index}`}>
                  <span className="chance-reel-window">
                    <i className="chance-reel-shine" aria-hidden="true" />
                    <span className="chance-reel-plate" data-symbol={symbol}>
                      <SlotMark symbol={symbol} />
                    </span>
                    <span className="chance-reel-strip" aria-hidden="true">
                      {strip.map((item, itemIndex) => (
                        <span className="chance-reel-cell" data-symbol={item} key={`${item}-${itemIndex}`}>
                          <SlotMark symbol={item} />
                        </span>
                      ))}
                    </span>
                  </span>
                  <small>{symbolLabel(symbol)}</small>
                </span>
              ))}
            </div>
          </div>
          <i className="chance-slots-tray" aria-hidden="true" />
          {slotsWon && !spinningSlots ? (
            <span className="chance-slots-burst" aria-hidden="true">
              {Array.from({ length: 10 }, (_, index) => (
                <i key={index} className="chance-slots-spark" style={{ '--spark-i': index } as CSSProperties} />
              ))}
            </span>
          ) : null}
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

const POND_SCHOOL: Array<{ id: FishArtId; delay: string; duration: string; top: string; scale: number }> = [
  { id: 'lambari', delay: '0s', duration: '12s', top: '58%', scale: 0.42 },
  { id: 'dourado', delay: '-3.2s', duration: '15s', top: '70%', scale: 0.56 },
  { id: 'piraiba', delay: '-6.4s', duration: '18s', top: '64%', scale: 0.72 },
  { id: 'pirarucu', delay: '-9s', duration: '16s', top: '76%', scale: 0.64 },
]

export type FishingPondState = 'idle' | 'casting' | 'bite' | 'caught' | 'escaped'

export function FishPortrait({
  name,
  rarity,
  discovered = true,
  size = 'card',
}: {
  name?: string | null
  rarity?: string | null
  discovered?: boolean
  size?: 'card' | 'hero' | 'chip'
}) {
  const art = resolveFishArt(name, rarity)
  return (
    <span
      className={`fishing-fish is-${size}${discovered ? '' : ' is-locked'}`}
      data-fish={art}
      data-rarity={normalizeGameRarity(rarity)}
      aria-hidden="true"
    >
      <i className="fishing-fish-art" />
    </span>
  )
}

export function FishingPond({
  state = 'idle',
  fishName,
  fishRarity,
}: {
  state?: FishingPondState
  fishName?: string | null
  fishRarity?: string | null
}) {
  const featured = fishName ? resolveFishArt(fishName, fishRarity) : null
  return (
    <div className={`fishing-pond is-${state}`} data-theme-part="game-stage" aria-hidden="true">
      <i className="fishing-pond-art" />
      <i className="fishing-pond-mist" />
      <div className="fishing-school">
        {POND_SCHOOL.map((fish) => (
          <span
            className="fishing-swimmer"
            data-fish={fish.id}
            key={fish.id}
            style={
              {
                '--swim-delay': fish.delay,
                '--swim-duration': fish.duration,
                '--swim-top': fish.top,
                '--swim-scale': fish.scale,
              } as CSSProperties
            }
          >
            <i className="fishing-swimmer-wake" />
            <i className="fishing-swimmer-wake is-late" />
            <i className="fishing-swimmer-body" />
          </span>
        ))}
      </div>
      <i className="fishing-line" />
      <i className="fishing-bobber" />
      <i className="fishing-pond-ripple" />
      <i className="fishing-pond-ripple is-late" />
      <i className="fishing-splash" />
      {featured ? (
        <span
          className="fishing-catch"
          data-fish={featured}
          data-rarity={normalizeGameRarity(fishRarity)}
        >
          <i className="fishing-catch-glow" />
          <i className="fishing-catch-art" />
        </span>
      ) : null}
    </div>
  )
}
