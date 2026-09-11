import type { ReactNode, SVGProps } from 'react'

type SlotIconProps = Omit<SVGProps<SVGSVGElement>, 'children'>

/**
 * Ícones no estilo dos placeholders do inventário L2:
 * ilustração gravada (contorno + detalhes internos), não blob sólido.
 */
function SlotSvg({ children, className = '', ...props }: SlotIconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width="44"
      height="44"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`character-equipment-slot-silhouette ${className}`.trim()}
      {...props}
    >
      {children}
    </svg>
  )
}

function Fill({ d, opacity = 0.18 }: { d: string; opacity?: number }) {
  return <path d={d} fill="currentColor" stroke="none" opacity={opacity} />
}

/** Par de brincos / acessório de rosto (teardrops pendurados). */
export function FaceSlotIcon(props: SlotIconProps) {
  return (
    <SlotSvg {...props}>
      <Fill d="M18 14c0-2.8 2.2-5 5-5s5 2.2 5 5c0 4-5 9.5-5 9.5S18 18 18 14z" opacity={0.2} />
      <Fill d="M36 14c0-2.8 2.2-5 5-5s5 2.2 5 5c0 4-5 9.5-5 9.5S36 18 36 14z" opacity={0.2} />
      <circle cx="23" cy="10" r="2.2" fill="currentColor" stroke="none" opacity={0.55} />
      <circle cx="41" cy="10" r="2.2" fill="currentColor" stroke="none" opacity={0.55} />
      <path d="M23 12.2v4.2M41 12.2v4.2" />
      <path d="M18.5 18.5c0-2.6 2-4.8 4.5-4.8s4.5 2.2 4.5 4.8c0 3.6-4.5 9-4.5 9s-4.5-5.4-4.5-9z" />
      <path d="M36.5 18.5c0-2.6 2-4.8 4.5-4.8s4.5 2.2 4.5 4.8c0 3.6-4.5 9-4.5 9s-4.5-5.4-4.5-9z" />
      <path d="M21.2 19.5c.6 1.4 1.6 2.8 1.8 4.2M39.2 19.5c.6 1.4 1.6 2.8 1.8 4.2" opacity={0.55} />
      <path d="M23 28.5c0 2.4-1.8 5.2-1.8 7.2 0 2.2 1.4 4 1.8 5.5.4-1.5 1.8-3.3 1.8-5.5 0-2-1.8-4.8-1.8-7.2z" />
      <path d="M41 28.5c0 2.4-1.8 5.2-1.8 7.2 0 2.2 1.4 4 1.8 5.5.4-1.5 1.8-3.3 1.8-5.5 0-2-1.8-4.8-1.8-7.2z" />
      <circle cx="23" cy="42.5" r="2.4" />
      <circle cx="41" cy="42.5" r="2.4" />
      <circle cx="23" cy="42.5" r="1" fill="currentColor" stroke="none" opacity={0.45} />
      <circle cx="41" cy="42.5" r="1" fill="currentColor" stroke="none" opacity={0.45} />
    </SlotSvg>
  )
}

/** Elmo de cavaleiro com crista e fenda dos olhos. */
export function HeadSlotIcon(props: SlotIconProps) {
  return (
    <SlotSvg {...props}>
      <Fill d="M16 30c0-11 7.2-18.5 16-18.5S48 19 48 30v8.5c0 4.5-5.5 8.5-16 8.5S16 42.5 16 38.5V30z" />
      <path d="M16.5 30.5c0-10.5 7-18 15.5-18s15.5 7.5 15.5 18" />
      <path d="M16.5 30.5v8c0 4.8 5.4 9 15.5 9s15.5-4.2 15.5-9v-8" />
      <path d="M32 12.5v8.5" />
      <path d="M24 16.5c2.4-2 5-3 8-3s5.6 1 8 3" opacity={0.55} />
      <path d="M20 28.5h24" />
      <path d="M21.5 28.5v4.5c0 1.2.8 2 2 2h17c1.2 0 2-.8 2-2v-4.5" />
      <path d="M23.5 32.5h17" opacity={0.5} />
      <path d="M20 38.5h24M23 43.5h18" opacity={0.45} />
      <path d="M26 22.5c1.6-1.2 3.6-1.8 6-1.8s4.4.6 6 1.8" opacity={0.4} />
      <circle cx="22" cy="25.5" r="1.2" fill="currentColor" stroke="none" opacity={0.45} />
      <circle cx="42" cy="25.5" r="1.2" fill="currentColor" stroke="none" opacity={0.45} />
    </SlotSvg>
  )
}

/** Ornamento de cabelo / diadema. */
export function HairSlotIcon(props: SlotIconProps) {
  return (
    <SlotSvg {...props}>
      <Fill d="M14 30c3.5-12 9.5-17.5 18-17.5S46.5 18 50 30c-3.2-1.5-8.5-2.5-18-2.5S17.2 28.5 14 30z" opacity={0.16} />
      <path d="M13.5 31c3.6-12.5 10-18.5 18.5-18.5S46.9 18.5 50.5 31" />
      <path d="M16 33.5c3.5 1.6 8 2.5 16 2.5s12.5-.9 16-2.5" />
      <path d="M18.5 36.5c3 2.4 7.2 3.8 13.5 3.8s10.5-1.4 13.5-3.8" opacity={0.55} />
      <path d="M26 14.5h12l3.5 10.5H22.5L26 14.5z" />
      <circle cx="32" cy="12.5" r="3.6" />
      <circle cx="32" cy="12.5" r="1.5" fill="currentColor" stroke="none" opacity={0.4} />
      <path d="M22 24c2.8-1.8 6.2-2.8 10-2.8s7.2 1 10 2.8" opacity={0.5} />
      <path d="M20 28.5h24" opacity={0.4} />
      <circle cx="20.5" cy="28" r="1.3" fill="currentColor" stroke="none" opacity={0.45} />
      <circle cx="43.5" cy="28" r="1.3" fill="currentColor" stroke="none" opacity={0.45} />
    </SlotSvg>
  )
}

/** Manopla com dedos e placas. */
export function GlovesSlotIcon(props: SlotIconProps) {
  return (
    <SlotSvg {...props}>
      <Fill d="M24 22c1.5-4 5.5-5 8-2l1 1.5 1.2-2.2c1.5-2.6 5-2.8 6.8.2l1.4 2.2.8-1.4c1.4-2.4 5-2.2 6.4.6L54 30.5 48 36v14.5c0 2.6-2.2 4.5-4.8 4.5H30.5c-2.6 0-4.5-1.9-4.5-4.5V34.5L22 30.5c-2-2-2.2-5.2-.8-7.5L24 22z" opacity={0.16} />
      {/* antebraço */}
      <path d="M27.5 34.5h16.5V50c0 2-1.6 3.5-3.5 3.5H31c-1.9 0-3.5-1.5-3.5-3.5V34.5z" />
      <path d="M29.5 39.5h12.5M29.5 44.5h12.5M29.5 49h12.5" opacity={0.45} />
      {/* palma */}
      <path d="M26.5 28.5 31 34.5h16l4.2-5.5c1.2-1.6 1-3.8-.5-5.2l-2.8-2.6" />
      {/* dedos */}
      <path d="M29.5 20.5c0-3.2 2.2-5.5 4.2-4.2 1 .6 1.5 2 1.5 3.5v8" />
      <path d="M35.5 16.5c0-3.5 2.4-5.8 4.4-4.2 1.1.8 1.6 2.4 1.6 4.2v12" />
      <path d="M41.5 18c0-3.2 2.2-5.2 4.2-3.8 1 .7 1.5 2.2 1.5 3.8v10.5" />
      <path d="M47 20.5c0-2.6 1.8-4.4 3.6-3.2.9.6 1.4 1.8 1.4 3.2V29" />
      {/* polegar */}
      <path d="M26.5 28.5c-3.5-1-5.5.8-5 3.8.4 2.4 2.4 4 4.5 4.2" />
      <circle cx="33" cy="36.5" r="1.1" fill="currentColor" stroke="none" opacity={0.45} />
      <circle cx="39" cy="36.5" r="1.1" fill="currentColor" stroke="none" opacity={0.45} />
    </SlotSvg>
  )
}

/** Peitoral com peitorais e ombreiras. */
export function ChestSlotIcon(props: SlotIconProps) {
  return (
    <SlotSvg {...props}>
      <Fill d="M12 24.5 21 17c3.5-2.6 7.2-3.8 11-3.8h8c3.8 0 7.5 1.2 11 3.8l9 7.5-6.5 2V50.5c0 3-3 5.5-6.5 5.5H24.5c-3.5 0-6.5-2.5-6.5-5.5V26.5L12 24.5z" />
      <path d="M12.5 24.5 21.5 17c3.4-2.5 7-3.7 10.5-3.7h8c3.5 0 7.1 1.2 10.5 3.7l9 7.5" />
      <path d="M18.5 26.5v24c0 2.8 2.8 5 6 5h15c3.2 0 6-2.2 6-5v-24" />
      {/* ombreiras */}
      <path d="M12.5 24.5 19 27.5v5.5l-6.5-1.8zM51.5 24.5 45 27.5v5.5l6.5-1.8z" />
      {/* peitorais */}
      <path d="M23.5 28.5c2.5 3.5 5 5.2 8.5 5.2" />
      <path d="M40.5 28.5c-2.5 3.5-5 5.2-8.5 5.2" />
      <path d="M24 36.5h16" opacity={0.55} />
      <path d="M26 41.5h12M26 46.5h12M27.5 51h9" opacity={0.4} />
      {/* gola */}
      <path d="M27 14.8h10l2 5.5H25l2-5.5z" />
      <circle cx="21" cy="30" r="1.2" fill="currentColor" stroke="none" opacity={0.4} />
      <circle cx="43" cy="30" r="1.2" fill="currentColor" stroke="none" opacity={0.4} />
    </SlotSvg>
  )
}

/** Par de botas altas. */
export function FeetSlotIcon(props: SlotIconProps) {
  return (
    <SlotSvg {...props}>
      <Fill d="M14 12h12v28l10 3c2.8.8 4.5 3.5 4 6.2-.5 2.5-2.7 4.3-5.3 4.3H13.5C11 53.5 9 51.5 9 49V15c0-1.7 1.3-3 3-3h2z" opacity={0.16} />
      <Fill d="M38 16h10l4 18c.6 2.6-.8 5-3.2 5.8L42 42V19c0-1.7 1.3-3 3-3h-7z" opacity={0.14} />
      {/* bota esquerda */}
      <path d="M14.5 12.5h11.5c1.4 0 2.5 1.1 2.5 2.5V40l10.5 3.2c2.5.7 4.1 3.1 3.6 5.6-.5 2.3-2.5 3.9-4.9 3.9H13.2c-2.2 0-4-1.8-4-4V15c0-1.4 1.1-2.5 2.5-2.5h2.8z" />
      <path d="M16.5 20.5h8M16.5 27.5h8M16.5 34.5h8" opacity={0.45} />
      <path d="M11.5 45.5h24" opacity={0.5} />
      {/* bota direita (atrás/lado) */}
      <path d="M38.5 16.5h9.5c1.5 0 2.7 1.3 2.5 2.8L47 38.5c-.3 1.8-1.8 3-3.6 3H38.5V19c0-1.4 1.1-2.5 2.5-2.5h-2.5z" opacity={0.85} />
      <path d="M40.5 23.5h7M40.5 30.5h6" opacity={0.4} />
      <path d="M18 14.5h5" opacity={0.4} />
    </SlotSvg>
  )
}

/** Capa drapeada com bainha irregular. */
export function CloakSlotIcon(props: SlotIconProps) {
  return (
    <SlotSvg {...props}>
      <Fill d="M18 14h28l-3.5 12.5C48 30 52 36.5 52 44.5c0 6.5-4.2 12-10.2 14.2V47.5c0-1.2-1-2.2-2.2-2.2H24.4c-1.2 0-2.2 1-2.2 2.2v11.2C16.2 56.5 12 51 12 44.5c0-8 4-14.5 9.5-18L18 14z" opacity={0.16} />
      <path d="M18.5 14.5h27l-3.5 12" />
      <path d="M21.5 26.5C17 30.5 13.5 36.5 13.5 44c0 6.2 4 11.5 9.5 13.8" />
      <path d="M42.5 26.5C47 30.5 50.5 36.5 50.5 44c0 6.2-4 11.5-9.5 13.8" />
      {/* gola */}
      <path d="M24 15.5h16l-1.5 6.5H25.5L24 15.5z" />
      {/* dobras */}
      <path d="M26 28.5c2.5 4 4 9 4 15.5M32 27c0 6 .8 12.5 1.5 18.5M38 28.5c-2.5 4-4 9-4 15.5" opacity={0.55} />
      {/* bainha irregular */}
      <path d="M23 47.5h18" />
      <path d="M20.5 55.5c2.5-2 5-3.2 8-2.2 2.5.8 4.5-.5 6.5-2 2 1.5 4.2 2.8 6.8 2 2.2-.6 4-.2 5.7 1.2" />
      <circle cx="26" cy="18.5" r="1.1" fill="currentColor" stroke="none" opacity={0.4} />
      <circle cx="38" cy="18.5" r="1.1" fill="currentColor" stroke="none" opacity={0.4} />
    </SlotSvg>
  )
}

/** Calças / grevas segmentadas. */
export function LegsSlotIcon(props: SlotIconProps) {
  return (
    <SlotSvg {...props}>
      <Fill d="M18 12h28v10l-3 3v28c0 2-1.6 3.5-3.5 3.5H33c-1.9 0-3.5-1.5-3.5-3.5V40h-1v13.5c0 2-1.6 3.5-3.5 3.5h-6.5c-1.9 0-3.5-1.5-3.5-3.5V25l-3-3V12z" opacity={0.16} />
      <path d="M18.5 12.5h27v9.5l-3.5 3.2" />
      <path d="M42 25.2v27.3c0 1.8-1.5 3.2-3.2 3.2H33.5c-1.7 0-3.2-1.4-3.2-3.2V40.5h-2.6v12c0 1.8-1.5 3.2-3.2 3.2h-5.3c-1.7 0-3.2-1.4-3.2-3.2V25.2L15.5 22V12.5" />
      <path d="M20.5 16.5h23" opacity={0.5} />
      {/* segmentos */}
      <path d="M21.5 28.5h8M21.5 35.5h8M21.5 42.5h8M21.5 49h8" opacity={0.5} />
      <path d="M34.5 28.5h8M34.5 35.5h8M34.5 42.5h8M34.5 49h8" opacity={0.5} />
      <path d="M22 21.5h8.5M33.5 21.5h8.5" opacity={0.4} />
      <circle cx="23" cy="14.5" r="1.1" fill="currentColor" stroke="none" opacity={0.4} />
      <circle cx="41" cy="14.5" r="1.1" fill="currentColor" stroke="none" opacity={0.4} />
    </SlotSvg>
  )
}

/** Cinto largo com fivela e furos. */
export function BeltSlotIcon(props: SlotIconProps) {
  return (
    <SlotSvg {...props}>
      <Fill d="M6 27h52v12H6z" opacity={0.16} />
      <path d="M6.5 27.5h51v11h-51z" />
      <path d="M8.5 31.5h10M45.5 31.5h10" opacity={0.45} />
      {/* furos */}
      <circle cx="12" cy="33" r="1.3" />
      <circle cx="17.5" cy="33" r="1.3" />
      <circle cx="46.5" cy="33" r="1.3" />
      <circle cx="52" cy="33" r="1.3" />
      {/* fivela */}
      <rect x="24" y="23.5" width="16" height="19" rx="2" />
      <rect x="28" y="28" width="8" height="10" rx="1.2" />
      <path d="M30.5 31.5h3M30.5 35h3" opacity={0.5} />
      <circle cx="32" cy="33" r="1.5" fill="currentColor" stroke="none" opacity={0.4} />
    </SlotSvg>
  )
}

/** Duas espadas cruzadas com guarda e pomo. */
export function WeaponSlotIcon(props: SlotIconProps) {
  return (
    <SlotSvg {...props}>
      <Fill d="M18 12l4-4 28 28-4 4z" opacity={0.12} />
      <Fill d="M46 12l4 4-28 28-4-4z" opacity={0.12} />
      {/* lâmina 1 */}
      <path d="M16.5 15.5 42.5 41.5" strokeWidth="2.4" />
      <path d="M14 13l5-5 3.5 3.5-5 5z" fill="currentColor" stroke="currentColor" opacity={0.35} />
      {/* guarda 1 */}
      <path d="M12.5 18.5 19.5 11.5" strokeWidth="2.8" />
      <circle cx="12.2" cy="20.2" r="2.2" />
      {/* lâmina 2 */}
      <path d="M47.5 15.5 21.5 41.5" strokeWidth="2.4" />
      <path d="M50 13l-5-5-3.5 3.5 5 5z" fill="currentColor" stroke="currentColor" opacity={0.35} />
      {/* guarda 2 */}
      <path d="M44.5 11.5 51.5 18.5" strokeWidth="2.8" />
      <circle cx="51.8" cy="20.2" r="2.2" />
      {/* cruzamento */}
      <circle cx="32" cy="28.5" r="3.2" fill="currentColor" stroke="currentColor" opacity={0.25} />
      <circle cx="32" cy="28.5" r="3.2" />
      {/* cabos inferiores */}
      <path d="M40.5 43.5 46 49" strokeWidth="2.6" />
      <path d="M23.5 43.5 18 49" strokeWidth="2.6" />
      <circle cx="47.5" cy="50.5" r="2.4" />
      <circle cx="16.5" cy="50.5" r="2.4" />
    </SlotSvg>
  )
}

/** Escudo redondo com umbo e anéis. */
export function OffhandSlotIcon(props: SlotIconProps) {
  return (
    <SlotSvg {...props}>
      <Fill d="M32 10a22 22 0 1 1 0 44a22 22 0 1 1 0-44z" opacity={0.14} />
      <circle cx="32" cy="32" r="21.5" />
      <circle cx="32" cy="32" r="16.5" opacity={0.7} />
      <circle cx="32" cy="32" r="11" opacity={0.55} />
      <circle cx="32" cy="32" r="5.2" />
      <circle cx="32" cy="32" r="2.2" fill="currentColor" stroke="none" opacity={0.45} />
      <path d="M32 12.5v5M32 46.5v5M12.5 32h5M46.5 32h5" opacity={0.45} />
      <path d="M18.5 18.5 22 22M42 42l3.5 3.5M45.5 18.5 42 22M22 42l-3.5 3.5" opacity={0.3} />
    </SlotSvg>
  )
}

/** Par de brincos em gota. */
export function EarringSlotIcon(props: SlotIconProps) {
  return (
    <SlotSvg {...props}>
      <Fill d="M20 20c0-3.5 2.8-6.2 6.2-6.2S32.4 16.5 32.4 20c0 5-6.2 12-6.2 12S20 25 20 20z" opacity={0.16} />
      <Fill d="M31.6 20c0-3.5 2.8-6.2 6.2-6.2S44 16.5 44 20c0 5-6.2 12-6.2 12S31.6 25 31.6 20z" opacity={0.16} />
      <circle cx="26.2" cy="11.5" r="2.4" fill="currentColor" stroke="none" opacity={0.5} />
      <circle cx="37.8" cy="11.5" r="2.4" fill="currentColor" stroke="none" opacity={0.5} />
      <path d="M26.2 13.8v5M37.8 13.8v5" />
      <path d="M20.5 21c0-3.2 2.6-5.8 5.7-5.8s5.7 2.6 5.7 5.8c0 4.6-5.7 11.2-5.7 11.2S20.5 25.6 20.5 21z" />
      <path d="M32.1 21c0-3.2 2.6-5.8 5.7-5.8s5.7 2.6 5.7 5.8c0 4.6-5.7 11.2-5.7 11.2S32.1 25.6 32.1 21z" />
      <path d="M26.2 33.5c0 3.5-2.2 7.5-2.2 10.2 0 2.8 1.6 5 2.2 6.8.6-1.8 2.2-4 2.2-6.8 0-2.7-2.2-6.7-2.2-10.2z" />
      <path d="M37.8 33.5c0 3.5-2.2 7.5-2.2 10.2 0 2.8 1.6 5 2.2 6.8.6-1.8 2.2-4 2.2-6.8 0-2.7-2.2-6.7-2.2-10.2z" />
      <circle cx="26.2" cy="51.5" r="2.6" />
      <circle cx="37.8" cy="51.5" r="2.6" />
      <circle cx="26.2" cy="51.5" r="1" fill="currentColor" stroke="none" opacity={0.45} />
      <circle cx="37.8" cy="51.5" r="1" fill="currentColor" stroke="none" opacity={0.45} />
    </SlotSvg>
  )
}

/** Colar com corrente e medalhão oval. */
export function NecklaceSlotIcon(props: SlotIconProps) {
  return (
    <SlotSvg {...props}>
      <Fill d="M32 30 23 48c-1.2 2.4.6 5.2 3.2 5.2h9.6c2.6 0 4.4-2.8 3.2-5.2L32 30z" opacity={0.18} />
      <path d="M11 15.5c7.8 13.5 15.2 19.5 21 19.5s13.2-6 21-19.5" strokeWidth="2.4" />
      <path d="M15.5 18c6 9.5 11.8 13.8 16.5 13.8S42.5 27.5 48.5 18" opacity={0.45} />
      {/* elos sugeridos */}
      <path d="M16 19.5c2 3.2 4 5.5 6 7.2M48 19.5c-2 3.2-4 5.5-6 7.2" opacity={0.4} />
      <path d="M32 31.5 24.2 48c-1 2 .4 4.4 2.7 4.4h10.2c2.3 0 3.7-2.4 2.7-4.4L32 31.5z" />
      <ellipse cx="32" cy="44.5" rx="4.2" ry="5" />
      <ellipse cx="32" cy="44.5" rx="1.8" ry="2.2" fill="currentColor" stroke="none" opacity={0.35} />
      <path d="M29 37.5h6" opacity={0.45} />
    </SlotSvg>
  )
}

/** Anel com pedra circular. */
export function RingSlotIcon(props: SlotIconProps) {
  return (
    <SlotSvg {...props}>
      <Fill d="M24 14h16l-3 8H27l-3-8z" opacity={0.18} />
      <circle cx="32" cy="38" r="15.5" strokeWidth="3.2" />
      <circle cx="32" cy="38" r="10" opacity={0.45} />
      <path d="M23.5 16.5h17l-3.2 8.5H26.7l-3.2-8.5z" />
      <rect x="26" y="9.5" width="12" height="8.5" rx="1.5" />
      <circle cx="32" cy="13.5" r="2.6" />
      <circle cx="32" cy="13.5" r="1.1" fill="currentColor" stroke="none" opacity={0.45} />
      <path d="M27.5 22.5h9" opacity={0.4} />
    </SlotSvg>
  )
}

/** Roupa íntima / undertunic. */
export function UnderwearSlotIcon(props: SlotIconProps) {
  return (
    <SlotSvg {...props}>
      <Fill d="M17 15h30v12l-5 4v20c0 2-1.6 3.5-3.5 3.5h-13c-1.9 0-3.5-1.5-3.5-3.5V31l-5-4V15z" opacity={0.16} />
      <path d="M17.5 15.5h29v11.5l-5.2 4.2v19.8c0 1.7-1.4 3-3 3H25.7c-1.6 0-3-1.3-3-3V31.2l-5.2-4.2V15.5z" />
      <path d="M21.5 19.5h21" opacity={0.5} />
      <path d="M23.5 28.5h17M24.5 35.5h15M24.5 42.5h15M25.5 49h13" opacity={0.4} />
      <path d="M27.5 13.5h9l1.5 4.5h-12l1.5-4.5z" />
      <circle cx="23" cy="22.5" r="1.1" fill="currentColor" stroke="none" opacity={0.4} />
      <circle cx="41" cy="22.5" r="1.1" fill="currentColor" stroke="none" opacity={0.4} />
    </SlotSvg>
  )
}

export const EQUIPMENT_SLOT_ICONS = {
  face: FaceSlotIcon,
  head: HeadSlotIcon,
  hair: HairSlotIcon,
  gloves: GlovesSlotIcon,
  chest: ChestSlotIcon,
  feet: FeetSlotIcon,
  cloak: CloakSlotIcon,
  legs: LegsSlotIcon,
  belt: BeltSlotIcon,
  weapon: WeaponSlotIcon,
  offhand: OffhandSlotIcon,
  'left-ear': EarringSlotIcon,
  neck: NecklaceSlotIcon,
  'right-ear': EarringSlotIcon,
  'left-ring': RingSlotIcon,
  underwear: UnderwearSlotIcon,
  'right-ring': RingSlotIcon,
} as const

export type EquipmentSlotIconKey = keyof typeof EQUIPMENT_SLOT_ICONS
