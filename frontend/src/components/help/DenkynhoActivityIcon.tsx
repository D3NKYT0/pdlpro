import type { DenkynhoAction } from '../../services/domain/content.service'

type ActivityAction = Exclude<DenkynhoAction, 'care'>

const common = {
  width: 52,
  height: 52,
  viewBox: '0 0 64 64',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
  'aria-hidden': true,
  focusable: false,
} as const

/** Ícones próprios das ações do Denkynho; o nome acessível fica no IconButton. */
export function DenkynhoActivityIcon({ action }: { action: ActivityAction }) {
  if (action === 'feed') return <svg {...common} data-activity-icon={action}>
    <path d="M10 31h44c0 14-9 24-22 24S10 45 10 31Z" fill="#E84B3C" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
    <path d="M15 36h34M20 45c7 6 17 6 24 0" stroke="#FFD6B8" strokeWidth="3" strokeLinecap="round" />
    <path d="M20 25c-3-7 6-9 3-16M32 25c-3-7 6-9 3-16M44 25c-3-7 6-9 3-16" stroke="#FFF3CF" strokeWidth="3" strokeLinecap="round" />
    <path d="M7 29h50" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
  </svg>

  if (action === 'sleep') return <svg {...common} data-activity-icon={action}>
    <path d="M8 28h48v23H8z" fill="#4778C8" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
    <path d="M8 23v32M56 28v27" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    <path d="M11 22c0-5 4-9 9-9h8c5 0 9 4 9 9v6H11v-6Z" fill="#F7E7C6" stroke="currentColor" strokeWidth="3" />
    <path d="M37 28h19v15c-7-5-13-6-19-4V28Z" fill="#79B9EA" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
    <path d="m42 18 5-6h-6l6-7M51 23l4-5h-5l4-6" stroke="#FFD85C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>

  if (action === 'play') return <svg {...common} data-activity-icon={action}>
    <path d="M17 23c-6 1-10 7-11 19-1 8 7 12 12 6l6-7h16l6 7c5 6 13 2 12-6-1-12-5-18-11-19-8-2-22-2-30 0Z" fill="#5965D8" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
    <path d="M19 29v12M13 35h12" stroke="#F4F7FF" strokeWidth="4" strokeLinecap="round" />
    <circle cx="44" cy="31" r="3" fill="#FFCC4D" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="51" cy="37" r="3" fill="#EF5B73" stroke="currentColor" strokeWidth="1.5" />
    <path d="M27 24c1 4 9 4 10 0M28 41l-3 7M36 41l3 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>

  if (action === 'bath') return <svg {...common} data-activity-icon={action}>
    <path d="M7 30h50v8c0 10-8 18-18 18H25C15 56 7 48 7 38v-8Z" fill="#E8F7FF" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
    <path d="M4 30h56M15 56l-3 4M49 56l3 4" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    <path d="M18 29V16c0-7 5-12 12-12 5 0 9 3 11 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    <path d="M37 12h13v5H37z" fill="#8DD7F7" stroke="currentColor" strokeWidth="2" />
    <path d="M40 20v4M45 20v6M50 20v4" stroke="#62C6F2" strokeWidth="3" strokeLinecap="round" />
    <circle cx="19" cy="29" r="7" fill="#FFF" stroke="#72CFF3" strokeWidth="2" /><circle cx="29" cy="25" r="6" fill="#FFF" stroke="#72CFF3" strokeWidth="2" /><circle cx="39" cy="29" r="8" fill="#FFF" stroke="#72CFF3" strokeWidth="2" />
  </svg>

  if (action === 'walk') return <svg {...common} data-activity-icon={action}>
    <path d="M26 9c0-5 4-8 9-8s8 3 8 8-3 9-8 9-9-4-9-9Z" fill="#FFD6B8" stroke="currentColor" strokeWidth="3" />
    <path d="m28 20 13 2 5 15-8 3-5-10-6 12-9-4 8-17Z" fill="#376FB6" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
    <path d="m26 25-10 10-8-4M40 25l9 8 7-5" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m27 40-2 11-12 7M38 39l6 10 12 5" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 58h15M49 56h11" stroke="#FFD85C" strokeWidth="3" strokeLinecap="round" />
    <path d="m31 20 4 4 4-2" stroke="#F4F7FF" strokeWidth="3" strokeLinecap="round" />
  </svg>

  return <svg {...common} data-activity-icon={action}>
    <circle cx="32" cy="13" r="9" fill="#FFD6B8" stroke="currentColor" strokeWidth="3" />
    <path d="M21 26c7-6 15-6 22 0l-3 18H24l-3-18Z" fill="#9B59D0" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
    <path d="m23 29-12-8-6 5M41 29l11-10 7 4M27 44l-9 13M37 44l10 13" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 11v9m-4-5h8M52 6l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" stroke="#FFD85C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 7c3 2 5 5 5 8M56 35c-5 1-8 4-10 8" stroke="#6ED7E8" strokeWidth="3" strokeLinecap="round" />
  </svg>
}
