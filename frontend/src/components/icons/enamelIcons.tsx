import type { ComponentType } from 'react'
import { Glyph, INK, Ramp, Shadow, Sparkle, useGlyphIds, type EnamelIconProps } from './enamel'

/** Caixote lacrado com ferragens douradas: pacotes da loja. */
export function PackageBoxIcon(props: EnamelIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph data-enamel-icon="package" {...props}>
      <defs>
        <Ramp id={id('body')} tone="wood" x1={10} y1={22} x2={54} y2={56} />
        <Ramp id={id('lid')} tone="wood" x1={8} y1={8} x2={56} y2={28} />
        <Ramp id={id('band')} tone="gold" x1={22} y1={8} x2={44} y2={56} />
        <Ramp id={id('lock')} tone="gold" x1={26} y1={28} x2={38} y2={44} />
      </defs>
      <Shadow rx={22} cy={58} ry={2.8} />
      <path d="M10 26h44v24a5.2 5.2 0 0 1-5.2 5.2H15.2A5.2 5.2 0 0 1 10 50V26Z" fill={url('body')} stroke={INK.wood} strokeWidth="3" />
      <path d="M9 26c0-8.8 10-15 23-15s23 6.2 23 15H9Z" fill={url('lid')} stroke={INK.wood} strokeWidth="3" />
      <path d="M8 26h48" stroke="#EAB74F" strokeWidth="3.4" />
      <path d="M18 14v40M46 14v40" stroke={INK.wood} strokeWidth="5.4" />
      <path d="M18 14v40M46 14v40" stroke={url('band')} strokeWidth="2.8" />
      <path d="M20 18c3.8-2 8-3.2 12-3.2" stroke="#EBC28A" strokeWidth="2.6" opacity=".75" />
      <path d="M14 34c1.4-3.6 3.4-6.2 6.4-7.6" stroke="#EBC28A" strokeWidth="2.4" opacity=".5" />
      <rect x="26.5" y="29" width="11" height="13" rx="2.4" fill={url('lock')} stroke={INK.gold} strokeWidth="2.4" />
      <circle cx="32" cy="34.6" r="2" fill="#5A3819" />
      <path d="M32 36.2v3.4" stroke="#5A3819" strokeWidth="2" />
      <Sparkle x={54} y={12} s={1} />
      <Sparkle x={9} y={44} s={0.75} />
    </Glyph>
  )
}

/** Carrinho com moeda: cesta da loja. */
export function CartIcon(props: EnamelIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph data-enamel-icon="cart" {...props}>
      <defs>
        <Ramp id={id('basket')} tone="wood" x1={10} y1={14} x2={56} y2={46} />
        <Ramp id={id('rim')} tone="gold" x1={8} y1={12} x2={56} y2={24} />
        <Ramp id={id('coin')} tone="gold" x1={23} y1={16} x2={41} y2={36} />
        <Ramp id={id('wheel')} tone="bronze" x1={14} y1={44} x2={28} y2={60} />
      </defs>
      <Shadow rx={20} cy={59} ry={2.6} />
      <path d="M7 14h10l4 5.5" stroke={INK.gold} strokeWidth="7" />
      <path d="M7 14h10l4 5.5" stroke="#EAB74F" strokeWidth="3.4" />
      <path d="M13 21h40l-5.2 23H19.4L13 21Z" fill={url('basket')} stroke={INK.wood} strokeWidth="3" />
      <path d="M15.2 21h35.4" stroke={url('rim')} strokeWidth="5.2" />
      <path d="M15.2 21h35.4" stroke={INK.gold} strokeWidth="2.4" />
      <path d="M19 28c1.6-3.4 4-5.6 7.2-6.8" stroke="#EBC28A" strokeWidth="2.6" opacity=".65" />
      <circle cx="32" cy="32.5" r="8.2" fill={url('coin')} stroke={INK.gold} strokeWidth="2.6" />
      <path d="M35.2 28.2a4.2 4.2 0 1 0 0 7.6" stroke="#8F6015" strokeWidth="2.4" />
      <path d="M32 26.4v12.2" stroke="#8F6015" strokeWidth="2.4" />
      <path d="M25.6 29c1-1.8 2.4-3.2 4.2-4" stroke="#FFF6D8" strokeWidth="2" opacity=".8" />
      <circle cx="22" cy="51.2" r="5.6" fill={url('wheel')} stroke={INK.bronze} strokeWidth="2.8" />
      <circle cx="44.5" cy="51.2" r="5.6" fill={url('wheel')} stroke={INK.bronze} strokeWidth="2.8" />
      <circle cx="22" cy="51.2" r="2" fill="#FFF0BE" stroke={INK.gold} strokeWidth="1.4" />
      <circle cx="44.5" cy="51.2" r="2" fill="#FFF0BE" stroke={INK.gold} strokeWidth="1.4" />
      <Sparkle x={54} y={12} s={0.95} />
      <Sparkle x={10} y={40} s={0.7} />
    </Glyph>
  )
}

/** Escudo dourado com visto: resumo conferido da troca. */
export function ShieldOkIcon(props: EnamelIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph data-enamel-icon="shield-ok" {...props}>
      <defs>
        <Ramp id={id('plate')} tone="gold" x1={12} y1={6} x2={52} y2={54} />
        <Ramp id={id('face')} tone="azure" x1={16} y1={12} x2={48} y2={50} />
        <Ramp id={id('ok')} tone="jade" x1={24} y1={24} x2={42} y2={46} />
      </defs>
      <Shadow rx={16} cy={58} ry={2.6} />
      <path d="M32 4 55 11.5V29c0 13.4-9.2 24.6-23 28.5C18.2 53.6 9 42.4 9 29V11.5L32 4Z" fill={url('plate')} stroke={INK.gold} strokeWidth="3" />
      <path d="M32 9.5 50 15.4V29c0 10.8-7.2 20-18 23.4C21.2 49 14 39.8 14 29V15.4L32 9.5Z" fill={url('face')} stroke={INK.azure} strokeWidth="2.4" />
      <path d="M19 18c3.6-1.8 7.4-3 11-3.6" stroke="#E6F5FF" strokeWidth="3" opacity=".75" />
      <circle cx="32" cy="33.5" r="10.4" fill={url('ok')} stroke={INK.jade} strokeWidth="3" />
      <path d="m26.4 33.8 4.4 4.4 7.6-8.8" stroke="#F0FFE4" strokeWidth="3.4" />
      <Sparkle x={50} y={14} s={0.95} />
      <Sparkle x={12} y={42} s={0.7} />
    </Glyph>
  )
}

/** Moeda entre setas laterais: transferência site ↔ jogo. */
export function ExchangeIcon(props: EnamelIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph data-enamel-icon="exchange" {...props}>
      <defs>
        <Ramp id={id('coin')} tone="gold" x1={20} y1={18} x2={44} y2={46} />
        <Ramp id={id('arrow')} tone="azure" x1={6} y1={8} x2={58} y2={56} />
      </defs>
      <Shadow rx={19} cy={58} ry={2.6} />
      <path d="M11.5 28A21.5 21.5 0 0 1 42 15.5" stroke={INK.azure} strokeWidth="7.5" />
      <path d="M11.5 28A21.5 21.5 0 0 1 42 15.5" stroke={url('arrow')} strokeWidth="4" />
      <path d="M38 8.5 50 16l-11.5 7V8.5Z" fill={url('arrow')} stroke={INK.azure} strokeWidth="2.4" />
      <path d="M52.5 36A21.5 21.5 0 0 1 22 48.5" stroke={INK.azure} strokeWidth="7.5" />
      <path d="M52.5 36A21.5 21.5 0 0 1 22 48.5" stroke={url('arrow')} strokeWidth="4" />
      <path d="M26 55.5 14 48l11.5-7v14.5Z" fill={url('arrow')} stroke={INK.azure} strokeWidth="2.4" />
      <circle cx="32" cy="32" r="11.8" fill={url('coin')} stroke={INK.gold} strokeWidth="3" />
      <path d="M35.8 26.8a6 6 0 1 0 0 10.4" stroke="#8F6015" strokeWidth="2.6" />
      <path d="M32 23.8v16.4" stroke="#8F6015" strokeWidth="2.6" />
      <path d="M24.8 27c1.1-1.8 2.6-3.2 4.4-4" stroke="#FFF6D8" strokeWidth="2.2" opacity=".8" />
      <Sparkle x={54} y={12} s={0.9} />
      <Sparkle x={10} y={44} s={0.7} />
    </Glyph>
  )
}

/** Estandarte no mastro: roadmap e marcos públicos. */
export function BannerFlagIcon(props: EnamelIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph data-enamel-icon="flag" {...props}>
      <defs>
        <Ramp id={id('pole')} tone="wood" x1={12} y1={4} x2={22} y2={58} />
        <Ramp id={id('cloth')} tone="ruby" x1={18} y1={8} x2={58} y2={40} />
        <Ramp id={id('band')} tone="gold" x1={20} y1={8} x2={56} y2={20} />
      </defs>
      <Shadow rx={16} cy={59} ry={2.6} />
      <path d="M16 6v48" stroke={INK.wood} strokeWidth="7.4" />
      <path d="M16 6v48" stroke={url('pole')} strokeWidth="3.6" />
      <circle cx="16" cy="6.2" r="4" fill="#EAB74F" stroke={INK.gold} strokeWidth="2.4" />
      <path d="M16 6.2 20 10" stroke={INK.gold} strokeWidth="2.2" />
      <path d="M20 9.5h29c4.4 0 7.4 2.6 7.4 6.6 0 6.8-6.6 9-6.6 14.2 0 4.4 4.8 7 4.8 11 0 5-5.2 7.8-11 7.8H20V9.5Z" fill={url('cloth')} stroke={INK.ruby} strokeWidth="3" />
      <path d="M22 14h24" stroke={url('band')} strokeWidth="4.6" />
      <path d="M22 14h24" stroke={INK.gold} strokeWidth="2.2" />
      <path d="M23 19c4-1.6 8.2-2.4 13-2.4" stroke="#FFD5CE" strokeWidth="2.6" opacity=".75" />
      <path d="M48 24c-2.4 3.2-2.6 6.8-.4 10.2" stroke="#8E1E2C" strokeWidth="2.8" opacity=".45" />
      <path d="M22 44h6M31 44h5" stroke="#EAB74F" strokeWidth="2.4" />
      <Sparkle x={54} y={11} s={0.95} />
      <Sparkle x={8} y={38} s={0.7} />
    </Glyph>
  )
}

export const ENAMEL_ICONS = {
  package: PackageBoxIcon,
  cart: CartIcon,
  shieldOk: ShieldOkIcon,
  exchange: ExchangeIcon,
  flag: BannerFlagIcon,
} as const satisfies Record<string, ComponentType<EnamelIconProps>>

export type EnamelIconKey = keyof typeof ENAMEL_ICONS
