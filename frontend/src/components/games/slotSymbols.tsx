import { useId, type ReactNode } from 'react'
import { isSlotSymbol, type SlotSymbol } from './gameArt'

function SlotSvg({
  mark,
  children,
}: {
  mark: string
  children: ReactNode
}) {
  return (
    <svg className="chance-slot-mark" data-slot-mark={mark} viewBox="0 0 64 64" aria-hidden="true">
      {children}
    </svg>
  )
}

function SwordMark({ gid }: { gid: string }) {
  return (
    <SlotSvg mark="sword">
      <defs>
        <linearGradient id={`${gid}-blade`} x1="18" y1="58" x2="50" y2="8" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8d7a55" />
          <stop offset="0.45" stopColor="#f7f1dc" />
          <stop offset="1" stopColor="#c5a161" />
        </linearGradient>
        <linearGradient id={`${gid}-gold`} x1="16" y1="12" x2="48" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff3c4" />
          <stop offset="0.5" stopColor="#e6c77d" />
          <stop offset="1" stopColor="#8d6a28" />
        </linearGradient>
      </defs>
      <path d="M21 57 L27 51 L49 12 C51 9 55 10 54 14 L32 53 Z" fill={`url(#${gid}-blade)`} />
      <path d="M26 50 L49 14" stroke="#fffaf0" strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
      <path d="M16 42 H36 L34 48 H18 Z" fill={`url(#${gid}-gold)`} />
      <circle cx="17" cy="45" r="3.2" fill={`url(#${gid}-gold)`} />
      <circle cx="17" cy="45" r="1.3" fill="#7a1d1d" />
      <path d="M22 48 L14 56" stroke="#c5a161" strokeWidth="3.2" strokeLinecap="round" />
    </SlotSvg>
  )
}

function ShieldMark({ gid }: { gid: string }) {
  return (
    <SlotSvg mark="shield">
      <defs>
        <linearGradient id={`${gid}-rim`} x1="12" y1="8" x2="52" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff4c8" />
          <stop offset="0.45" stopColor="#e6c77d" />
          <stop offset="1" stopColor="#8a6424" />
        </linearGradient>
        <linearGradient id={`${gid}-field`} x1="20" y1="14" x2="44" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3a2a16" />
          <stop offset="1" stopColor="#120c07" />
        </linearGradient>
      </defs>
      <path d="M32 6 C42 10 52 12 52 12 V30 C52 46 40 56 32 60 C24 56 12 46 12 30 V12 C12 12 22 10 32 6 Z" fill={`url(#${gid}-rim)`} />
      <path d="M32 11 C41 14 48 16 48 16 V30 C48 43 39 51 32 54 C25 51 16 43 16 30 V16 C16 16 23 14 32 11 Z" fill={`url(#${gid}-field)`} />
      <path d="M32 16 V49 M21 31 H43" stroke="#e6c77d" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M32 16 V49 M21 31 H43" stroke="#fff6d4" strokeWidth="1" strokeLinecap="round" opacity="0.45" />
    </SlotSvg>
  )
}

function CrownMark({ gid }: { gid: string }) {
  return (
    <SlotSvg mark="crown">
      <defs>
        <linearGradient id={`${gid}-gold`} x1="8" y1="10" x2="56" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff6d0" />
          <stop offset="0.5" stopColor="#e6c77d" />
          <stop offset="1" stopColor="#8d6422" />
        </linearGradient>
      </defs>
      <path d="M10 42 L8 20 L22 32 L32 12 L42 32 L56 20 L54 42 Z" fill={`url(#${gid}-gold)`} />
      <rect x="10" y="42" width="44" height="10" rx="1" fill={`url(#${gid}-gold)`} />
      <circle cx="8" cy="18" r="3.4" fill="#c4a6e8" />
      <circle cx="32" cy="11" r="3.8" fill="#f0d28c" />
      <circle cx="56" cy="18" r="3.4" fill="#7ec8d6" />
      <circle cx="22" cy="31" r="2.2" fill="#b4232c" />
      <circle cx="42" cy="31" r="2.2" fill="#2f6f4e" />
      <path d="M14 46 H50" stroke="#fff6d4" strokeWidth="1.2" opacity="0.4" />
    </SlotSvg>
  )
}

function AdenaMark({ gid }: { gid: string }) {
  return (
    <SlotSvg mark="adena">
      <defs>
        <radialGradient id={`${gid}-coin`} cx="38%" cy="32%" r="70%">
          <stop offset="0" stopColor="#fff6d2" />
          <stop offset="0.45" stopColor="#e6c77d" />
          <stop offset="1" stopColor="#8d6422" />
        </radialGradient>
      </defs>
      <ellipse cx="24" cy="40" rx="14" ry="14" fill={`url(#${gid}-coin)`} />
      <ellipse cx="40" cy="36" rx="15" ry="15" fill={`url(#${gid}-coin)`} />
      <ellipse cx="32" cy="24" rx="14.5" ry="14.5" fill={`url(#${gid}-coin)`} />
      <ellipse cx="32" cy="24" rx="8" ry="8" fill="none" stroke="#7a5418" strokeWidth="1.6" />
      <path d="M32 19 V29 M28 24 H36" stroke="#7a5418" strokeWidth="1.6" strokeLinecap="round" />
    </SlotSvg>
  )
}

function ScrollMark({ gid }: { gid: string }) {
  return (
    <SlotSvg mark="scroll">
      <defs>
        <linearGradient id={`${gid}-paper`} x1="14" y1="8" x2="50" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff6df" />
          <stop offset="1" stopColor="#d7b56a" />
        </linearGradient>
        <linearGradient id={`${gid}-gold`} x1="16" y1="10" x2="48" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff3c4" />
          <stop offset="1" stopColor="#8d6422" />
        </linearGradient>
      </defs>
      <rect x="16" y="10" width="32" height="44" rx="3" fill={`url(#${gid}-paper)`} />
      <path d="M22 20 H42 M22 27 H38 M22 34 H40" stroke="#8d6a32" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
      <rect x="14" y="8" width="36" height="8" rx="3" fill={`url(#${gid}-gold)`} />
      <rect x="14" y="48" width="36" height="8" rx="3" fill={`url(#${gid}-gold)`} />
      <circle cx="32" cy="40" r="5" fill="#7a1d1d" />
      <circle cx="32" cy="40" r="2.2" fill="#e6c77d" />
    </SlotSvg>
  )
}

const MARKS: Record<SlotSymbol, (gid: string) => ReactNode> = {
  sword: (gid) => <SwordMark gid={gid} />,
  shield: (gid) => <ShieldMark gid={gid} />,
  crown: (gid) => <CrownMark gid={gid} />,
  adena: (gid) => <AdenaMark gid={gid} />,
  scroll: (gid) => <ScrollMark gid={gid} />,
}

export function SlotMark({ symbol }: { symbol: string }) {
  const gid = useId().replace(/:/g, '')
  if (!isSlotSymbol(symbol)) {
    return (
      <SlotSvg mark="unknown">
        <circle cx="32" cy="32" r="16" fill="#e6c77d" />
      </SlotSvg>
    )
  }
  return MARKS[symbol](gid)
}
