import type { ComponentType } from 'react'
import { CrownIcon } from '../achievements/AchievementIcons'
import { Glyph, INK, Ramp, Shadow, Sparkle, useGlyphIds, type EnamelIconProps } from '../icons/enamel'
import { isSlotSymbol, type SlotSymbol } from './gameArt'

/** Espada esmaltada da linha do caça-níquel. */
function SwordMark(props: EnamelIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph data-slot-mark="sword" className="chance-slot-mark" {...props}>
      <defs>
        <Ramp id={id('blade')} tone="silver" x1={18} y1={58} x2={52} y2={8} />
        <Ramp id={id('gold')} tone="gold" x1={10} y1={34} x2={42} y2={58} />
        <Ramp id={id('gem')} tone="ruby" x1={10} y1={44} x2={22} y2={58} />
      </defs>
      <Shadow rx={18} cy={59} ry={2.6} />
      <path
        d="M21 57 29 48 51 11c2.4-3.6 7.6-2.2 6.2 2.4L34 51.5Z"
        fill={url('blade')}
        stroke={INK.silver}
        strokeWidth="3"
      />
      <path d="M29.5 46 50.5 16" stroke="#FFFFFF" strokeWidth="2.6" opacity=".8" />
      <path d="M13 39h27l-3.2 8.4H15.4Z" fill={url('gold')} stroke={INK.gold} strokeWidth="2.8" />
      <path d="M17 41.4h18" stroke="#FFF6D8" strokeWidth="2.2" opacity=".75" />
      <circle cx="16" cy="49" r="5.4" fill={url('gold')} stroke={INK.gold} strokeWidth="2.6" />
      <circle cx="16" cy="49" r="2.5" fill={url('gem')} stroke={INK.ruby} strokeWidth="1.7" />
      <path d="M23.4 50.6 11.5 59.5" stroke={INK.gold} strokeWidth="5.4" />
      <path d="M23.4 50.6 11.5 59.5" stroke={url('gold')} strokeWidth="2.8" />
      <Sparkle x={54} y={10} s={1} />
      <Sparkle x={8} y={34} s={0.72} />
    </Glyph>
  )
}

/** Escudo de guarda com cruz dourada. */
function ShieldMark(props: EnamelIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph data-slot-mark="shield" className="chance-slot-mark" {...props}>
      <defs>
        <Ramp id={id('plate')} tone="gold" x1={12} y1={6} x2={52} y2={56} />
        <Ramp id={id('face')} tone="azure" x1={16} y1={12} x2={48} y2={50} />
      </defs>
      <Shadow rx={16} cy={58} ry={2.6} />
      <path
        d="M32 4 55 11.5V29c0 13.4-9.2 24.6-23 28.5C18.2 53.6 9 42.4 9 29V11.5L32 4Z"
        fill={url('plate')}
        stroke={INK.gold}
        strokeWidth="3"
      />
      <path
        d="M32 9.5 50 15.4V29c0 10.8-7.2 20-18 23.4C21.2 49 14 39.8 14 29V15.4L32 9.5Z"
        fill={url('face')}
        stroke={INK.azure}
        strokeWidth="2.4"
      />
      <path d="M19 18c3.6-1.8 7.4-3 11-3.6" stroke="#E6F5FF" strokeWidth="3" opacity=".75" />
      <path d="M32 16v32M18.5 32H45.5" stroke={INK.gold} strokeWidth="6.2" />
      <path d="M32 16v32M18.5 32H45.5" stroke="#FFF0BE" strokeWidth="3" />
      <Sparkle x={50} y={12} s={0.95} />
      <Sparkle x={12} y={42} s={0.7} />
    </Glyph>
  )
}

function CrownMark(props: EnamelIconProps) {
  return <CrownIcon data-slot-mark="crown" className="chance-slot-mark" {...props} />
}

/** Pilha de Adena com o plus do reino. */
function AdenaMark(props: EnamelIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph data-slot-mark="adena" className="chance-slot-mark" {...props}>
      <defs>
        <Ramp id={id('back')} tone="bronze" x1={10} y1={28} x2={34} y2={56} />
        <Ramp id={id('mid')} tone="gold" x1={28} y1={24} x2={56} y2={52} />
        <Ramp id={id('front')} tone="gold" x1={16} y1={8} x2={48} y2={42} />
      </defs>
      <Shadow rx={20} cy={58} ry={2.6} />
      <circle cx="22" cy="42" r="13.2" fill={url('back')} stroke={INK.bronze} strokeWidth="2.8" />
      <circle cx="43" cy="40" r="13.6" fill={url('mid')} stroke={INK.gold} strokeWidth="2.8" />
      <circle cx="32" cy="26" r="15" fill={url('front')} stroke={INK.gold} strokeWidth="3" />
      <circle cx="32" cy="26" r="9.4" fill="none" stroke="#8F6015" strokeWidth="2.2" />
      <path d="M32 18.6v14.8M24.6 26h14.8" stroke="#8F6015" strokeWidth="3" />
      <path d="M32 18.6v14.8M24.6 26h14.8" stroke="#FFF6D8" strokeWidth="1.5" opacity=".85" />
      <path d="M22 18c1.8-3.2 4.4-5.4 7.6-6.4" stroke="#FFF6D8" strokeWidth="2.6" opacity=".75" />
      <Sparkle x={54} y={14} s={1} />
      <Sparkle x={8} y={36} s={0.7} />
    </Glyph>
  )
}

/** Pergaminho lacrado com cera rubi. */
function ScrollMark(props: EnamelIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph data-slot-mark="scroll" className="chance-slot-mark" {...props}>
      <defs>
        <Ramp id={id('paper')} tone="parchment" x1={14} y1={10} x2={50} y2={54} />
        <Ramp id={id('roll')} tone="gold" x1={12} y1={6} x2={52} y2={20} />
        <Ramp id={id('wax')} tone="ruby" x1={24} y1={34} x2={42} y2={52} />
      </defs>
      <Shadow rx={18} cy={58} ry={2.6} />
      <rect x="15" y="14" width="34" height="36" rx="3.2" fill={url('paper')} stroke={INK.parchment} strokeWidth="3" />
      <path d="M21 24h22M21 31h16M21 38h20" stroke="#B08B4F" strokeWidth="2.4" />
      <path d="M19 18c4-1.4 8-1.6 13-1" stroke="#FFF9E8" strokeWidth="2.4" opacity=".8" />
      <rect x="12" y="8" width="40" height="10" rx="4" fill={url('roll')} stroke={INK.gold} strokeWidth="2.6" />
      <rect x="12" y="46" width="40" height="10" rx="4" fill={url('roll')} stroke={INK.gold} strokeWidth="2.6" />
      <path d="M16 13h32M16 51h32" stroke="#FFF6D8" strokeWidth="1.8" opacity=".65" />
      <circle cx="32" cy="41" r="7.2" fill={url('wax')} stroke={INK.ruby} strokeWidth="2.4" />
      <path d="M32 37.2v7.6M28.2 41h7.6" stroke="#FFD5CE" strokeWidth="2" />
      <Sparkle x={52} y={12} s={0.9} />
      <Sparkle x={10} y={40} s={0.7} />
    </Glyph>
  )
}

function UnknownMark(props: EnamelIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph data-slot-mark="unknown" className="chance-slot-mark" {...props}>
      <defs>
        <Ramp id={id('coin')} tone="gold" />
      </defs>
      <Shadow rx={16} />
      <circle cx="32" cy="30" r="16" fill={url('coin')} stroke={INK.gold} strokeWidth="3" />
      <Sparkle x={50} y={14} s={0.8} />
    </Glyph>
  )
}

const MARKS: Record<SlotSymbol, ComponentType<EnamelIconProps>> = {
  sword: SwordMark,
  shield: ShieldMark,
  crown: CrownMark,
  adena: AdenaMark,
  scroll: ScrollMark,
}

export function SlotMark({ symbol }: { symbol: string }) {
  if (!isSlotSymbol(symbol)) return <UnknownMark />
  const Icon = MARKS[symbol]
  return <Icon />
}
