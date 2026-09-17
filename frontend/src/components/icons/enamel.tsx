import { useId, useState, type ReactNode, type SVGProps } from 'react'

export type EnamelIconProps = Omit<SVGProps<SVGSVGElement>, 'children'>

/**
 * Kit compartilhado das ilustrações esmaltadas do painel.
 * Mesmo desenho das conquistas e das atividades do Denkynho: degradê,
 * contorno escuro, brilho, sombra de contato e faíscas. Cada instância
 * gera IDs próprios de gradiente para poder repetir na mesma tela.
 */
export function Glyph({ children, className = '', ...props }: EnamelIconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width="44"
      height="44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      shapeRendering="geometricPrecision"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`enamel-glyph achievement-glyph ${className}`.trim()}
      {...props}
    >
      {children}
    </svg>
  )
}

export const TONES = {
  gold: ['#FFF0BE', '#EAB74F', '#8F6015'],
  bronze: ['#F5CB9E', '#C0793A', '#7A4113'],
  silver: ['#FFFFFF', '#D2DBE6', '#7E8DA1'],
  ruby: ['#FFA091', '#E23D4E', '#8E1E2C'],
  rose: ['#FFB9D2', '#F04578', '#A01848'],
  azure: ['#ABDFFF', '#3F8FE0', '#1E4A8C'],
  arcane: ['#DBBBFF', '#8B5CD6', '#4B2C8F'],
  jade: ['#C8F3A8', '#4FA84C', '#22672E'],
  wood: ['#D6AC71', '#96612E', '#573517'],
  parchment: ['#FFF9E8', '#F0DFBA', '#C4A671'],
  ivory: ['#FFFFFF', '#F7F0DE', '#D5C4A3'],
  aqua: ['#D6F9FF', '#57C8E8', '#1F7FA8'],
  night: ['#48598A', '#26315A', '#141A33'],
  skin: ['#FFE6CD', '#F3BE93', '#D28F5D'],
} as const

export const INK = {
  gold: '#4A2F0B',
  bronze: '#492A0B',
  silver: '#2C3440',
  ruby: '#4A0F19',
  rose: '#5A1230',
  azure: '#14294F',
  arcane: '#2A1750',
  jade: '#123D1A',
  wood: '#2A1A0C',
  parchment: '#6B5227',
  ivory: '#3A2E1C',
  aqua: '#124659',
  night: '#0D1124',
  skin: '#38241D',
} as const

export type Tone = keyof typeof TONES

export function Ramp({
  id,
  tone,
  x1 = 14,
  y1 = 7,
  x2 = 50,
  y2 = 57,
}: {
  id: string
  tone: Tone
  x1?: number
  y1?: number
  x2?: number
  y2?: number
}) {
  const [from, via, to] = TONES[tone]
  return (
    <linearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2} gradientUnits="userSpaceOnUse">
      <stop stopColor={from} />
      <stop offset=".48" stopColor={via} />
      <stop offset="1" stopColor={to} />
    </linearGradient>
  )
}

/** Sombra de contato que assenta a peça, como nos ícones de atividade do Denkynho. */
export function Shadow({ cx = 32, cy = 58, rx = 20, ry = 3 }: { cx?: number; cy?: number; rx?: number; ry?: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#130E0C" opacity=".28" />
}

/** Faísca de quatro pontas usada como acento de brilho. */
export function Sparkle({
  x,
  y,
  s = 1,
  fill = '#FFF3AE',
  ink = '#D89A25',
}: {
  x: number
  y: number
  s?: number
  fill?: string
  ink?: string
}) {
  const a = 3.6 * s
  const b = 1.25 * s
  return (
    <path
      d={`M${x} ${y - a}l${b} ${a - b} ${a - b} ${b}-${a - b} ${b}-${b} ${a - b}-${b}-${a - b}-${a - b}-${b} ${a - b}-${b}z`}
      fill={fill}
      stroke={ink}
      strokeWidth="1.1"
    />
  )
}

let glyphSequence = 0

/**
 * Prefixo exclusivo por instância. O contador complementa `useId` porque o
 * mesmo ícone pode aparecer em árvores React distintas do documento.
 */
export function useGlyphIds() {
  const reactId = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [serial] = useState(() => (glyphSequence += 1))
  const prefix = `enl${reactId}s${serial}`
  return {
    id: (name: string) => `${prefix}${name}`,
    url: (name: string) => `url(#${prefix}${name})`,
  }
}
