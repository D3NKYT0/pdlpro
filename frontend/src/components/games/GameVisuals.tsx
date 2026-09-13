import { useId, type CSSProperties } from 'react'
import { Trophy, X } from 'lucide-react'
import { ItemIcon } from '../ItemIcon'
import { formatCompactQuantity } from '../../lib/formatters'
import {
  DICE_PIP_FACES,
  fishArtVar,
  inferBoxRarity,
  monsterHue,
  normalizeFishRarity,
  normalizeRouletteRarity,
  resolveFishArt,
  rouletteReelStrip,
  swordArtVar,
  swordEnchantLevel,
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

export function MonsterPortrait({
  id,
  down = false,
  fighting = false,
  size = 'card',
}: {
  id: string
  down?: boolean
  fighting?: boolean
  size?: 'card' | 'hero'
}) {
  return (
    <div
      className={`monster-portrait${down ? ' is-down' : ''}${fighting ? ' is-fighting' : ''}${size === 'hero' ? ' is-hero' : ''}`}
      data-theme-part="game-portrait"
      style={{ '--monster-hue': `${monsterHue(id)}deg` } as CSSProperties}
      aria-hidden="true"
    />
  )
}

export function WeaponArt({
  level,
  className,
}: {
  level: number
  className?: string
}) {
  const enchant = swordEnchantLevel(level)
  return (
    <span
      className={`weapon-art${className ? ` ${className}` : ''}`}
      data-enchant={enchant}
      style={{ '--weapon-art': swordArtVar(enchant) } as CSSProperties}
      aria-hidden="true"
    />
  )
}

const BATTLE_SPARKS = 16
const BATTLE_MOTES = 12
const BATTLE_HITS = 4

export type BattlePhase = 'idle' | 'clash' | 'win' | 'loss'

export function BattleStage({
  phase = 'idle',
  monsterId,
  monsterName,
  weaponLevel = 0,
  idleLabel,
  clashLabel,
  playerLabel,
  versusLabel,
  winLabel,
  lossLabel,
  fragmentsLabel,
  roundsLabel,
}: {
  phase?: BattlePhase
  monsterId?: string
  monsterName?: string
  weaponLevel?: number
  idleLabel: string
  clashLabel: string
  playerLabel: string
  versusLabel: string
  winLabel: string
  lossLabel: string
  fragmentsLabel?: string
  roundsLabel?: string
}) {
  const fighting = phase === 'clash'
  const won = phase === 'win'
  const lost = phase === 'loss'
  const status = won ? winLabel : lost ? lossLabel : fighting ? clashLabel : idleLabel
  return (
    <div className={`battle-stage is-${phase}`} data-theme-part="game-stage">
      <div className="battle-field" aria-hidden="true">
        <i className="battle-field-veil" />
        <i className="battle-field-wash" />
        <i className="battle-field-rays" />
        <i className="battle-field-dust" />
        <i className="battle-pillar is-left" />
        <i className="battle-pillar is-right" />
        <i className="battle-floor" />
        {Array.from({ length: BATTLE_MOTES }, (_, index) => (
          <i
            key={index}
            className="battle-mote"
            style={
              {
                '--mote-a': `${index * (360 / BATTLE_MOTES)}deg`,
                '--mote-d': `${(index % 6) * 0.28}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className="battle-ring">
        <div className={`battle-fighter is-player${lost ? ' is-down' : ''}${fighting ? ' is-fighting' : ''}${won ? ' is-victor' : ''}`}>
          <i className="battle-fighter-glow" />
          <div className="battle-fighter-art" data-theme-part="game-portrait">
            <WeaponArt level={weaponLevel} />
          </div>
          <i className="battle-pedestal" />
          <span className="battle-hp" aria-hidden="true">
            <i className="battle-hp-fill is-player" />
          </span>
          <span className="battle-plate">
            <small>{playerLabel}</small>
            <b>+{weaponLevel}</b>
          </span>
        </div>
        <div className="battle-clash" aria-hidden="true">
          <strong className="battle-vs">{versusLabel}</strong>
          <i className="battle-slash" />
          <i className="battle-slash is-cross" />
          <i className="battle-slash is-late" />
          <i className="battle-impact" />
          <i className="battle-shock" />
          {fighting ? (
            <span className="battle-hits">
              {Array.from({ length: BATTLE_HITS }, (_, index) => (
                <i
                  key={index}
                  className="battle-hit"
                  style={{ '--hit-d': `${index * 420}ms` } as CSSProperties}
                />
              ))}
            </span>
          ) : null}
          {fighting || won ? (
            <span className="battle-burst">
              <i className="battle-flash" />
              {Array.from({ length: BATTLE_SPARKS }, (_, index) => (
                <i
                  key={index}
                  className="battle-spark"
                  style={
                    {
                      '--spark-a': `${index * (360 / BATTLE_SPARKS)}deg`,
                      '--spark-d': `${(index % 5) * 40}ms`,
                    } as CSSProperties
                  }
                />
              ))}
            </span>
          ) : null}
        </div>
        <div className={`battle-fighter is-monster${won ? ' is-down' : ''}${fighting ? ' is-fighting' : ''}${lost ? ' is-victor' : ''}`}>
          <i className="battle-fighter-glow" />
          {monsterId ? (
            <MonsterPortrait id={monsterId} down={won} fighting={fighting} size="hero" />
          ) : (
            <div className="battle-fighter-art is-empty" data-theme-part="game-portrait" />
          )}
          <i className="battle-pedestal" />
          <span className="battle-hp" aria-hidden="true">
            <i className="battle-hp-fill is-monster" />
          </span>
          {monsterName ? (
            <span className="battle-plate">
              <small>{monsterName}</small>
            </span>
          ) : null}
        </div>
      </div>
      <p className="battle-status" role="status">
        <strong>{status}</strong>
        {won && fragmentsLabel ? <small>{fragmentsLabel}</small> : null}
        {(won || lost) && roundsLabel ? <small>{roundsLabel}</small> : null}
      </p>
    </div>
  )
}

const POND_SCHOOL: Array<{ id: FishArtId; delay: string; duration: string; top: string; scale: number }> = [
  { id: 'lambari', delay: '0s', duration: '12s', top: '58%', scale: 0.4 },
  { id: 'tucunare', delay: '-2.4s', duration: '14s', top: '68%', scale: 0.52 },
  { id: 'surubim', delay: '-4.8s', duration: '16s', top: '62%', scale: 0.66 },
  { id: 'pirarucu', delay: '-7.2s', duration: '17s', top: '74%', scale: 0.6 },
  { id: 'koi', delay: '-9.6s', duration: '15s', top: '56%', scale: 0.48 },
  { id: 'serafim', delay: '-12s', duration: '18s', top: '78%', scale: 0.58 },
]
const POND_BUBBLES = 10
const POND_GLINTS = 7
const POND_DROPLETS = 12
const POND_SPARKS = 10

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
      data-rarity={normalizeFishRarity(rarity)}
      style={{ '--fish-art': fishArtVar(art) } as CSSProperties}
      aria-hidden="true"
    >
      <i className="fishing-fish-art" />
    </span>
  )
}

export type FishingBaitKind = 'common' | 'apprentice' | 'enchanted'

export function fishingBaitKind(paidWith?: string, price = 0): FishingBaitKind {
  if (paidWith === 'baits') return price >= 8 ? 'enchanted' : 'apprentice'
  return 'common'
}

function baitGradientId(uid: string, name: string) {
  return `fishing-bait-${uid}-${name}`
}

/** Isca ilustrada da troca; cada tipo tem gancho e isca próprios. */
export function FishingBaitMark({ kind }: { kind: FishingBaitKind }) {
  const uid = useId().replace(/:/g, '')
  const gold = baitGradientId(uid, 'gold')
  const steel = baitGradientId(uid, 'steel')
  const worm = baitGradientId(uid, 'worm')
  const lure = baitGradientId(uid, 'lure')
  const glow = baitGradientId(uid, 'glow')
  return (
    <svg viewBox="0 0 64 64" className="fishing-bait-mark" data-kind={kind} aria-hidden="true">
      <defs>
        <linearGradient id={gold} x1="10" y1="8" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff6d0" />
          <stop offset="0.5" stopColor="#e6c77d" />
          <stop offset="1" stopColor="#8d6422" />
        </linearGradient>
        <linearGradient id={steel} x1="16" y1="6" x2="48" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f3efe4" />
          <stop offset="0.55" stopColor="#c9b48a" />
          <stop offset="1" stopColor="#6f5b38" />
        </linearGradient>
        <linearGradient id={worm} x1="12" y1="24" x2="40" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#c46a4a" />
          <stop offset="1" stopColor="#7a2f22" />
        </linearGradient>
        <linearGradient id={lure} x1="14" y1="18" x2="50" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8fd4c8" />
          <stop offset="0.45" stopColor="#3f8f88" />
          <stop offset="1" stopColor="#1d4c4a" />
        </linearGradient>
        <radialGradient id={glow} cx="46%" cy="58%" r="38%">
          <stop offset="0" stopColor="#fff4c4" stopOpacity="0.55" />
          <stop offset="1" stopColor="#e6c77d" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="38" rx="18" ry="10" fill={`url(#${glow})`} />
      <path d="M40 6c0 9-7 13-16 16" fill="none" stroke={`url(#${gold})`} strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M24.5 21c-8 6-13 16-9.5 24 4 9 16 12 23-3"
        fill="none"
        stroke={`url(#${steel})`}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path d="M37 39.5 42 44" fill="none" stroke={`url(#${steel})`} strokeWidth="1.8" strokeLinecap="round" />
      {kind === 'common' ? (
        <>
          <path
            d="M16 34c4-6 11-4 15 1 4 5 3 12-2 15-6 4-13 0-15-7-1.4-5 0-7 2-9Z"
            fill={`url(#${worm})`}
          />
          <path d="M19 36c3 2 7 3 11 1M18 41c4 2 8 2 12 0" fill="none" stroke="#5a1f16" strokeWidth="1.1" opacity="0.55" />
          <circle cx="18.5" cy="35" r="1.3" fill="#2a120e" />
        </>
      ) : null}
      {kind === 'apprentice' ? (
        <>
          <path d="M15 36c6-8 16-8 21-1 4 6 2 14-5 17-8 3-16-2-16-9 0-3 0-5 0-7Z" fill="#6b8f3a" />
          <path d="M18 38c5-3 12-3 16 1" fill="none" stroke="#dce8b0" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
          <path d="M19 42c3 2 8 2 12 0" fill="none" stroke="#3d5a1e" strokeWidth="1.1" opacity="0.55" />
          <path d="M14 34 11 31" stroke="#c9b48a" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M46 10 49 16l6.2.7-4.7 4.4 1.3 6.1-5.5-3.1-5.5 3.1 1.3-6.1-4.7-4.4L43 16Z" fill={`url(#${gold})`} />
        </>
      ) : null}
      {kind === 'enchanted' ? (
        <>
          <path
            d="M18 34c5-4 12-3 16 3 4 6 2 13-4 16-7 3-14-1-15-8-.6-4 1-8 3-11Z"
            fill={`url(#${lure})`}
          />
          <path d="M22 36c4-2 9-1 12 3" fill="none" stroke="#e8fff8" strokeWidth="1.3" strokeLinecap="round" opacity="0.65" />
          <circle cx="48" cy="12" r="2.1" fill={`url(#${gold})`} />
          <path d="M44 16 50 22M52 10 48 18" fill="none" stroke={`url(#${gold})`} strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="54" cy="20" r="1.2" fill="#fff6d0" />
          <circle cx="42" cy="8" r="1" fill="#9be7dc" />
        </>
      ) : null}
    </svg>
  )
}

/** Moldura da troca: botão nativo em forma de slot, sem a textura padrão. */
export function FishingBaitFrame({
  kind,
  stock,
  label,
  selected = false,
  disabled,
  onClick,
  onFocus,
  onBlur,
}: {
  kind: FishingBaitKind
  stock: number
  label: string
  selected?: boolean
  disabled?: boolean
  onClick: () => void
  onFocus?: () => void
  onBlur?: () => void
}) {
  return (
    <button
      type="button"
      className={`fishing-bait-frame${selected ? ' is-selected' : ''}`}
      data-kind={kind}
      data-theme-part="fishing-bait"
      aria-label={label}
      aria-current={selected ? 'true' : undefined}
      disabled={disabled}
      onClick={onClick}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <i className="fishing-bait-corner is-tl" aria-hidden="true" />
      <i className="fishing-bait-corner is-tr" aria-hidden="true" />
      <i className="fishing-bait-corner is-bl" aria-hidden="true" />
      <i className="fishing-bait-corner is-br" aria-hidden="true" />
      <FishingBaitMark kind={kind} />
      <span className="fishing-bait-count">{stock}</span>
    </button>
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
  const rarity = featured ? normalizeFishRarity(fishRarity) : undefined
  return (
    <div
      className={`fishing-pond is-${state}`}
      data-theme-part="game-stage"
      data-rarity={rarity}
      aria-hidden="true"
    >
      <i className="fishing-pond-art" />
      <i className="fishing-pond-caustic" />
      <i className="fishing-pond-mist" />
      {Array.from({ length: POND_GLINTS }, (_, index) => (
        <i
          key={`glint-${index}`}
          className="fishing-glint"
          style={
            {
              '--glint-x': `${16 + ((index * 13) % 68)}%`,
              '--glint-y': `${52 + (index % 4) * 8}%`,
              '--glint-d': `${(index % 5) * 0.55}s`,
            } as CSSProperties
          }
        />
      ))}
      <div className="fishing-bubbles">
        {Array.from({ length: POND_BUBBLES }, (_, index) => (
          <i
            key={index}
            className="fishing-bubble"
            style={
              {
                '--bubble-x': `${10 + ((index * 19) % 78)}%`,
                '--bubble-d': `${(index % 7) * 0.4}s`,
                '--bubble-s': `${0.55 + (index % 4) * 0.2}`,
                '--bubble-dur': `${5.2 + (index % 5) * 0.65}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
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
                '--fish-art': fishArtVar(fish.id),
              } as CSSProperties
            }
          >
            <i className="fishing-swimmer-wake" />
            <i className="fishing-swimmer-wake is-late" />
            <i className="fishing-swimmer-body" />
          </span>
        ))}
      </div>
      <i className="fishing-lurk" />
      <i className="fishing-line" />
      <i className="fishing-bobber" />
      <i className="fishing-impact" />
      <i className="fishing-pond-ripple" />
      <i className="fishing-pond-ripple is-mid" />
      <i className="fishing-pond-ripple is-late" />
      <i className="fishing-splash" />
      <i className="fishing-splash is-late" />
      <i className="fishing-streak" />
      <div className="fishing-spray">
        {Array.from({ length: POND_DROPLETS }, (_, index) => (
          <i
            key={index}
            className="fishing-droplet"
            style={
              {
                '--drop-a': `${-118 + index * 19}deg`,
                '--drop-d': `${(index % 6) * 35}ms`,
                '--drop-y': `${-42 - (index % 5) * 14}px`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      {featured ? (
        <span
          className="fishing-catch"
          data-fish={featured}
          data-rarity={rarity}
          style={{ '--fish-art': fishArtVar(featured) } as CSSProperties}
        >
          <i className="fishing-catch-glow" />
          <i className="fishing-catch-sheen" />
          <i className="fishing-catch-art" />
          {state === 'caught' ? (
            <span className="fishing-catch-burst">
              <i className="fishing-catch-flash" />
              <i className="fishing-catch-rays" />
              {Array.from({ length: POND_SPARKS }, (_, index) => (
                <i
                  key={index}
                  className="fishing-catch-spark"
                  style={
                    {
                      '--spark-a': `${index * (360 / POND_SPARKS)}deg`,
                      '--spark-d': `${(index % 5) * 45}ms`,
                    } as CSSProperties
                  }
                />
              ))}
            </span>
          ) : null}
        </span>
      ) : null}
    </div>
  )
}
