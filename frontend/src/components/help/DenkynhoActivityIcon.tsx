import type { DenkynhoAction } from '../../services/domain/content.service'

type ActivityAction = Exclude<DenkynhoAction, 'care'>

const common = {
  width: 44,
  height: 44,
  viewBox: '0 0 64 64',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
  'aria-hidden': true,
  focusable: false,
  shapeRendering: 'geometricPrecision',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

/** Ilustrações vetoriais das ações; o nome acessível fica no IconButton. */
export function DenkynhoActivityIcon({ action }: { action: ActivityAction }) {
  if (action === 'feed') return <svg {...common} data-activity-icon={action}>
    <defs>
      <linearGradient id="feed-bowl" x1="13" y1="31" x2="46" y2="57" gradientUnits="userSpaceOnUse"><stop stopColor="#FF7966" /><stop offset=".48" stopColor="#D93635" /><stop offset="1" stopColor="#8E1E2C" /></linearGradient>
      <linearGradient id="feed-food" x1="20" y1="20" x2="44" y2="34" gradientUnits="userSpaceOnUse"><stop stopColor="#FFF2A8" /><stop offset="1" stopColor="#E9A83A" /></linearGradient>
    </defs>
    <ellipse cx="32" cy="56" rx="19" ry="3" fill="#130E0C" opacity=".28" />
    <path d="M14 32c2-7 8-11 18-11s16 4 18 11H14Z" fill="url(#feed-food)" stroke="#2A1715" strokeWidth="2.5" />
    <path d="M18 27c3-3 7-5 12-5M35 23c4 0 8 2 10 5" stroke="#FFF7D6" strokeWidth="2" opacity=".9" />
    <path d="M10 32h44l-3 12c-2 8-9 13-19 13S15 52 13 44l-3-12Z" fill="url(#feed-bowl)" stroke="#2A1715" strokeWidth="3" />
    <path d="M10 33c11 3 33 3 44 0" stroke="#FFB08E" strokeWidth="3" />
    <path d="M23 45c5 4 13 4 18 0" stroke="#FFD7B5" strokeWidth="2.5" opacity=".85" />
    <circle cx="32" cy="41" r="3" fill="#FFD65A" stroke="#6D3A14" strokeWidth="1.5" />
    <path d="M20 17c-3-5 4-6 1-11M32 17c-3-5 4-6 1-11M44 17c-3-5 4-6 1-11" stroke="#FFF4D0" strokeWidth="2.8" opacity=".95" />
  </svg>

  if (action === 'sleep') return <svg {...common} data-activity-icon={action}>
    <defs>
      <linearGradient id="sleep-bed" x1="8" y1="27" x2="54" y2="55" gradientUnits="userSpaceOnUse"><stop stopColor="#78C7F2" /><stop offset=".5" stopColor="#3978C7" /><stop offset="1" stopColor="#243D8C" /></linearGradient>
      <linearGradient id="sleep-pillow" x1="13" y1="17" x2="34" y2="30" gradientUnits="userSpaceOnUse"><stop stopColor="#FFFDF4" /><stop offset="1" stopColor="#D9E9F7" /></linearGradient>
    </defs>
    <ellipse cx="32" cy="57" rx="26" ry="3" fill="#130E0C" opacity=".28" />
    <path d="M8 28h48v23H8V28Z" fill="url(#sleep-bed)" stroke="#17213D" strokeWidth="3" />
    <path d="M10 23v33M55 29v27" stroke="#241A22" strokeWidth="4" />
    <path d="M12 23c0-5 4-9 9-9h7c5 0 9 4 9 9v6H12v-6Z" fill="url(#sleep-pillow)" stroke="#253451" strokeWidth="2.5" />
    <path d="M37 28h19v16c-6-4-12-5-19-3V28Z" fill="#75BCEC" stroke="#1D3767" strokeWidth="2.5" />
    <path d="M40 33c5-2 10-1 14 2" stroke="#BEE9FF" strokeWidth="2" />
    <path d="M13 48h41" stroke="#99D9F7" strokeWidth="2" opacity=".8" />
    <path d="m40 18 7-8h-7l7-7M50 24l5-6h-5l5-6" stroke="#FFE275" strokeWidth="3" />
    <circle cx="55" cy="7" r="2" fill="#FFF2A2" /><circle cx="36" cy="7" r="1.5" fill="#FFF2A2" />
  </svg>

  if (action === 'play') return <svg {...common} data-activity-icon={action}>
    <defs>
      <linearGradient id="play-body" x1="11" y1="21" x2="52" y2="52" gradientUnits="userSpaceOnUse"><stop stopColor="#8C96FF" /><stop offset=".48" stopColor="#5863D9" /><stop offset="1" stopColor="#34338F" /></linearGradient>
      <linearGradient id="play-gloss" x1="20" y1="24" x2="39" y2="39" gradientUnits="userSpaceOnUse"><stop stopColor="#FFF" stopOpacity=".7" /><stop offset="1" stopColor="#FFF" stopOpacity="0" /></linearGradient>
    </defs>
    <ellipse cx="32" cy="54" rx="23" ry="3" fill="#130E0C" opacity=".3" />
    <path d="M17 22c-6 2-10 8-11 20-1 8 7 12 12 6l7-8h14l7 8c5 6 13 2 12-6-1-12-5-18-11-20-8-2-22-2-30 0Z" fill="url(#play-body)" stroke="#1C1B45" strokeWidth="3" />
    <path d="M19 29v13M13 35.5h12" stroke="#F5F7FF" strokeWidth="4" />
    <path d="M19 24c8-2 18-2 27 0" stroke="url(#play-gloss)" strokeWidth="3" />
    <circle cx="44" cy="31" r="3.5" fill="#FFD45C" stroke="#4D3515" strokeWidth="1.5" />
    <circle cx="51" cy="37" r="3.5" fill="#FF6D87" stroke="#551D2C" strokeWidth="1.5" />
    <circle cx="34" cy="34" r="2" fill="#A9E9FF" stroke="#24316A" strokeWidth="1.2" />
    <path d="M27 23c1 4 9 4 10 0M27 42l-4 7M37 42l4 7" stroke="#24224E" strokeWidth="2.5" />
    <path d="M10 42c2 2 4 2 6 0M48 43c2 2 4 2 6 0" stroke="#AEB5FF" strokeWidth="2" />
  </svg>

  if (action === 'bath') return <svg {...common} data-activity-icon={action}>
    <defs>
      <linearGradient id="bath-tub" x1="8" y1="29" x2="50" y2="57" gradientUnits="userSpaceOnUse"><stop stopColor="#FFFFFF" /><stop offset=".45" stopColor="#C9F0FF" /><stop offset="1" stopColor="#62B7DE" /></linearGradient>
      <linearGradient id="bath-water" x1="12" y1="29" x2="51" y2="38" gradientUnits="userSpaceOnUse"><stop stopColor="#BFF4FF" /><stop offset="1" stopColor="#40BCEB" /></linearGradient>
    </defs>
    <ellipse cx="32" cy="58" rx="25" ry="3" fill="#130E0C" opacity=".28" />
    <path d="M7 30h50v8c0 11-8 19-19 19H26C15 57 7 49 7 38v-8Z" fill="url(#bath-tub)" stroke="#173A50" strokeWidth="3" />
    <path d="M6 31c11 4 39 4 52 0" stroke="url(#bath-water)" strokeWidth="5" />
    <path d="M4 29h56M15 57l-3 4M49 57l3 4" stroke="#173A50" strokeWidth="3.5" />
    <path d="M18 28V16c0-7 5-12 12-12 6 0 10 3 12 8" stroke="#A5D9E9" strokeWidth="5" />
    <path d="M18 28V16c0-7 5-12 12-12 6 0 10 3 12 8" stroke="#274D60" strokeWidth="2.5" />
    <path d="M38 11h13v6H38Z" fill="#88DDF7" stroke="#21495E" strokeWidth="2" />
    <path d="M40 20v5M45 20v7M50 20v5" stroke="#63D5FF" strokeWidth="2.5" />
    <circle cx="18" cy="29" r="7" fill="#FFF" stroke="#70CEF1" strokeWidth="2" /><circle cx="29" cy="25" r="6" fill="#FFF" stroke="#70CEF1" strokeWidth="2" /><circle cx="40" cy="29" r="8" fill="#FFF" stroke="#70CEF1" strokeWidth="2" />
    <path d="m53 7 1.5 3.5L58 12l-3.5 1.5L53 17l-1.5-3.5L48 12l3.5-1.5L53 7Z" fill="#FFF5A8" stroke="#D99C2B" strokeWidth="1.3" />
  </svg>

  if (action === 'walk') return <svg {...common} data-activity-icon={action}>
    <defs>
      <linearGradient id="walk-shirt" x1="22" y1="18" x2="44" y2="43" gradientUnits="userSpaceOnUse"><stop stopColor="#61A7EF" /><stop offset=".55" stopColor="#326DB7" /><stop offset="1" stopColor="#23457C" /></linearGradient>
      <linearGradient id="walk-skin" x1="29" y1="2" x2="40" y2="18" gradientUnits="userSpaceOnUse"><stop stopColor="#FFE3C7" /><stop offset="1" stopColor="#EAA477" /></linearGradient>
    </defs>
    <ellipse cx="34" cy="59" rx="24" ry="3" fill="#130E0C" opacity=".28" />
    <circle cx="35" cy="10" r="8.5" fill="url(#walk-skin)" stroke="#38241D" strokeWidth="2.5" />
    <path d="M28 6c2-6 12-7 15 0-4-1-8 0-11 3l-4-3Z" fill="#24222A" stroke="#16131A" strokeWidth="2" />
    <path d="m27 20 13 2 6 15-8 4-5-11-6 12-10-4 9-17 1-1Z" fill="url(#walk-shirt)" stroke="#17243A" strokeWidth="3" />
    <path d="m26 25-10 10-8-4M40 25l9 8 7-5" stroke="#F2B389" strokeWidth="5" />
    <path d="m27 40-2 11-12 7M38 40l6 10 12 5" stroke="#242A3A" strokeWidth="6" />
    <path d="M8 58h14M49 56h11" stroke="#F0F3F8" strokeWidth="4" />
    <path d="m31 21 4 4 4-3M35 25v9" stroke="#EAF5FF" strokeWidth="2" />
    <path d="M6 18h9M3 24h10M53 43h8" stroke="#FFE074" strokeWidth="2.5" opacity=".95" />
    <circle cx="33" cy="10" r="1" fill="#38241D" /><circle cx="39" cy="10" r="1" fill="#38241D" />
  </svg>

  return <svg {...common} data-activity-icon={action}>
    <defs>
      <linearGradient id="dance-shirt" x1="21" y1="20" x2="42" y2="45" gradientUnits="userSpaceOnUse"><stop stopColor="#D181F2" /><stop offset=".5" stopColor="#914CC6" /><stop offset="1" stopColor="#56318F" /></linearGradient>
      <linearGradient id="dance-skin" x1="26" y1="3" x2="38" y2="21" gradientUnits="userSpaceOnUse"><stop stopColor="#FFE4CA" /><stop offset="1" stopColor="#E9A274" /></linearGradient>
    </defs>
    <ellipse cx="33" cy="59" rx="22" ry="3" fill="#130E0C" opacity=".28" />
    <circle cx="32" cy="13" r="9" fill="url(#dance-skin)" stroke="#38241D" strokeWidth="2.5" />
    <path d="M24 9c2-7 13-8 17 0-5-2-10-1-14 3l-3-3Z" fill="#25222B" stroke="#151219" strokeWidth="2" />
    <path d="M21 26c7-6 15-6 22 0l-3 18H24l-3-18Z" fill="url(#dance-shirt)" stroke="#2C1D45" strokeWidth="3" />
    <path d="m23 29-12-8-6 5M41 29l11-10 7 4M27 44l-9 13M37 44l10 13" stroke="#F0B087" strokeWidth="5" />
    <path d="M14 57h9M43 57h9" stroke="#F2F4FA" strokeWidth="4" />
    <path d="M8 9v9m-4-4h8M52 5l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" fill="#FFF09A" stroke="#D89A25" strokeWidth="1.8" />
    <path d="M14 7c4 2 6 5 6 9M57 34c-5 1-9 4-11 8" stroke="#7CE7F2" strokeWidth="2.5" />
    <path d="M8 42V32l8-2v9M8 36l8-2" stroke="#FF7CA8" strokeWidth="2.5" />
    <circle cx="7" cy="43" r="3" fill="#FF7CA8" /><circle cx="15" cy="40" r="3" fill="#FF7CA8" />
  </svg>
}
