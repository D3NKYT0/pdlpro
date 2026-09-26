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

/** Cartão com chip dourado: pagamentos Stripe / cartões. */
export function PaymentCardIcon(props: EnamelIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph data-enamel-icon="payment-card" {...props}>
      <defs>
        <Ramp id={id('body')} tone="night" x1={8} y1={14} x2={56} y2={50} />
        <Ramp id={id('strip')} tone="arcane" x1={8} y1={18} x2={56} y2={30} />
        <Ramp id={id('chip')} tone="gold" x1={14} y1={30} x2={28} y2={42} />
        <Ramp id={id('edge')} tone="silver" x1={8} y1={12} x2={56} y2={52} />
      </defs>
      <Shadow rx={22} cy={58} ry={2.6} />
      <rect x="8" y="14" width="48" height="36" rx="7" fill={url('body')} stroke={INK.night} strokeWidth="3" />
      <rect x="8" y="14" width="48" height="36" rx="7" fill={url('edge')} opacity=".18" />
      <path d="M8 24h48" stroke={url('strip')} strokeWidth="10" />
      <path d="M8 24h48" stroke={INK.arcane} strokeWidth="3.2" opacity=".55" />
      <rect x="14" y="32" width="13" height="10" rx="2.2" fill={url('chip')} stroke={INK.gold} strokeWidth="2.2" />
      <path d="M16.2 35h8.6M16.2 38.2h5.4" stroke="#8F6015" strokeWidth="1.6" />
      <path d="M32 34h18M32 38.5h12" stroke="#E6EEF8" strokeWidth="2.4" opacity=".55" />
      <path d="M12 18c4-1.4 9-2.2 14-2.2" stroke="#9BB6E8" strokeWidth="2.4" opacity=".55" />
      <Sparkle x={52} y={12} s={0.95} />
      <Sparkle x={11} y={46} s={0.7} />
    </Glyph>
  )
}

/** Bolsa com moeda: carteira / Mercado Pago. */
export function PurseIcon(props: EnamelIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph data-enamel-icon="purse" {...props}>
      <defs>
        <Ramp id={id('bag')} tone="aqua" x1={12} y1={16} x2={52} y2={56} />
        <Ramp id={id('flap')} tone="azure" x1={14} y1={12} x2={50} y2={28} />
        <Ramp id={id('coin')} tone="gold" x1={24} y1={28} x2={42} y2={48} />
        <Ramp id={id('strap')} tone="bronze" x1={20} y1={8} x2={44} y2={18} />
      </defs>
      <Shadow rx={18} cy={59} ry={2.6} />
      <path d="M22 16c0-6 4.4-10 10-10s10 4 10 10" stroke={url('strap')} strokeWidth="5.2" />
      <path d="M22 16c0-6 4.4-10 10-10s10 4 10 10" stroke={INK.bronze} strokeWidth="2.4" />
      <path d="M12 24h40l-3.5 28H15.5L12 24Z" fill={url('bag')} stroke={INK.aqua} strokeWidth="3" />
      <path d="M11 24h42c0 7-7.5 11-7.5 11H18.5S11 31 11 24Z" fill={url('flap')} stroke={INK.azure} strokeWidth="2.6" />
      <path d="M16 28c3.2-2.2 7-3.4 11-3.6" stroke="#D6F9FF" strokeWidth="2.4" opacity=".7" />
      <circle cx="33" cy="40" r="9.2" fill={url('coin')} stroke={INK.gold} strokeWidth="2.6" />
      <path d="M36.4 35.6a5 5 0 1 0 0 8.8" stroke="#8F6015" strokeWidth="2.2" />
      <path d="M33 33.2v13.6" stroke="#8F6015" strokeWidth="2.2" />
      <Sparkle x={52} y={14} s={0.9} />
      <Sparkle x={12} y={44} s={0.7} />
    </Glyph>
  )
}

/** Torre com cristal: banco / game server Lineage. */
export function ServerTowerIcon(props: EnamelIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph data-enamel-icon="server-tower" {...props}>
      <defs>
        <Ramp id={id('stone')} tone="silver" x1={16} y1={8} x2={48} y2={56} />
        <Ramp id={id('roof')} tone="jade" x1={14} y1={4} x2={50} y2={22} />
        <Ramp id={id('crystal')} tone="arcane" x1={26} y1={18} x2={38} y2={36} />
        <Ramp id={id('gold')} tone="gold" x1={18} y1={40} x2={46} y2={52} />
      </defs>
      <Shadow rx={18} cy={59} ry={2.6} />
      <path d="M18 22h28v30H18V22Z" fill={url('stone')} stroke={INK.silver} strokeWidth="3" />
      <path d="M14 22 32 6l18 16H14Z" fill={url('roof')} stroke={INK.jade} strokeWidth="3" />
      <path d="M22 12c3.4-1.6 7-2.4 10.4-2.4" stroke="#C8F3A8" strokeWidth="2.4" opacity=".7" />
      <path d="M22 28h20M22 36h20M22 44h20" stroke={url('gold')} strokeWidth="3.2" />
      <path d="M22 28h20M22 36h20M22 44h20" stroke={INK.gold} strokeWidth="1.6" />
      <circle cx="26" cy="28" r="1.8" fill="#FFF6D8" />
      <circle cx="26" cy="36" r="1.8" fill="#FFF6D8" />
      <circle cx="26" cy="44" r="1.8" fill="#FFF6D8" />
      <path d="M32 18l5 8H27l5-8Z" fill={url('crystal')} stroke={INK.arcane} strokeWidth="2.2" />
      <path d="M30 22h4" stroke="#F4E8FF" strokeWidth="1.8" opacity=".8" />
      <Sparkle x={50} y={10} s={0.95} />
      <Sparkle x={12} y={40} s={0.7} />
    </Glyph>
  )
}

/** Carta lacrada: SMTP / e-mail. */
export function MailSealIcon(props: EnamelIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph data-enamel-icon="mail-seal" {...props}>
      <defs>
        <Ramp id={id('paper')} tone="parchment" x1={8} y1={14} x2={56} y2={52} />
        <Ramp id={id('flap')} tone="ivory" x1={10} y1={12} x2={54} y2={34} />
        <Ramp id={id('wax')} tone="ruby" x1={26} y1={28} x2={40} y2={44} />
        <Ramp id={id('rim')} tone="gold" x1={24} y1={26} x2={42} y2={46} />
      </defs>
      <Shadow rx={20} cy={58} ry={2.6} />
      <path d="M8 18h48v30a5 5 0 0 1-5 5H13a5 5 0 0 1-5-5V18Z" fill={url('paper')} stroke={INK.parchment} strokeWidth="3" />
      <path d="M8 18 32 36 56 18" fill={url('flap')} stroke={INK.ivory} strokeWidth="2.6" />
      <path d="M12 22c5.5-2 12-3.2 20-3.2" stroke="#FFFDF4" strokeWidth="2.4" opacity=".7" />
      <circle cx="33" cy="36" r="9.6" fill={url('rim')} stroke={INK.gold} strokeWidth="2.2" />
      <circle cx="33" cy="36" r="7.2" fill={url('wax')} stroke={INK.ruby} strokeWidth="2.2" />
      <path d="M33 31.5v9M29.2 36h7.6" stroke="#FFD5CE" strokeWidth="2.2" />
      <Sparkle x={52} y={12} s={0.95} />
      <Sparkle x={11} y={44} s={0.7} />
    </Glyph>
  )
}

/** Chaves cruzadas: OAuth / credenciais. */
export function KeyRingIcon(props: EnamelIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph data-enamel-icon="key-ring" {...props}>
      <defs>
        <Ramp id={id('keyA')} tone="gold" x1={10} y1={10} x2={48} y2={48} />
        <Ramp id={id('keyB')} tone="silver" x1={18} y1={8} x2={54} y2={52} />
        <Ramp id={id('ring')} tone="bronze" x1={20} y1={8} x2={40} y2={28} />
      </defs>
      <Shadow rx={18} cy={59} ry={2.6} />
      <circle cx="28" cy="18" r="9" fill="none" stroke={INK.bronze} strokeWidth="6.2" />
      <circle cx="28" cy="18" r="9" fill="none" stroke={url('ring')} strokeWidth="3.2" />
      <path d="M30 24 48 42l4.5-4.5-4-4 3-3-4.2-4.2-3 3-3.8-3.8L30 24Z" fill={url('keyA')} stroke={INK.gold} strokeWidth="2.4" />
      <circle cx="27.5" cy="21.5" r="3.2" fill="#FFF6D8" stroke={INK.gold} strokeWidth="1.6" />
      <path d="M34 28 52 46l3.8-3.8-3.4-3.4 2.6-2.6-3.8-3.8-2.6 2.6-3.4-3.4L34 28Z" fill={url('keyB')} stroke={INK.silver} strokeWidth="2.2" />
      <path d="M38 18c2.8-1.2 5.6-1.8 8.4-1.8" stroke="#FFF6D8" strokeWidth="2" opacity=".65" />
      <Sparkle x={52} y={12} s={0.95} />
      <Sparkle x={12} y={42} s={0.7} />
    </Glyph>
  )
}

/** Nuvem com balde: S3 / Cloudflare R2. */
export function CloudBucketIcon(props: EnamelIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph data-enamel-icon="cloud-bucket" {...props}>
      <defs>
        <Ramp id={id('cloud')} tone="azure" x1={8} y1={8} x2={56} y2={36} />
        <Ramp id={id('bucket')} tone="bronze" x1={18} y1={28} x2={46} y2={56} />
        <Ramp id={id('rim')} tone="gold" x1={16} y1={30} x2={48} y2={40} />
      </defs>
      <Shadow rx={18} cy={59} ry={2.6} />
      <path
        d="M18 28c-5.5 0-10-3.8-10-9.2C8 13.2 12.2 9 18 9c1.4-4.2 5.4-7 10.2-7 6.2 0 11 4.4 11.6 10.2C44 10.4 49.4 14 52.5 19.2 56.2 19.6 59 22.8 59 26.8c0 4.4-3.6 8-8.2 8H18Z"
        fill={url('cloud')}
        stroke={INK.azure}
        strokeWidth="2.8"
      />
      <path d="M14 22c3.6-2.4 8-3.8 13-3.8" stroke="#D6F0FF" strokeWidth="2.4" opacity=".7" />
      <path d="M20 34h24l-3.2 20H23.2L20 34Z" fill={url('bucket')} stroke={INK.bronze} strokeWidth="2.8" />
      <path d="M18 34h28c0 4-5 7-5 7H23s-5-3-5-7Z" fill={url('rim')} stroke={INK.gold} strokeWidth="2.2" />
      <path d="M26 42h12M27 48h10" stroke="#8F6015" strokeWidth="2" opacity=".55" />
      <Sparkle x={52} y={12} s={0.95} />
      <Sparkle x={12} y={44} s={0.7} />
    </Glyph>
  )
}

/** Orbe com faíscas: Denkynho / LLM. */
export function BrainOrbIcon(props: EnamelIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph data-enamel-icon="brain-orb" {...props}>
      <defs>
        <Ramp id={id('orb')} tone="arcane" x1={12} y1={10} x2={52} y2={54} />
        <Ramp id={id('core')} tone="gold" x1={24} y1={24} x2={40} y2={40} />
      </defs>
      <Shadow rx={18} cy={59} ry={2.6} />
      <circle cx="32" cy="30" r="18" fill={url('orb')} stroke={INK.arcane} strokeWidth="3" />
      <path d="M18 26c4-6 10-9 16-9s12 3 16 9" stroke="#F4E8FF" strokeWidth="2.4" opacity=".55" />
      <path d="M22 34c3.5 5 8 8 10 8s6.5-3 10-8" stroke="#4B2C8F" strokeWidth="2.4" opacity=".45" />
      <circle cx="32" cy="30" r="7" fill={url('core')} stroke={INK.gold} strokeWidth="2.2" />
      <path d="M32 24v12M26 30h12" stroke="#8F6015" strokeWidth="2" />
      <Sparkle x={50} y={14} s={0.95} />
      <Sparkle x={12} y={42} s={0.7} />
    </Glyph>
  )
}

/** Radar: Sentry / observabilidade. */
export function RadarPulseIcon(props: EnamelIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph data-enamel-icon="radar-pulse" {...props}>
      <defs>
        <Ramp id={id('dish')} tone="jade" x1={10} y1={10} x2={54} y2={54} />
        <Ramp id={id('beam')} tone="gold" x1={32} y1={32} x2={56} y2={14} />
      </defs>
      <Shadow rx={18} cy={59} ry={2.6} />
      <circle cx="32" cy="32" r="18" fill={url('dish')} stroke={INK.jade} strokeWidth="3" />
      <circle cx="32" cy="32" r="11" fill="none" stroke="#C8F3A8" strokeWidth="2.2" opacity=".55" />
      <circle cx="32" cy="32" r="5" fill="#FFF6D8" stroke={INK.gold} strokeWidth="2" />
      <path d="M32 32 52 14" stroke={url('beam')} strokeWidth="4.2" />
      <path d="M32 32 52 14" stroke={INK.gold} strokeWidth="2" />
      <path d="M44 20c4 2.5 7 6.5 8.2 11" stroke="#C8F3A8" strokeWidth="2.2" opacity=".7" />
      <Sparkle x={52} y={12} s={0.95} />
      <Sparkle x={12} y={44} s={0.7} />
    </Glyph>
  )
}

/** Controle de jogo esmaltado com ferragens douradas: conta de jogo Lineage / gameplay. */
export function GamepadIcon(props: EnamelIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph data-enamel-icon="gamepad" {...props}>
      <defs>
        <Ramp id={id('body')} tone="night" x1={10} y1={16} x2={54} y2={50} />
        <Ramp id={id('trim')} tone="gold" x1={8} y1={12} x2={56} y2={52} />
        <Ramp id={id('dpad')} tone="silver" x1={14} y1={22} x2={28} y2={36} />
        <Ramp id={id('stick')} tone="bronze" x1={22} y1={34} x2={42} y2={48} />
        <Ramp id={id('gemA')} tone="ruby" x1={40} y1={18} x2={46} y2={24} />
        <Ramp id={id('gemB')} tone="jade" x1={46} y1={24} x2={52} y2={30} />
        <Ramp id={id('gemC')} tone="gold" x1={40} y1={30} x2={46} y2={36} />
        <Ramp id={id('gemD')} tone="azure" x1={34} y1={24} x2={40} y2={30} />
      </defs>
      <Shadow rx={21} cy={59} ry={2.6} />
      <path
        d="M18 19c-5.5 0-9 4-10 11l-2 12c-.8 5.2 2.8 9.5 7.5 9.5 3.5 0 6.6-2.2 8-5.5l2.5-6c1.2-3 3.8-4.8 6-4.8s4.8 1.8 6 4.8l2.5 6c1.4 3.3 4.5 5.5 8 5.5 4.7 0 8.3-4.3 7.5-9.5l-2-12c-1-7-4.5-11-10-11H18Z"
        fill={url('body')}
        stroke={INK.night}
        strokeWidth="3"
      />
      <path
        d="M19 19h26c3 0 5.5 1.8 6.5 4.8-3-1.4-6.8-2-10.5-2h-18c-3.7 0-7.5.6-10.5 2 1-3 3.5-4.8 6.5-4.8Z"
        fill={url('trim')}
        stroke={INK.gold}
        strokeWidth="2.2"
      />
      <path d="M17 22.5c4-2 9-2.8 15-2.8s11 .8 15 2.8" stroke="#FFF0BE" strokeWidth="2" opacity=".7" />
      <path
        d="M20 26h4v4h4v4h-4v4h-4v-4h-4v-4h4v-4Z"
        fill={url('dpad')}
        stroke={INK.silver}
        strokeWidth="2"
      />
      <circle cx="22" cy="32" r="1.5" fill="#EAB74F" stroke={INK.gold} strokeWidth="1" />
      <circle cx="42" cy="27" r="2.5" fill={url('gemA')} stroke={INK.ruby} strokeWidth="1.5" />
      <circle cx="47" cy="32" r="2.5" fill={url('gemB')} stroke={INK.jade} strokeWidth="1.5" />
      <circle cx="42" cy="37" r="2.5" fill={url('gemC')} stroke={INK.gold} strokeWidth="1.5" />
      <circle cx="37" cy="32" r="2.5" fill={url('gemD')} stroke={INK.azure} strokeWidth="1.5" />
      <circle cx="27" cy="41" r="3.8" fill={url('stick')} stroke={INK.bronze} strokeWidth="1.8" />
      <circle cx="27" cy="41" r="1.8" fill="#FFF0BE" opacity=".8" />
      <circle cx="37" cy="41" r="3.8" fill={url('stick')} stroke={INK.bronze} strokeWidth="1.8" />
      <circle cx="37" cy="41" r="1.8" fill="#FFF0BE" opacity=".8" />
      <path d="M32 25l2.8 3.5h-5.6L32 25Z" fill={url('trim')} stroke={INK.gold} strokeWidth="1.4" />
      <circle cx="32" cy="31" r="1.2" fill="#EAB74F" />
      <Sparkle x={53} y={13} s={0.95} />
      <Sparkle x={11} y={43} s={0.7} />
    </Glyph>
  )
}

export const ENAMEL_ICONS = {
  package: PackageBoxIcon,
  cart: CartIcon,
  shieldOk: ShieldOkIcon,
  exchange: ExchangeIcon,
  flag: BannerFlagIcon,
  paymentCard: PaymentCardIcon,
  purse: PurseIcon,
  serverTower: ServerTowerIcon,
  mailSeal: MailSealIcon,
  keyRing: KeyRingIcon,
  cloudBucket: CloudBucketIcon,
  brainOrb: BrainOrbIcon,
  radarPulse: RadarPulseIcon,
  gamepad: GamepadIcon,
} as const satisfies Record<string, ComponentType<EnamelIconProps>>

export type EnamelIconKey = keyof typeof ENAMEL_ICONS
