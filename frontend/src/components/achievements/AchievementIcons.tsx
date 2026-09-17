import type { ComponentType } from 'react'
import {
  Glyph,
  INK,
  Ramp,
  Shadow,
  Sparkle,
  useGlyphIds,
  type EnamelIconProps,
} from '../icons/enamel'

/** Ilustrações das conquistas. Reutilizam o kit esmaltado compartilhado em `components/icons`. */
export type AchievementIconProps = EnamelIconProps

/** Taça dourada com pedestal de bronze. */
export function TrophyIcon(props: AchievementIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph {...props}>
      <defs>
        <Ramp id={id('cup')} tone="gold" y2={46} />
        <Ramp id={id('base')} tone="bronze" y1={42} y2={60} />
      </defs>
      <Shadow rx={19} cy={60} ry={2.6} />
      <path d="M17 11H8c-1 12 5.5 18.5 13 20" stroke={INK.gold} strokeWidth="7" />
      <path d="M17 11H8c-1 12 5.5 18.5 13 20" stroke="#EAB74F" strokeWidth="3.4" />
      <path d="M47 11h9c1 12-5.5 18.5-13 20" stroke={INK.gold} strokeWidth="7" />
      <path d="M47 11h9c1 12-5.5 18.5-13 20" stroke="#EAB74F" strokeWidth="3.4" />
      <path d="M17 7h30v16c0 9.5-6.7 17-15 17s-15-7.5-15-17V7Z" fill={url('cup')} stroke={INK.gold} strokeWidth="3" />
      <path d="M19 12c9 3 17 3 26 0" stroke="#FFF6D8" strokeWidth="3" opacity=".85" />
      <path d="m32 17 3.2 6.6 7.3 1-5.3 5.1 1.3 7.2-6.5-3.4-6.5 3.4 1.3-7.2-5.3-5.1 7.3-1L32 17Z" fill="#FFF6D8" stroke="#8F6015" strokeWidth="1.7" />
      <path d="M28 39h8v7h-8z" fill={url('base')} stroke={INK.gold} strokeWidth="2.6" />
      <path d="M22 46h20l3.5 8h-27L22 46Z" fill={url('base')} stroke={INK.gold} strokeWidth="2.8" />
      <rect x="16" y="53" width="32" height="6" rx="2.4" fill={url('base')} stroke={INK.gold} strokeWidth="2.6" />
      <path d="M20 55.5h24" stroke="#F5CB9E" strokeWidth="1.8" opacity=".8" />
      <Sparkle x={54} y={10} s={1.1} />
      <Sparkle x={9} y={34} s={0.8} />
    </Glyph>
  )
}

/** Cadeado de aço com corpo dourado: conquista bloqueada. */
export function PadlockIcon(props: AchievementIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph {...props}>
      <defs>
        <Ramp id={id('body')} tone="gold" y1={26} />
        <Ramp id={id('bar')} tone="silver" y1={8} y2={30} />
      </defs>
      <Shadow rx={19} cy={58} ry={2.8} />
      <path d="M22 28v-8a10 10 0 0 1 20 0v8" stroke={INK.silver} strokeWidth="8.5" />
      <path d="M22 28v-8a10 10 0 0 1 20 0v8" stroke={url('bar')} strokeWidth="4.5" />
      <rect x="11" y="26" width="42" height="28" rx="7" fill={url('body')} stroke={INK.gold} strokeWidth="3" />
      <path d="M16 32c11-3 21-3 32 0" stroke="#FFF6D8" strokeWidth="3" opacity=".75" />
      <circle cx="32" cy="38" r="4.6" fill={INK.gold} />
      <path d="M32 41v8" stroke={INK.gold} strokeWidth="4.2" />
      <circle cx="16" cy="49" r="1.8" fill="#8F6015" />
      <circle cx="48" cy="49" r="1.8" fill="#8F6015" />
    </Glyph>
  )
}

/** Chave ornamentada com rubi: primeiro acesso. */
export function KeyIcon(props: AchievementIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph {...props}>
      <defs>
        <Ramp id={id('metal')} tone="gold" x1={8} y1={18} x2={56} y2={48} />
        <Ramp id={id('gem')} tone="ruby" x1={24} y1={24} x2={40} y2={40} />
      </defs>
      <Shadow rx={22} cy={52} ry={2.8} />
      <circle cx="19" cy="32" r="13" fill={url('metal')} stroke={INK.gold} strokeWidth="3" />
      <circle cx="19" cy="32" r="5.4" fill="#2A1A0C" />
      <path d="M11 25c2-2.6 4.6-4.2 7.5-4.8" stroke="#FFF6D8" strokeWidth="2.8" opacity=".8" />
      <path d="M31 27h24v10H31z" fill={url('metal')} stroke={INK.gold} strokeWidth="3" />
      <path d="M43 37h5.5v9H43zM51 37h5v7h-5z" fill={url('metal')} stroke={INK.gold} strokeWidth="2.6" />
      <path d="M34 30h18" stroke="#FFF6D8" strokeWidth="2.2" opacity=".85" />
      <circle cx="30" cy="32" r="4.4" fill={url('gem')} stroke={INK.ruby} strokeWidth="2" />
      <path d="M28.4 30.4c.8-.9 1.8-1.2 2.8-1" stroke="#FFD5CE" strokeWidth="1.6" />
      <Sparkle x={12} y={14} s={1} />
      <Sparkle x={57} y={20} s={0.7} />
    </Glyph>
  )
}

/** Medalhão com retrato esmaltado: avatar personalizado. */
export function AvatarIcon(props: AchievementIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph {...props}>
      <defs>
        <Ramp id={id('ring')} tone="gold" y1={8} y2={52} />
        <Ramp id={id('bg')} tone="night" y1={12} y2={48} />
        <Ramp id={id('skin')} tone="skin" x1={26} y1={17} x2={40} y2={33} />
        <Ramp id={id('cloth')} tone="azure" x1={22} y1={34} x2={44} y2={48} />
      </defs>
      <Shadow rx={19} cy={56} ry={3} />
      <circle cx="32" cy="30" r="23" fill={url('ring')} stroke={INK.gold} strokeWidth="3" />
      <circle cx="32" cy="30" r="17.5" fill={url('bg')} stroke="#8F6015" strokeWidth="2.4" />
      <path d="M23 43.5c1.6-5.6 4.8-8.4 9-8.4s7.4 2.8 9 8.4" fill={url('cloth')} stroke={INK.azure} strokeWidth="2.4" />
      <circle cx="32" cy="25" r="7.6" fill={url('skin')} stroke={INK.skin} strokeWidth="2.4" />
      <path d="M25 22c1-6 12.5-7 14 0-4-2-9-1.4-12 1.4L25 22Z" fill="#2B2130" stroke="#15111A" strokeWidth="1.9" />
      <circle cx="29.4" cy="25.6" r="1.1" fill="#38241D" />
      <circle cx="34.6" cy="25.6" r="1.1" fill="#38241D" />
      <path d="M30 29c1.4 1.2 2.6 1.2 4 0" stroke="#C9764F" strokeWidth="1.5" />
      <path d="M15 22c2-5 5.5-8.6 10-10.5" stroke="#FFF6D8" strokeWidth="3" opacity=".7" />
      <Sparkle x={53} y={13} s={0.9} />
    </Glyph>
  )
}

/** Envelope selado com aprovação verde: e-mail verificado. */
export function EnvelopeCheckIcon(props: AchievementIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph {...props}>
      <defs>
        <Ramp id={id('paper')} tone="parchment" y1={14} y2={50} />
        <Ramp id={id('flap')} tone="bronze" x1={8} y1={14} x2={56} y2={38} />
        <Ramp id={id('ok')} tone="jade" x1={36} y1={34} x2={58} y2={56} />
      </defs>
      <Shadow rx={24} cy={54} ry={3} />
      <rect x="6" y="14" width="52" height="34" rx="5" fill={url('paper')} stroke="#6B5227" strokeWidth="3" />
      <path d="M8 45 26 31M56 45 42 31" stroke="#C4A671" strokeWidth="2.6" />
      <path d="M6.5 17.5 32 37 57.5 17.5H6.5Z" fill={url('flap')} stroke="#6B5227" strokeWidth="2.8" />
      <path d="M12 19.5 32 34l20-14.5" stroke="#FFEFD0" strokeWidth="2.2" opacity=".65" />
      <circle cx="46" cy="45" r="10.5" fill={url('ok')} stroke={INK.jade} strokeWidth="3" />
      <path d="m41.2 45.4 3.8 3.8 6.8-7.8" stroke="#F0FFE4" strokeWidth="3.4" />
      <Sparkle x={11} y={9} s={0.8} />
    </Glyph>
  )
}

/** Escudo de guarda com cadeado: autenticação em duas etapas. */
export function ShieldLockIcon(props: AchievementIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph {...props}>
      <defs>
        <Ramp id={id('plate')} tone="silver" x1={12} y1={6} x2={52} y2={54} />
        <Ramp id={id('face')} tone="azure" x1={16} y1={12} x2={48} y2={50} />
        <Ramp id={id('lock')} tone="gold" y1={24} y2={46} />
      </defs>
      <Shadow rx={16} cy={58} ry={2.6} />
      <path d="M32 4 55 11.5V29c0 13.4-9.2 24.6-23 28.5C18.2 53.6 9 42.4 9 29V11.5L32 4Z" fill={url('plate')} stroke={INK.silver} strokeWidth="3" />
      <path d="M32 9.5 50 15.4V29c0 10.8-7.2 20-18 23.4C21.2 49 14 39.8 14 29V15.4L32 9.5Z" fill={url('face')} stroke={INK.azure} strokeWidth="2.4" />
      <path d="M19 18c3.6-1.8 7.4-3 11-3.6" stroke="#E6F5FF" strokeWidth="3" opacity=".7" />
      <path d="M26 30v-4.5a6 6 0 0 1 12 0V30" stroke="#FFF0BE" strokeWidth="4.4" />
      <path d="M26 30v-4.5a6 6 0 0 1 12 0V30" stroke={INK.gold} strokeWidth="1.8" />
      <rect x="22.5" y="29.5" width="19" height="14.5" rx="4" fill={url('lock')} stroke={INK.gold} strokeWidth="2.6" />
      <circle cx="32" cy="35.5" r="2.5" fill={INK.gold} />
      <path d="M32 37.5v3.6" stroke={INK.gold} strokeWidth="2.6" />
      <Sparkle x={49} y={44} s={0.85} />
    </Glyph>
  )
}

/** Sacola da loja com moeda: compras realizadas. */
export function ShopBagIcon(props: AchievementIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph {...props}>
      <defs>
        <Ramp id={id('bag')} tone="ruby" x1={12} y1={18} x2={52} y2={58} />
        <Ramp id={id('coin')} tone="gold" x1={24} y1={33} x2={41} y2={50} />
      </defs>
      <Shadow rx={22} cy={59} ry={2.6} />
      <path d="M23 22v-4.5a9 9 0 0 1 18 0V22" stroke={INK.ruby} strokeWidth="7" />
      <path d="M23 22v-4.5a9 9 0 0 1 18 0V22" stroke="#EAB74F" strokeWidth="3.6" />
      <path d="M13 19h38l3.4 32c.3 3.2-2.2 5.9-5.4 5.9H15c-3.2 0-5.7-2.7-5.4-5.9L13 19Z" fill={url('bag')} stroke={INK.ruby} strokeWidth="3" />
      <path d="M11.6 27c13.5 3 27.3 3 40.8 0" stroke="#FFA091" strokeWidth="3.2" opacity=".9" />
      <path d="M15 34c1-3.5 3-6 6-7.5" stroke="#FFD5CE" strokeWidth="2.6" opacity=".55" />
      <circle cx="32" cy="41.5" r="8.8" fill={url('coin')} stroke={INK.gold} strokeWidth="2.6" />
      <path d="M35 37.4a4.6 4.6 0 1 0 0 8.2" stroke="#8F6015" strokeWidth="2.4" />
      <path d="M32 35v13" stroke="#8F6015" strokeWidth="2.4" />
      <Sparkle x={52} y={13} s={0.85} />
    </Glyph>
  )
}

/** Martelo de leiloeiro batendo no bloco: lances registrados. */
export function GavelIcon(props: AchievementIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph {...props}>
      <defs>
        <Ramp id={id('head')} tone="wood" x1={22} y1={4} x2={50} y2={32} />
        <Ramp id={id('block')} tone="wood" x1={12} y1={42} x2={52} y2={58} />
      </defs>
      <Shadow rx={22} cy={58} ry={2.6} />
      <path d="M34 20 16 38" stroke={INK.wood} strokeWidth="8" />
      <path d="M34 20 16 38" stroke="#C8944F" strokeWidth="4.4" />
      <circle cx="14.5" cy="39.5" r="3.6" fill="#C8944F" stroke={INK.wood} strokeWidth="2.4" />
      <path d="M32.5 4 49 20.5 40 29.5 23.5 13 32.5 4Z" fill={url('head')} stroke={INK.wood} strokeWidth="3" />
      <path d="M38.6 10.2 29.7 19.1M43 14.6l-8.9 8.9" stroke="#EAB74F" strokeWidth="3.2" />
      <path d="M27.5 8.5 36 17" stroke="#F0CE99" strokeWidth="2" opacity=".7" />
      <rect x="13" y="44" width="38" height="10" rx="3.4" fill={url('block')} stroke={INK.wood} strokeWidth="3" />
      <path d="M17 47.5h30" stroke="#EBC28A" strokeWidth="2.2" opacity=".75" />
      <path d="M46 35.5 51 31M50 41h6" stroke="#FFDD74" strokeWidth="2.8" />
    </Glyph>
  )
}

/** Placa de pregão com pergaminho: leilões criados. */
export function AuctionBoardIcon(props: AchievementIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph {...props}>
      <defs>
        <Ramp id={id('frame')} tone="wood" x1={8} y1={6} x2={56} y2={36} />
        <Ramp id={id('sheet')} tone="parchment" x1={14} y1={12} x2={50} y2={32} />
        <Ramp id={id('seal')} tone="gold" x1={38} y1={18} x2={52} y2={32} />
      </defs>
      <Shadow rx={16} cy={59} ry={2.6} />
      <path d="M32 34v20" stroke={INK.wood} strokeWidth="7" />
      <path d="M32 34v20" stroke="#C8944F" strokeWidth="3.6" />
      <rect x="20" y="52" width="24" height="6" rx="2.4" fill="#96612E" stroke={INK.wood} strokeWidth="2.6" />
      <rect x="7" y="7" width="50" height="29" rx="5" fill={url('frame')} stroke={INK.wood} strokeWidth="3" />
      <rect x="12.5" y="12.5" width="39" height="18" rx="2.6" fill={url('sheet')} stroke="#6B5227" strokeWidth="2.2" />
      <path d="M17 19h20M17 25h13" stroke="#B08B4F" strokeWidth="2.6" />
      <circle cx="44" cy="24.5" r="5" fill={url('seal')} stroke={INK.gold} strokeWidth="2.2" />
      <path d="M42.5 23c.8-.9 1.8-1.2 2.8-1" stroke="#FFF6D8" strokeWidth="1.6" />
      <path d="M11 11h18" stroke="#EBC28A" strokeWidth="2.2" opacity=".6" />
      <Sparkle x={54} y={43} s={0.8} />
    </Glyph>
  )
}

function LaurelLeaf({ cx, cy, angle, url, ink }: { cx: number; cy: number; angle: number; url: string; ink: string }) {
  return <ellipse cx={cx} cy={cy} rx="5.6" ry="3.1" transform={`rotate(${angle} ${cx} ${cy})`} fill={url} stroke={ink} strokeWidth="2" />
}

/** Coroa de louros com estrela: vitórias em leilão. */
export function LaurelIcon(props: AchievementIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph {...props}>
      <defs>
        <Ramp id={id('leaf')} tone="jade" x1={10} y1={8} x2={54} y2={54} />
        <Ramp id={id('star')} tone="gold" x1={22} y1={20} x2={44} y2={46} />
      </defs>
      <Shadow rx={17} cy={58} ry={2.6} />
      <path d="M27 11C17.5 16.5 12 25 12 33.5c0 9 6.8 16.4 20 20.5" stroke={INK.jade} strokeWidth="6.5" />
      <path d="M27 11C17.5 16.5 12 25 12 33.5c0 9 6.8 16.4 20 20.5" stroke="#4FA84C" strokeWidth="3.4" />
      <path d="M37 11c9.5 5.5 15 14 15 22.5 0 9-6.8 16.4-20 20.5" stroke={INK.jade} strokeWidth="6.5" />
      <path d="M37 11c9.5 5.5 15 14 15 22.5 0 9-6.8 16.4-20 20.5" stroke="#4FA84C" strokeWidth="3.4" />
      <LaurelLeaf cx={9.5} cy={41} angle={30} url={url('leaf')} ink={INK.jade} />
      <LaurelLeaf cx={7.5} cy={31} angle={5} url={url('leaf')} ink={INK.jade} />
      <LaurelLeaf cx={10.5} cy={21} angle={-25} url={url('leaf')} ink={INK.jade} />
      <LaurelLeaf cx={17.5} cy={13} angle={-50} url={url('leaf')} ink={INK.jade} />
      <LaurelLeaf cx={54.5} cy={41} angle={-30} url={url('leaf')} ink={INK.jade} />
      <LaurelLeaf cx={56.5} cy={31} angle={-5} url={url('leaf')} ink={INK.jade} />
      <LaurelLeaf cx={53.5} cy={21} angle={25} url={url('leaf')} ink={INK.jade} />
      <LaurelLeaf cx={46.5} cy={13} angle={50} url={url('leaf')} ink={INK.jade} />
      <path d="m32 17 4 8.3 9.1 1.3-6.6 6.4 1.6 9-8.1-4.3-8.1 4.3 1.6-9-6.6-6.4 9.1-1.3L32 17Z" fill={url('star')} stroke={INK.gold} strokeWidth="2.6" />
      <path d="m32 22 2.2 4.6-4.9-.7L32 22Z" fill="#FFF6D8" opacity=".75" />
    </Glyph>
  )
}

/** Coração com moeda: apoio financeiro ao servidor. */
export function SponsorHeartIcon(props: AchievementIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph {...props}>
      <defs>
        <Ramp id={id('heart')} tone="rose" x1={12} y1={10} x2={52} y2={52} />
        <Ramp id={id('coin')} tone="gold" x1={23} y1={20} x2={41} y2={38} />
      </defs>
      <Shadow rx={16} cy={56} ry={2.6} />
      <path d="M32 53C18.5 43.5 10 34.8 10 24.8 10 17 15.8 11 23.2 11c4.3 0 7.1 2.2 8.8 5 1.7-2.8 4.5-5 8.8-5C48.2 11 54 17 54 24.8c0 10-8.5 18.7-22 28.2Z" fill={url('heart')} stroke={INK.rose} strokeWidth="3" />
      <path d="M18.5 24c.6-5.2 3.8-8.8 8.5-10" stroke="#FFD6E5" strokeWidth="3.6" opacity=".8" />
      <circle cx="32" cy="29" r="9.4" fill={url('coin')} stroke={INK.gold} strokeWidth="2.8" />
      <path d="M35.2 24.6a4.9 4.9 0 1 0 0 8.8" stroke="#8F6015" strokeWidth="2.5" />
      <path d="M32 22v14" stroke="#8F6015" strokeWidth="2.5" />
      <Sparkle x={48} y={14} s={1} />
      <Sparkle x={13} y={40} s={0.75} />
    </Glyph>
  )
}

/** Moeda entre setas de troca: transferências entre jogadores. */
export function CoinTransferIcon(props: AchievementIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph {...props}>
      <defs>
        <Ramp id={id('coin')} tone="gold" x1={21} y1={21} x2={43} y2={43} />
        <Ramp id={id('arrow')} tone="azure" x1={10} y1={8} x2={54} y2={56} />
      </defs>
      <Shadow rx={19} cy={58} ry={2.6} />
      <path d="M11.5 28A21.5 21.5 0 0 1 42 15.5" stroke={INK.azure} strokeWidth="7.5" />
      <path d="M11.5 28A21.5 21.5 0 0 1 42 15.5" stroke={url('arrow')} strokeWidth="4" />
      <path d="M38 8.5 50 16l-11.5 7V8.5Z" fill={url('arrow')} stroke={INK.azure} strokeWidth="2.4" />
      <path d="M52.5 36A21.5 21.5 0 0 1 22 48.5" stroke={INK.azure} strokeWidth="7.5" />
      <path d="M52.5 36A21.5 21.5 0 0 1 22 48.5" stroke={url('arrow')} strokeWidth="4" />
      <path d="M26 55.5 14 48l11.5-7v14.5Z" fill={url('arrow')} stroke={INK.azure} strokeWidth="2.4" />
      <circle cx="32" cy="32" r="11.5" fill={url('coin')} stroke={INK.gold} strokeWidth="3" />
      <path d="M35.6 27a5.8 5.8 0 1 0 0 10" stroke="#8F6015" strokeWidth="2.6" />
      <path d="M32 24v16" stroke="#8F6015" strokeWidth="2.6" />
      <path d="M25 27c1-1.8 2.4-3.2 4.2-4" stroke="#FFF6D8" strokeWidth="2.2" opacity=".8" />
    </Glyph>
  )
}

/** Livro-razão aberto com marcador: transações da carteira. */
export function LedgerIcon(props: AchievementIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph {...props}>
      <defs>
        <Ramp id={id('page')} tone="parchment" x1={8} y1={12} x2={56} y2={52} />
        <Ramp id={id('spine')} tone="wood" x1={28} y1={14} x2={36} y2={52} />
        <Ramp id={id('coin')} tone="gold" x1={38} y1={42} x2={54} y2={58} />
      </defs>
      <Shadow rx={24} cy={55} ry={3} />
      <path d="M8 14c7.5-3 15.5-2.8 23 2.2v32.4c-7.5-5-15.5-5.2-23-2.2V14Z" fill={url('page')} stroke="#6B5227" strokeWidth="3" />
      <path d="M56 14c-7.5-3-15.5-2.8-23 2.2v32.4c7.5-5 15.5-5.2 23-2.2V14Z" fill={url('page')} stroke="#6B5227" strokeWidth="3" />
      <path d="M13 23c4-1.2 8-1 11.5 1M13 29.5c4-1.2 8-1 11.5 1M13 36c4-1.2 8-1 11.5 1" stroke="#B08B4F" strokeWidth="2.2" />
      <path d="M51 23c-4-1.2-8-1-11.5 1M51 29.5c-4-1.2-8-1-11.5 1M51 36c-4-1.2-8-1-11.5 1" stroke="#B08B4F" strokeWidth="2.2" />
      <path d="M29 15.5h6v34h-6z" fill={url('spine')} stroke={INK.wood} strokeWidth="2.4" />
      <path d="M45 13.5v15l-4-4.2-4 4.2V16" fill="#E23D4E" stroke={INK.ruby} strokeWidth="2.2" />
      <circle cx="46" cy="48" r="7" fill={url('coin')} stroke={INK.gold} strokeWidth="2.4" />
      <path d="M48.4 45a3.6 3.6 0 1 0 0 6" stroke="#8F6015" strokeWidth="2" />
      <path d="M46 43v10" stroke="#8F6015" strokeWidth="2" />
    </Glyph>
  )
}

/** Caixa de presente com laço dourado: bônus recebidos. */
export function GiftBoxIcon(props: AchievementIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph {...props}>
      <defs>
        <Ramp id={id('box')} tone="arcane" x1={12} y1={24} x2={52} y2={56} />
        <Ramp id={id('lid')} tone="arcane" x1={8} y1={16} x2={56} y2={30} />
        <Ramp id={id('ribbon')} tone="gold" x1={22} y1={6} x2={44} y2={56} />
      </defs>
      <Shadow rx={22} cy={58} ry={2.6} />
      <rect x="12" y="26" width="40" height="29" rx="4.5" fill={url('box')} stroke={INK.arcane} strokeWidth="3" />
      <rect x="8" y="17" width="48" height="11" rx="3.5" fill={url('lid')} stroke={INK.arcane} strokeWidth="3" />
      <path d="M13 21.5h16" stroke="#E7D3FF" strokeWidth="2.6" opacity=".75" />
      <path d="M16 34c1-3.5 2.8-6 5.5-7.5" stroke="#E7D3FF" strokeWidth="2.6" opacity=".5" />
      <path d="M26.5 17h11v38h-11z" fill={url('ribbon')} stroke={INK.gold} strokeWidth="2.6" />
      <path d="M32 17c-7 0-12-2.6-12-7.2 0-3.7 2.8-6.4 6.4-6.4 4.8 0 7.5 5.2 5.6 13.6Z" fill={url('ribbon')} stroke={INK.gold} strokeWidth="2.6" />
      <path d="M32 17c7 0 12-2.6 12-7.2 0-3.7-2.8-6.4-6.4-6.4-4.8 0-7.5 5.2-5.6 13.6Z" fill={url('ribbon')} stroke={INK.gold} strokeWidth="2.6" />
      <circle cx="32" cy="14" r="2.6" fill="#FFF6D8" stroke={INK.gold} strokeWidth="1.6" />
      <Sparkle x={54} y={40} s={0.9} />
      <Sparkle x={9} y={44} s={0.7} />
    </Glyph>
  )
}

function ChestBody({ url, withdraw }: { url: (name: string) => string; withdraw: boolean }) {
  return (
    <>
      <Shadow rx={23} cy={58} ry={2.8} />
      <path d="M9 31c0-9.5 10.3-16 23-16s23 6.5 23 16H9Z" fill={url('lid')} stroke={INK.wood} strokeWidth="3" />
      <path d="M9 31h46v18a5.5 5.5 0 0 1-5.5 5.5h-35A5.5 5.5 0 0 1 9 49V31Z" fill={url('body')} stroke={INK.wood} strokeWidth="3" />
      <path d="M8 31h48" stroke="#EAB74F" strokeWidth="3.4" />
      <path d="M17 18v36M47 18v36" stroke={INK.wood} strokeWidth="5.5" />
      <path d="M17 18v36M47 18v36" stroke="#EAB74F" strokeWidth="2.8" />
      <path d="M20 22c3.6-1.8 7.6-2.8 12-2.8" stroke="#EBC28A" strokeWidth="2.4" opacity=".7" />
      <rect x="26.5" y="29" width="11" height="13" rx="2.4" fill={url('lock')} stroke={INK.gold} strokeWidth="2.4" />
      <circle cx="32" cy="34.5" r="2" fill="#5A3819" />
      <path d="M32 36v3.5" stroke="#5A3819" strokeWidth="2" />
      {withdraw ? (
        <>
          <path d="M32 13V3M25.5 9 32 2.5 38.5 9" stroke={INK.jade} strokeWidth="7" />
          <path d="M32 13V3M25.5 9 32 2.5 38.5 9" stroke="#4FA84C" strokeWidth="3.6" />
        </>
      ) : (
        <>
          <path d="M32 2.5v10M25.5 6.5 32 13l6.5-6.5" stroke={INK.azure} strokeWidth="7" />
          <path d="M32 2.5v10M25.5 6.5 32 13l6.5-6.5" stroke="#3F8FE0" strokeWidth="3.6" />
        </>
      )}
    </>
  )
}

/** Baú com item saindo: retirada para o inventário online. */
export function ChestWithdrawIcon(props: AchievementIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph {...props}>
      <defs>
        <Ramp id={id('body')} tone="wood" x1={10} y1={30} x2={54} y2={56} />
        <Ramp id={id('lid')} tone="wood" x1={10} y1={14} x2={54} y2={32} />
        <Ramp id={id('lock')} tone="gold" x1={26} y1={28} x2={38} y2={43} />
      </defs>
      <ChestBody url={url} withdraw />
    </Glyph>
  )
}

/** Baú recebendo item: inserção de volta no servidor. */
export function ChestDepositIcon(props: AchievementIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph {...props}>
      <defs>
        <Ramp id={id('body')} tone="wood" x1={10} y1={30} x2={54} y2={56} />
        <Ramp id={id('lid')} tone="wood" x1={10} y1={14} x2={54} y2={32} />
        <Ramp id={id('lock')} tone="gold" x1={26} y1={28} x2={38} y2={43} />
      </defs>
      <ChestBody url={url} withdraw={false} />
    </Glyph>
  )
}

/** Dois itens girando entre si: trocas de item. */
export function SwapItemsIcon(props: AchievementIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph {...props}>
      <defs>
        <Ramp id={id('slotA')} tone="azure" x1={5} y1={6} x2={30} y2={32} />
        <Ramp id={id('slotB')} tone="arcane" x1={34} y1={32} x2={59} y2={58} />
        <Ramp id={id('arrow')} tone="gold" x1={10} y1={18} x2={54} y2={46} />
      </defs>
      <Shadow rx={22} cy={60} ry={2.4} />
      <rect x="5" y="6" width="25" height="25" rx="6.5" fill={url('slotA')} stroke={INK.azure} strokeWidth="3" />
      <path d="M12 24.5 22.5 14M20.5 11.5 25 16l-2.5 2.5-4.5-4.5 2.5-2.5Z" fill="#EAF6FF" stroke={INK.azure} strokeWidth="2.2" />
      <path d="M9 12c1-2.4 2.6-4 5-5" stroke="#EAF6FF" strokeWidth="2.2" opacity=".65" />
      <rect x="34" y="33" width="25" height="25" rx="6.5" fill={url('slotB')} stroke={INK.arcane} strokeWidth="3" />
      <path d="M40.5 42.5h12L46.5 53l-6-10.5Z" fill="#7CE7F2" stroke={INK.azure} strokeWidth="2.2" />
      <path d="M40.5 42.5h12" stroke="#EAF6FF" strokeWidth="1.8" opacity=".8" />
      <path d="M33.5 19H43a8.5 8.5 0 0 1 8.5 8.5V31" stroke={INK.gold} strokeWidth="7" />
      <path d="M33.5 19H43a8.5 8.5 0 0 1 8.5 8.5V31" stroke={url('arrow')} strokeWidth="3.6" />
      <path d="M45.5 29.5h12L51.5 38l-6-8.5Z" fill={url('arrow')} stroke={INK.gold} strokeWidth="2.2" />
      <path d="M30.5 45H21a8.5 8.5 0 0 1-8.5-8.5V33" stroke={INK.gold} strokeWidth="7" />
      <path d="M30.5 45H21a8.5 8.5 0 0 1-8.5-8.5V33" stroke={url('arrow')} strokeWidth="3.6" />
      <path d="M18.5 34.5h-12L12.5 26l6 8.5Z" fill={url('arrow')} stroke={INK.gold} strokeWidth="2.2" />
    </Glyph>
  )
}

/** Mochila de aventureiro: inventário e bags. */
export function BackpackIcon(props: AchievementIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph {...props}>
      <defs>
        <Ramp id={id('body')} tone="jade" x1={12} y1={10} x2={52} y2={56} />
        <Ramp id={id('flap')} tone="jade" x1={20} y1={18} x2={44} y2={40} />
        <Ramp id={id('buckle')} tone="gold" x1={27} y1={42} x2={38} y2={52} />
      </defs>
      <Shadow rx={21} cy={58} ry={2.6} />
      <path d="M25 12V9.5A5.5 5.5 0 0 1 30.5 4h3A5.5 5.5 0 0 1 39 9.5V12" stroke={INK.jade} strokeWidth="6.5" />
      <path d="M25 12V9.5A5.5 5.5 0 0 1 30.5 4h3A5.5 5.5 0 0 1 39 9.5V12" stroke="#4FA84C" strokeWidth="3.4" />
      <path d="M7 32.5h6v15H7a2.5 2.5 0 0 1-2.5-2.5V35A2.5 2.5 0 0 1 7 32.5Z" fill="#3E8C3E" stroke={INK.jade} strokeWidth="2.4" />
      <path d="M57 32.5h-6v15h6a2.5 2.5 0 0 0 2.5-2.5V35a2.5 2.5 0 0 0-2.5-2.5Z" fill="#3E8C3E" stroke={INK.jade} strokeWidth="2.4" />
      <path d="M12 27c0-8.8 7.2-16 16-16h8c8.8 0 16 7.2 16 16v21a6.5 6.5 0 0 1-6.5 6.5h-27A6.5 6.5 0 0 1 12 48V27Z" fill={url('body')} stroke={INK.jade} strokeWidth="3" />
      <path d="M20 30c0-6.2 5.4-10.5 12-10.5S44 23.8 44 30v7.5H20V30Z" fill={url('flap')} stroke={INK.jade} strokeWidth="2.6" />
      <path d="M23 24c2.4-2 5.4-3 9-3" stroke="#DFF8C9" strokeWidth="2.6" opacity=".7" />
      <rect x="21.5" y="41" width="21" height="14" rx="4" fill={url('flap')} stroke={INK.jade} strokeWidth="2.6" />
      <rect x="28.5" y="44.5" width="7" height="6" rx="1.8" fill={url('buckle')} stroke={INK.gold} strokeWidth="2" />
      <Sparkle x={54} y={16} s={0.8} />
    </Glyph>
  )
}

/** Divisas de patente em bronze, prata e ouro: progressão de nível. */
export function RankIcon(props: AchievementIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph {...props}>
      <defs>
        <Ramp id={id('bronze')} tone="bronze" x1={16} y1={30} x2={48} y2={52} />
        <Ramp id={id('silver')} tone="silver" x1={16} y1={18} x2={48} y2={40} />
        <Ramp id={id('gold')} tone="gold" x1={16} y1={5} x2={48} y2={28} />
      </defs>
      <Shadow rx={19} cy={57} ry={2.6} />
      <path d="M32 31 49 48l-5.5 5.5L32 42 20.5 53.5 15 48l17-17Z" fill={url('bronze')} stroke={INK.bronze} strokeWidth="2.8" />
      <path d="M32 19 49 36l-5.5 5.5L32 30 20.5 41.5 15 36l17-17Z" fill={url('silver')} stroke={INK.silver} strokeWidth="2.8" />
      <path d="M32 7 49 24l-5.5 5.5L32 18 20.5 29.5 15 24 32 7Z" fill={url('gold')} stroke={INK.gold} strokeWidth="2.8" />
      <path d="M25 20.5 32 13.5l7 7" stroke="#FFF6D8" strokeWidth="2.2" opacity=".75" />
      <Sparkle x={53} y={14} s={0.85} />
      <Sparkle x={10} y={18} s={0.65} />
    </Glyph>
  )
}

/** Orbe arcano de experiência. */
export function XpOrbIcon(props: AchievementIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph {...props}>
      <defs>
        <Ramp id={id('orb')} tone="arcane" x1={12} y1={10} x2={52} y2={50} />
        <radialGradient id={id('core')} cx="32" cy="30" r="14" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF7D6" />
          <stop offset="1" stopColor="#B9A6FF" stopOpacity="0" />
        </radialGradient>
      </defs>
      <Shadow rx={16} cy={56} ry={2.8} />
      <circle cx="32" cy="30" r="21" fill={url('orb')} stroke={INK.arcane} strokeWidth="3" />
      <circle cx="32" cy="30" r="14" fill={url('core')} />
      <path d="M32 14c1.9 8.4 6.7 13.2 15 15-8.3 1.8-13.1 6.6-15 15-1.9-8.4-6.7-13.2-15-15 8.3-1.8 13.1-6.6 15-15Z" fill="#FFF7D6" stroke="#6B4AB8" strokeWidth="2.2" />
      <path d="M19 22c2.2-4.6 5.6-7.6 10-9" stroke="#FFFFFF" strokeWidth="3.4" opacity=".55" />
      <circle cx="53" cy="17" r="2.4" fill="#D7B4FF" stroke={INK.arcane} strokeWidth="1.4" />
      <circle cx="11" cy="42" r="2" fill="#D7B4FF" stroke={INK.arcane} strokeWidth="1.3" />
      <Sparkle x={52} y={45} s={0.8} />
    </Glyph>
  )
}

/** Roleta com casas vermelhas e pretas: giros realizados. */
export function RouletteIcon(props: AchievementIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph {...props}>
      <defs>
        <Ramp id={id('rim')} tone="wood" x1={11} y1={12} x2={53} y2={54} />
        <Ramp id={id('hub')} tone="gold" x1={26} y1={27} x2={38} y2={39} />
      </defs>
      <Shadow rx={20} cy={57} ry={2.8} />
      <circle cx="32" cy="32" r="22" fill={url('rim')} stroke={INK.wood} strokeWidth="3" />
      <circle cx="32" cy="32" r="15.5" fill="#F6E8CA" stroke="#6B5227" strokeWidth="2.4" />
      <path d="M32 32 32 16.5A15.5 15.5 0 0 1 43 21z" fill="#D93635" />
      <path d="M32 32 47.5 32A15.5 15.5 0 0 1 43 43z" fill="#D93635" />
      <path d="M32 32 32 47.5A15.5 15.5 0 0 1 21 43z" fill="#D93635" />
      <path d="M32 32 16.5 32A15.5 15.5 0 0 1 21 21z" fill="#D93635" />
      <path d="M32 32 43 21A15.5 15.5 0 0 1 47.5 32z" fill="#241C16" />
      <path d="M32 32 43 43A15.5 15.5 0 0 1 32 47.5z" fill="#241C16" />
      <path d="M32 32 21 43A15.5 15.5 0 0 1 16.5 32z" fill="#241C16" />
      <path d="M32 32 21 21A15.5 15.5 0 0 1 32 16.5z" fill="#241C16" />
      <circle cx="32" cy="32" r="15.5" stroke="#6B5227" strokeWidth="2.4" />
      <circle cx="32" cy="32" r="5.6" fill={url('hub')} stroke={INK.gold} strokeWidth="2.4" />
      <circle cx="32" cy="20.5" r="2.8" fill="#FFFFFF" stroke="#6B5227" strokeWidth="1.6" />
      <path d="M17 20c2.4-3.4 5.4-6 9-7.6" stroke="#EBC28A" strokeWidth="2.6" opacity=".6" />
      <path d="M32 3.5 37.5 13h-11L32 3.5Z" fill="#EAB74F" stroke={INK.gold} strokeWidth="2.4" />
    </Glyph>
  )
}

/** Baú aberto transbordando moedas: caixas abertas. */
export function LootChestIcon(props: AchievementIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph {...props}>
      <defs>
        <Ramp id={id('lid')} tone="wood" x1={10} y1={5} x2={54} y2={32} />
        <Ramp id={id('body')} tone="wood" x1={10} y1={32} x2={54} y2={56} />
        <Ramp id={id('coin')} tone="gold" x1={14} y1={24} x2={50} y2={40} />
        <radialGradient id={id('glow')} cx="32" cy="33" r="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFE99B" />
          <stop offset="1" stopColor="#FFE99B" stopOpacity="0" />
        </radialGradient>
      </defs>
      <Shadow rx={23} cy={58} ry={2.8} />
      <path d="M10.5 30c-1-2-1.5-4.2-1.5-6.5C9 14 19.3 7 32 7s23 7 23 16.5c0 2.3-.5 4.5-1.5 6.5h-43Z" fill={url('lid')} stroke={INK.wood} strokeWidth="3" />
      <path d="M18 26c0-6.4 6.3-11.4 14-11.4" stroke="#EBC28A" strokeWidth="2.6" opacity=".7" />
      <ellipse cx="32" cy="33" rx="22" ry="11" fill={url('glow')} opacity=".85" />
      <circle cx="19" cy="31" r="5" fill={url('coin')} stroke={INK.gold} strokeWidth="2.2" />
      <circle cx="45" cy="31" r="5" fill={url('coin')} stroke={INK.gold} strokeWidth="2.2" />
      <circle cx="32" cy="28" r="5.6" fill={url('coin')} stroke={INK.gold} strokeWidth="2.2" />
      <path d="M9 34h46v15a5.5 5.5 0 0 1-5.5 5.5h-35A5.5 5.5 0 0 1 9 49V34Z" fill={url('body')} stroke={INK.wood} strokeWidth="3" />
      <path d="M8 40h48" stroke="#EAB74F" strokeWidth="3.4" />
      <path d="M17 34v20M47 34v20" stroke="#EAB74F" strokeWidth="2.8" />
      <rect x="26.5" y="35" width="11" height="11" rx="2.4" fill={url('coin')} stroke={INK.gold} strokeWidth="2.2" />
      <circle cx="32" cy="40" r="1.9" fill="#5A3819" />
      <Sparkle x={53} y={14} s={1} />
      <Sparkle x={11} y={17} s={0.75} />
    </Glyph>
  )
}

/** Gema lapidada: itens épicos. */
export function GemIcon(props: AchievementIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph {...props}>
      <defs>
        <Ramp id={id('crown')} tone="aqua" x1={10} y1={10} x2={54} y2={28} />
        <Ramp id={id('pavilion')} tone="azure" x1={10} y1={26} x2={54} y2={54} />
      </defs>
      <Shadow rx={15} cy={57} ry={2.6} />
      <path d="M20 10h24l10 15H10l10-15Z" fill={url('crown')} stroke={INK.azure} strokeWidth="2.8" />
      <path d="M10 25h44L32 54 10 25Z" fill={url('pavilion')} stroke={INK.azure} strokeWidth="3" />
      <path d="M20 10 26 25 32 10l6 15 6-15M26 25 32 54 38 25" stroke="#D6F9FF" strokeWidth="2.2" opacity=".85" />
      <path d="M10 25h44" stroke={INK.azure} strokeWidth="2.6" />
      <path d="M22 13.5h7" stroke="#FFFFFF" strokeWidth="2.6" opacity=".85" />
      <Sparkle x={9} y={9} s={1} fill="#E8FBFF" ink="#2C7FA8" />
      <Sparkle x={55} y={36} s={0.8} fill="#E8FBFF" ink="#2C7FA8" />
    </Glyph>
  )
}

/** Coroa cravejada: conquistas lendárias e premium. */
export function CrownIcon(props: AchievementIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph {...props}>
      <defs>
        <Ramp id={id('crown')} tone="gold" x1={9} y1={10} x2={55} y2={50} />
        <Ramp id={id('band')} tone="bronze" x1={12} y1={43} x2={52} y2={54} />
      </defs>
      <Shadow rx={20} cy={57} ry={2.6} />
      <path d="M9 17.5 20.5 29 32 11l11.5 18L55 17.5 51 45H13L9 17.5Z" fill={url('crown')} stroke={INK.gold} strokeWidth="3" />
      <path d="M17 22.5 22 28M32 17l4 6" stroke="#FFF6D8" strokeWidth="2.4" opacity=".7" />
      <rect x="12" y="44" width="40" height="9" rx="3" fill={url('band')} stroke={INK.gold} strokeWidth="2.8" />
      <circle cx="32" cy="8.5" r="3.2" fill="#FFF6D8" stroke={INK.gold} strokeWidth="1.8" />
      <circle cx="7.5" cy="15" r="2.8" fill="#FFF6D8" stroke={INK.gold} strokeWidth="1.7" />
      <circle cx="56.5" cy="15" r="2.8" fill="#FFF6D8" stroke={INK.gold} strokeWidth="1.7" />
      <circle cx="32" cy="36" r="4" fill="#E23D4E" stroke={INK.ruby} strokeWidth="2" />
      <circle cx="21" cy="38" r="3" fill="#4FA84C" stroke={INK.jade} strokeWidth="1.8" />
      <circle cx="43" cy="38" r="3" fill="#3F8FE0" stroke={INK.azure} strokeWidth="1.8" />
      <circle cx="20" cy="48.5" r="2" fill="#F5CB9E" />
      <circle cx="32" cy="48.5" r="2" fill="#F5CB9E" />
      <circle cx="44" cy="48.5" r="2" fill="#F5CB9E" />
    </Glyph>
  )
}

/** Caça-níqueis com rolos e alavanca: jogadas na Slot Machine. */
export function SlotMachineIcon(props: AchievementIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph {...props}>
      <defs>
        <Ramp id={id('case')} tone="ruby" x1={8} y1={7} x2={46} y2={55} />
        <Ramp id={id('coin')} tone="gold" x1={10} y1={48} x2={40} y2={58} />
      </defs>
      <Shadow rx={22} cy={58} ry={2.6} />
      <path d="M46 26h3a3.5 3.5 0 0 0 3.5-3.5V17" stroke="#5C6A7D" strokeWidth="5" />
      <circle cx="52.5" cy="14" r="4.2" fill="#FF7A6A" stroke={INK.ruby} strokeWidth="2.2" />
      <rect x="8" y="7" width="38" height="47" rx="6.5" fill={url('case')} stroke={INK.ruby} strokeWidth="3" />
      <path d="M8.5 20.5h37" stroke={INK.ruby} strokeWidth="2.4" />
      <circle cx="17" cy="14" r="2.4" fill="#FFE99B" stroke={INK.gold} strokeWidth="1.5" />
      <circle cx="27" cy="14" r="2.4" fill="#FFE99B" stroke={INK.gold} strokeWidth="1.5" />
      <circle cx="37" cy="14" r="2.4" fill="#FFE99B" stroke={INK.gold} strokeWidth="1.5" />
      <rect x="12.5" y="25" width="29" height="17" rx="3.4" fill="#1C2340" stroke="#0D1124" strokeWidth="2.6" />
      <rect x="15" y="27.5" width="7.5" height="12" rx="1.8" fill="#FFFDF4" />
      <rect x="23.3" y="27.5" width="7.5" height="12" rx="1.8" fill="#FFFDF4" />
      <rect x="31.6" y="27.5" width="7.5" height="12" rx="1.8" fill="#FFFDF4" />
      <circle cx="18.7" cy="33.5" r="3" fill="#E23D4E" stroke={INK.ruby} strokeWidth="1.4" />
      <rect x="24.3" y="31" width="5.5" height="5" rx="1.4" fill="#EAB74F" stroke={INK.gold} strokeWidth="1.3" />
      <path d="M33 30.5h4.5L35 38.5" stroke="#4FA84C" strokeWidth="2.4" />
      <rect x="13.5" y="45" width="27" height="6" rx="2.6" fill="#5C1220" stroke={INK.ruby} strokeWidth="2" />
      <path d="M12 12c1-2 2.6-3.4 5-4" stroke="#FFC7BC" strokeWidth="2.4" opacity=".6" />
      <circle cx="15" cy="55" r="4" fill={url('coin')} stroke={INK.gold} strokeWidth="2" />
      <circle cx="24" cy="57" r="3.2" fill={url('coin')} stroke={INK.gold} strokeWidth="1.8" />
    </Glyph>
  )
}

/** Moeda premiada em explosão de raios: jackpot. */
export function JackpotIcon(props: AchievementIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph {...props}>
      <defs>
        <Ramp id={id('coin')} tone="gold" x1={16} y1={14} x2={48} y2={48} />
        <Ramp id={id('small')} tone="gold" x1={4} y1={40} x2={60} y2={56} />
      </defs>
      <Shadow rx={22} cy={58} ry={2.6} />
      <path d="M32 3v7M13 8.5l3.6 6M51 8.5l-3.6 6M3 28h7M54 28h7" stroke="#FFDD74" strokeWidth="3.2" />
      <circle cx="32" cy="30" r="17" fill={url('coin')} stroke={INK.gold} strokeWidth="3" />
      <circle cx="32" cy="30" r="12.5" fill="none" stroke="#8F6015" strokeWidth="2.2" />
      <path d="m32 21 2.9 6 6.6.9-4.8 4.6 1.2 6.5-5.9-3.1-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9 2.9-6Z" fill="#FFF6D8" stroke="#8F6015" strokeWidth="1.8" />
      <path d="M21 22c1.8-3 4.2-5.2 7.4-6.4" stroke="#FFF6D8" strokeWidth="2.6" opacity=".7" />
      <circle cx="11" cy="46" r="5.5" fill={url('small')} stroke={INK.gold} strokeWidth="2.2" />
      <circle cx="53" cy="46" r="5.5" fill={url('small')} stroke={INK.gold} strokeWidth="2.2" />
      <circle cx="22" cy="53" r="4.2" fill={url('small')} stroke={INK.gold} strokeWidth="2" />
      <circle cx="42" cy="53" r="4.2" fill={url('small')} stroke={INK.gold} strokeWidth="2" />
      <Sparkle x={47} y={17} s={0.8} />
    </Glyph>
  )
}

/** Par de dados: partidas no Dice Game. */
export function DiceIcon(props: AchievementIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph {...props}>
      <defs>
        <Ramp id={id('white')} tone="ivory" x1={6} y1={24} x2={34} y2={54} />
        <Ramp id={id('red')} tone="ruby" x1={32} y1={6} x2={58} y2={34} />
      </defs>
      <Shadow rx={23} cy={57} ry={2.8} />
      <g transform="rotate(-16 44 21)">
        <rect x="32" y="8" width="25" height="25" rx="6.5" fill={url('red')} stroke={INK.ruby} strokeWidth="3" />
        <path d="M36 13c2.5-1.6 5.4-2.2 8.6-1.8" stroke="#FFC7BC" strokeWidth="2.4" opacity=".7" />
        <circle cx="38.5" cy="14.5" r="2.3" fill="#FFF7EC" />
        <circle cx="44.5" cy="20.5" r="2.3" fill="#FFF7EC" />
        <circle cx="50.5" cy="26.5" r="2.3" fill="#FFF7EC" />
      </g>
      <rect x="6" y="24" width="29" height="29" rx="7.5" fill={url('white')} stroke={INK.ivory} strokeWidth="3" />
      <path d="M11 30c2.6-1.8 5.6-2.6 9-2.6" stroke="#FFFFFF" strokeWidth="2.6" opacity=".9" />
      <circle cx="14" cy="31.5" r="2.6" fill="#C32F3E" />
      <circle cx="27" cy="31.5" r="2.6" fill="#2C2018" />
      <circle cx="20.5" cy="38.5" r="2.6" fill="#2C2018" />
      <circle cx="14" cy="45.5" r="2.6" fill="#2C2018" />
      <circle cx="27" cy="45.5" r="2.6" fill="#C32F3E" />
    </Glyph>
  )
}

/** Dado coroado por estrela: vitórias no Dice Game. */
export function DiceWinIcon(props: AchievementIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph {...props}>
      <defs>
        <Ramp id={id('die')} tone="ivory" x1={14} y1={20} x2={50} y2={56} />
        <Ramp id={id('star')} tone="gold" x1={22} y1={2} x2={42} y2={20} />
      </defs>
      <Shadow rx={20} cy={58} ry={2.6} />
      <path d="m32 2 3.4 7 7.6 1-5.5 5.3 1.3 7.5L32 19.2 25.2 22.8l1.3-7.5L21 10l7.6-1L32 2Z" fill={url('star')} stroke={INK.gold} strokeWidth="2.4" />
      <rect x="14" y="21" width="36" height="34" rx="8" fill={url('die')} stroke={INK.ivory} strokeWidth="3" />
      <path d="M20 27c3-2 6.5-3 11-3" stroke="#FFFFFF" strokeWidth="2.8" opacity=".9" />
      <circle cx="23" cy="30.5" r="2.8" fill="#C32F3E" />
      <circle cx="41" cy="30.5" r="2.8" fill="#2C2018" />
      <circle cx="23" cy="38.5" r="2.8" fill="#2C2018" />
      <circle cx="41" cy="38.5" r="2.8" fill="#C32F3E" />
      <circle cx="23" cy="46.5" r="2.8" fill="#2C2018" />
      <circle cx="41" cy="46.5" r="2.8" fill="#2C2018" />
      <Sparkle x={8} y={16} s={0.9} />
      <Sparkle x={56} y={16} s={0.9} />
    </Glyph>
  )
}

function FishShape({ url, ink, eye }: { url: (name: string) => string; ink: string; eye: string }) {
  return (
    <>
      <path d="M33 17.5c2.4-6.2 6.6-9.5 12-9.5-1.4 3.6-1.8 7-1 10.2" fill={url('fin')} stroke={ink} strokeWidth="2.6" />
      <path d="M33 45.5c1.2 5.2 4 8.6 8 9.8-.8-3.4-.5-6.4.6-9" fill={url('fin')} stroke={ink} strokeWidth="2.6" />
      <path d="M18 32 5 19v26l13-13Z" fill={url('fin')} stroke={ink} strokeWidth="3" />
      <path d="M18 32c6-10.5 14.5-16 22-16s16 7 16 16-8.5 16-16 16-16-5.5-22-16Z" fill={url('body')} stroke={ink} strokeWidth="3" />
      <path d="M24 38c7 5.5 18 6.5 28 2.5" stroke="#FFFFFF" strokeWidth="3" opacity=".35" />
      <path d="M30 26c2.8 2.4 4.4 4.4 4.4 6s-1.6 3.6-4.4 6M37 23.5c3 2.8 4.6 5.4 4.6 8.5s-1.6 5.7-4.6 8.5" stroke="#FFFFFF" strokeWidth="2" opacity=".45" />
      <path d="M47 21c-3.2 3.6-4.8 7.2-4.8 11s1.6 7.4 4.8 11" stroke={ink} strokeWidth="2.4" />
      <path d="M22 24 12 22" stroke={ink} strokeWidth="2" opacity=".5" />
      <circle cx="50.5" cy="27" r="3.4" fill="#FFFFFF" stroke={ink} strokeWidth="1.9" />
      <circle cx="51.3" cy="27.4" r="1.5" fill={eye} />
    </>
  )
}

/** Peixe capturado. */
export function FishIcon(props: AchievementIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph {...props}>
      <defs>
        <Ramp id={id('body')} tone="azure" x1={18} y1={16} x2={56} y2={48} />
        <Ramp id={id('fin')} tone="aqua" x1={5} y1={8} x2={46} y2={56} />
      </defs>
      <Shadow rx={22} cy={58} ry={2.6} />
      <FishShape url={url} ink={INK.azure} eye="#14294F" />
      <circle cx="56" cy="13" r="2.6" fill="#D6F9FF" stroke={INK.aqua} strokeWidth="1.5" />
      <circle cx="61" cy="7" r="1.6" fill="#D6F9FF" stroke={INK.aqua} strokeWidth="1.2" />
    </Glyph>
  )
}

/** Peixe raro com brilho dourado. */
export function RareFishIcon(props: AchievementIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph {...props}>
      <defs>
        <Ramp id={id('body')} tone="arcane" x1={18} y1={16} x2={56} y2={48} />
        <Ramp id={id('fin')} tone="gold" x1={5} y1={8} x2={46} y2={56} />
      </defs>
      <Shadow rx={22} cy={58} ry={2.6} />
      <FishShape url={url} ink={INK.arcane} eye="#2A1750" />
      <Sparkle x={14} y={10} s={1.15} />
      <Sparkle x={57} y={44} s={0.85} />
    </Glyph>
  )
}

/** Vara de pesca com molinete e boia. */
export function FishingRodIcon(props: AchievementIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph {...props}>
      <defs>
        <Ramp id={id('reel')} tone="gold" x1={13} y1={37} x2={26} y2={50} />
        <Ramp id={id('float')} tone="ruby" x1={48} y1={44} x2={58} y2={56} />
      </defs>
      <path d="M46 14c6.5 9 8.5 20 7 33" stroke="#EAF6FF" strokeWidth="2.2" opacity=".9" />
      <path d="M8 53 46 13" stroke={INK.wood} strokeWidth="7" />
      <path d="M8 53 46 13" stroke="#C8944F" strokeWidth="3.6" />
      <path d="M5 57.5 12 50" stroke="#4A0F19" strokeWidth="8" />
      <path d="M5 57.5 12 50" stroke="#B0413F" strokeWidth="4" />
      <circle cx="19.5" cy="42.5" r="6" fill={url('reel')} stroke={INK.gold} strokeWidth="2.6" />
      <circle cx="19.5" cy="42.5" r="2" fill="#5A3819" />
      <path d="M24 39.5 28 36" stroke={INK.gold} strokeWidth="2.6" />
      <circle cx="28.5" cy="33.5" r="2.4" fill="#C8944F" stroke={INK.wood} strokeWidth="1.6" />
      <circle cx="37" cy="24" r="1.8" fill="#C8944F" stroke={INK.wood} strokeWidth="1.4" />
      <circle cx="53" cy="50" r="5.2" fill={url('float')} stroke={INK.ruby} strokeWidth="2.4" />
      <path d="M48 50h10" stroke="#FFFDF4" strokeWidth="2.6" />
      <path d="M2 57c5-3.2 10-3.2 15 0s10 3.2 15 0 10-3.2 15 0 10 3.2 15 0" stroke="#57C8E8" strokeWidth="3" />
      <Sparkle x={57} y={12} s={0.8} fill="#E8FBFF" ink="#2C7FA8" />
    </Glyph>
  )
}

/** Passe de temporada: Battle Pass. */
export function BattlePassIcon(props: AchievementIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph {...props}>
      <defs>
        <Ramp id={id('ticket')} tone="arcane" x1={7} y1={17} x2={57} y2={47} />
        <Ramp id={id('star')} tone="gold" x1={14} y1={22} x2={36} y2={44} />
      </defs>
      <Shadow rx={24} cy={52} ry={2.8} />
      <path d="M7 17h50v8.5a5.5 5.5 0 0 0 0 11V45H7v-8.5a5.5 5.5 0 0 0 0-11V17Z" fill={url('ticket')} stroke={INK.arcane} strokeWidth="3" />
      <path d="M12 21.5h16" stroke="#E7D3FF" strokeWidth="2.6" opacity=".7" />
      <path d="M42 21v20" stroke="#E7D3FF" strokeWidth="2.6" strokeDasharray="3.5 4" />
      <path d="m24.5 23 3.2 6.6 7.3 1-5.3 5.1 1.3 7.3-6.5-3.4-6.5 3.4 1.3-7.3-5.3-5.1 7.3-1 3.2-6.6Z" fill={url('star')} stroke={INK.gold} strokeWidth="2.4" />
      <path d="m47 26 4 5-4 5M47 34l4 5-4 5" stroke="#FFE99B" strokeWidth="2.8" />
      <Sparkle x={56} y={12} s={0.85} />
    </Glyph>
  )
}

/** Calendário com sequência concluída: daily bonus. */
export function CalendarIcon(props: AchievementIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph {...props}>
      <defs>
        <Ramp id={id('sheet')} tone="parchment" x1={7} y1={12} x2={57} y2={56} />
        <Ramp id={id('head')} tone="ruby" x1={7} y1={12} x2={57} y2={27} />
        <Ramp id={id('ok')} tone="jade" x1={20} y1={33} x2={46} y2={53} />
      </defs>
      <Shadow rx={23} cy={58} ry={2.6} />
      <path d="M20 5v12M44 5v12" stroke="#5C6A7D" strokeWidth="5" />
      <rect x="7" y="13" width="50" height="43" rx="6" fill={url('sheet')} stroke="#6B5227" strokeWidth="3" />
      <path d="M7 19a6 6 0 0 1 6-6h38a6 6 0 0 1 6 6v7.5H7V19Z" fill={url('head')} stroke={INK.ruby} strokeWidth="2.6" />
      <path d="M12 18h14" stroke="#FFC7BC" strokeWidth="2.4" opacity=".75" />
      <circle cx="16" cy="33" r="2.4" fill="#C4A671" />
      <circle cx="26" cy="33" r="2.4" fill="#C4A671" />
      <circle cx="36" cy="33" r="2.4" fill="#C4A671" />
      <circle cx="46" cy="33" r="2.4" fill="#C4A671" />
      <circle cx="16" cy="43" r="2.4" fill="#C4A671" />
      <circle cx="48" cy="45" r="9" fill={url('ok')} stroke={INK.jade} strokeWidth="2.6" />
      <path d="m43.8 45.4 3.2 3.2 5.6-6.4" stroke="#F0FFE4" strokeWidth="3" />
      <path d="m26 40 5 5 9-9" stroke="#4FA84C" strokeWidth="3.4" />
    </Glyph>
  )
}

/** Barraca do mercado: transações no Marketplace. */
export function MarketStallIcon(props: AchievementIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph {...props}>
      <defs>
        <Ramp id={id('awning')} tone="ruby" x1={5} y1={10} x2={59} y2={30} />
        <Ramp id={id('counter')} tone="wood" x1={12} y1={32} x2={52} y2={56} />
      </defs>
      <Shadow rx={24} cy={58} ry={2.6} />
      <path d="M9 24v30M55 24v30" stroke={INK.wood} strokeWidth="5.5" />
      <path d="M9 24v30M55 24v30" stroke="#C8944F" strokeWidth="2.6" />
      <circle cx="21" cy="30" r="4" fill="#E23D4E" stroke={INK.ruby} strokeWidth="2" />
      <circle cx="31" cy="31" r="3.4" fill="#4FA84C" stroke={INK.jade} strokeWidth="1.9" />
      <circle cx="41" cy="30" r="4" fill="#EAB74F" stroke={INK.gold} strokeWidth="2" />
      <rect x="12" y="33" width="40" height="21" rx="3.5" fill={url('counter')} stroke={INK.wood} strokeWidth="3" />
      <path d="M10 33h44" stroke="#EBC28A" strokeWidth="3.4" />
      <path d="M18 40h28M18 46h20" stroke="#5A3819" strokeWidth="2.2" opacity=".55" />
      <path d="M5 11h54l-4.5 14h-45L5 11Z" fill={url('awning')} stroke={INK.ruby} strokeWidth="3" />
      <path d="M20.5 11 17 25M32 11v14M43.5 11l3.5 14" stroke="#FFF7EC" strokeWidth="3.6" opacity=".9" />
      <path d="M9.5 25c2 2.8 4 4.2 6 4.2s4-1.4 6-4.2M21.5 25c2 2.8 4 4.2 6 4.2s4-1.4 6-4.2M33.5 25c2 2.8 4 4.2 6 4.2s4-1.4 6-4.2M45.5 25c2 2.8 4 4.2 6 4.2s3.8-1.3 5.8-3.9" stroke={INK.ruby} strokeWidth="2.6" />
      <path d="M9 14h16" stroke="#FFC7BC" strokeWidth="2.2" opacity=".6" />
    </Glyph>
  )
}

/** Personagem entre setas: transferência de personagem. */
export function CharacterTransferIcon(props: AchievementIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph {...props}>
      <defs>
        <Ramp id={id('skin')} tone="skin" x1={25} y1={8} x2={40} y2={26} />
        <Ramp id={id('cloth')} tone="azure" x1={18} y1={30} x2={46} y2={50} />
        <Ramp id={id('arrow')} tone="gold" x1={8} y1={50} x2={56} y2={62} />
      </defs>
      <Shadow rx={19} cy={58} ry={2.6} />
      <path d="M18 47c0-7.8 6.3-14 14-14s14 6.2 14 14v3.5H18V47Z" fill={url('cloth')} stroke={INK.azure} strokeWidth="3" />
      <path d="M23 41c1.6-2.8 4-4.6 7-5.4" stroke="#E6F5FF" strokeWidth="2.8" opacity=".7" />
      <circle cx="32" cy="19" r="9" fill={url('skin')} stroke={INK.skin} strokeWidth="2.6" />
      <path d="M24 16c1.4-7 14-8 16 0-4.4-2.2-10-1.6-13.4 1.6L24 16Z" fill="#2B2130" stroke="#15111A" strokeWidth="2" />
      <circle cx="28.8" cy="19.6" r="1.2" fill="#38241D" />
      <circle cx="35.2" cy="19.6" r="1.2" fill="#38241D" />
      <path d="M29.8 23.4c1.5 1.3 2.9 1.3 4.4 0" stroke="#C9764F" strokeWidth="1.6" />
      <path d="M14 55h36" stroke={INK.gold} strokeWidth="6.5" />
      <path d="M14 55h36" stroke={url('arrow')} strokeWidth="3.4" />
      <path d="M13 49.5 5.5 55l7.5 5.5v-11Z" fill={url('arrow')} stroke={INK.gold} strokeWidth="2.2" />
      <path d="M51 49.5 58.5 55 51 60.5v-11Z" fill={url('arrow')} stroke={INK.gold} strokeWidth="2.2" />
    </Glyph>
  )
}

export const ACHIEVEMENT_ICONS = {
  trophy: TrophyIcon,
  padlock: PadlockIcon,
  key: KeyIcon,
  avatar: AvatarIcon,
  email: EnvelopeCheckIcon,
  shield: ShieldLockIcon,
  shop: ShopBagIcon,
  gavel: GavelIcon,
  auction: AuctionBoardIcon,
  laurel: LaurelIcon,
  sponsor: SponsorHeartIcon,
  transfer: CoinTransferIcon,
  ledger: LedgerIcon,
  gift: GiftBoxIcon,
  chestWithdraw: ChestWithdrawIcon,
  chestDeposit: ChestDepositIcon,
  swap: SwapItemsIcon,
  backpack: BackpackIcon,
  rank: RankIcon,
  xp: XpOrbIcon,
  roulette: RouletteIcon,
  lootChest: LootChestIcon,
  gem: GemIcon,
  crown: CrownIcon,
  slot: SlotMachineIcon,
  jackpot: JackpotIcon,
  dice: DiceIcon,
  diceWin: DiceWinIcon,
  fish: FishIcon,
  rareFish: RareFishIcon,
  fishingRod: FishingRodIcon,
  battlePass: BattlePassIcon,
  calendar: CalendarIcon,
  market: MarketStallIcon,
  characterTransfer: CharacterTransferIcon,
} as const satisfies Record<string, ComponentType<AchievementIconProps>>

export type AchievementIconKey = keyof typeof ACHIEVEMENT_ICONS

const ICON_BY_CODE: Record<string, AchievementIconKey> = {
  primeiro_login: 'key',
  avatar_editado: 'avatar',
  email_verificado: 'email',
  '2fa_ativado': 'shield',
  primeira_compra: 'shop',
  comprador_frequente: 'shop',
  comprador_vip: 'shop',
  primeiro_lance: 'gavel',
  '50_lances': 'gavel',
  lanceador_profissional: 'gavel',
  lanceador_mestre: 'gavel',
  '10_leiloes': 'auction',
  leiloeiro_profissional: 'auction',
  leiloeiro_mestre: 'auction',
  primeiro_vencedor_leilao: 'laurel',
  vencedor_serie: 'laurel',
  vencedor_mestre: 'laurel',
  primeiro_pedido_pagamento: 'sponsor',
  primeiro_pagamento_concluido: 'sponsor',
  patrocinador_ouro: 'sponsor',
  patrocinador_diamante: 'sponsor',
  primeira_transferencia_para_jogador: 'transfer',
  benfeitor_comunitario: 'transfer',
  '100_transacoes': 'ledger',
  '250_transacoes': 'ledger',
  '500_transacoes': 'ledger',
  primeiro_bonus: 'gift',
  bonus_mestre: 'gift',
  bonus_expert: 'gift',
  primeira_retirada_item: 'chestWithdraw',
  primeira_insercao_item: 'chestDeposit',
  primeira_troca_itens: 'swap',
  trocador_incansavel: 'swap',
  colecionador_itens: 'backpack',
  mestre_inventario: 'backpack',
  primeira_bag: 'backpack',
  nivel_10: 'rank',
  nivel_25: 'rank',
  nivel_50: 'rank',
  nivel_75: 'rank',
  nivel_100: 'rank',
  '1000_xp': 'xp',
  '5000_xp': 'xp',
  '10000_xp': 'xp',
  primeiro_spin: 'roulette',
  '10_spins': 'roulette',
  '50_spins': 'roulette',
  '100_spins': 'roulette',
  primeiro_premio_roleta: 'trophy',
  primeira_caixa_aberta: 'lootChest',
  '10_caixas_abertas': 'lootChest',
  '50_caixas_abertas': 'lootChest',
  '100_caixas_abertas': 'lootChest',
  item_epico_caixa: 'gem',
  item_lendario_caixa: 'crown',
  primeira_jogada_slot: 'slot',
  '10_jogadas_slot': 'slot',
  '50_jogadas_slot': 'slot',
  '100_jogadas_slot': 'slot',
  primeiro_jackpot: 'jackpot',
  jackpot_mestre: 'jackpot',
  primeira_jogada_dice: 'dice',
  '10_jogadas_dice': 'dice',
  '50_jogadas_dice': 'dice',
  primeira_vitoria_dice: 'diceWin',
  '10_vitorias_dice': 'diceWin',
  '50_vitorias_dice': 'diceWin',
  primeira_pescaria: 'fishingRod',
  '10_peixes_capturados': 'fish',
  '50_peixes_capturados': 'fish',
  '100_peixes_capturados': 'fish',
  peixe_raro: 'rareFish',
  peixe_epico: 'rareFish',
  peixe_lendario: 'rareFish',
  vara_nivel_5: 'fishingRod',
  vara_nivel_10: 'fishingRod',
  vara_nivel_20: 'fishingRod',
  primeiro_battle_pass: 'battlePass',
  battle_pass_nivel_10: 'battlePass',
  battle_pass_nivel_25: 'battlePass',
  battle_pass_nivel_50: 'battlePass',
  battle_pass_premium: 'crown',
  primeiro_daily_bonus: 'calendar',
  daily_bonus_7dias: 'calendar',
  daily_bonus_30dias: 'calendar',
  daily_bonus_100dias: 'calendar',
  primeira_transacao_marketplace: 'market',
  '5_transacoes_marketplace': 'market',
  '10_transacoes_marketplace': 'market',
  primeira_transferencia_personagem: 'characterTransfer',
}

/**
 * Palavras-chave para códigos fora do catálogo do core (extensões de cliente),
 * avaliadas na ordem em que aparecem.
 */
const ICON_BY_KEYWORD: ReadonlyArray<readonly [string, AchievementIconKey]> = [
  ['battle_pass', 'battlePass'],
  ['daily', 'calendar'],
  ['marketplace', 'market'],
  ['jackpot', 'jackpot'],
  ['slot', 'slot'],
  ['vitoria_dice', 'diceWin'],
  ['vitorias_dice', 'diceWin'],
  ['dice', 'dice'],
  ['roleta', 'roulette'],
  ['spin', 'roulette'],
  ['giro', 'roulette'],
  ['caixa', 'lootChest'],
  ['vara', 'fishingRod'],
  ['pesca', 'fishingRod'],
  ['peixe', 'fish'],
  ['leilao', 'auction'],
  ['leiloes', 'auction'],
  ['leiloeiro', 'auction'],
  ['lance', 'gavel'],
  ['vencedor', 'laurel'],
  ['patrocinador', 'sponsor'],
  ['pagamento', 'sponsor'],
  ['transferencia', 'transfer'],
  ['transac', 'ledger'],
  ['bonus', 'gift'],
  ['compra', 'shop'],
  ['comprador', 'shop'],
  ['inventario', 'backpack'],
  ['colecionador', 'backpack'],
  ['bag', 'backpack'],
  ['troca', 'swap'],
  ['item', 'gem'],
  ['nivel', 'rank'],
  ['xp', 'xp'],
  ['login', 'key'],
  ['avatar', 'avatar'],
  ['email', 'email'],
  ['2fa', 'shield'],
]

/** Resolve a arte da conquista pelo código; cai na taça quando o código é desconhecido. */
export function resolveAchievementIconKey(code: string): AchievementIconKey {
  const normalized = code.trim().toLowerCase()
  const exact = ICON_BY_CODE[normalized]
  if (exact) return exact
  const keyword = ICON_BY_KEYWORD.find(([needle]) => normalized.includes(needle))
  return keyword ? keyword[1] : 'trophy'
}
