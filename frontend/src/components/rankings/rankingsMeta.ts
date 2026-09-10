import {
  Castle,
  Clock,
  Coins,
  Crown,
  Shield,
  Skull,
  Star,
  Swords,
  Trophy,
  type LucideIcon,
} from 'lucide-react'

export type RankingTab = {
  id: string
  type: 'ranking'
  kind: string
  icon: LucideIcon
}

export type WorldTab = {
  id: string
  type: 'world'
  name: string
  icon: LucideIcon
}

export type Tab = RankingTab | WorldTab

export type LocalizedTab = Tab & {
  label: string
  kicker: string
  blurb: string
  valueLabel?: string
}

export type WorldRow = Record<string, string | number | boolean | null>

export const tabs: Tab[] = [
  { id: 'pvp', type: 'ranking', kind: 'pvp', icon: Swords },
  { id: 'pk', type: 'ranking', kind: 'pk', icon: Skull },
  { id: 'adena', type: 'ranking', kind: 'adena', icon: Coins },
  { id: 'clans', type: 'ranking', kind: 'clans', icon: Shield },
  { id: 'level', type: 'ranking', kind: 'level', icon: Star },
  { id: 'online', type: 'ranking', kind: 'online', icon: Clock },
  { id: 'olympiad', type: 'world', name: 'olympiad_ranking', icon: Trophy },
  { id: 'grandboss', type: 'world', name: 'grandboss_status', icon: Crown },
  { id: 'siege', type: 'world', name: 'siege', icon: Castle },
]

export const bossNames: Record<string, string> = {
  '29001': 'Queen Ant',
  '29006': 'Core',
  '29014': 'Orfen',
  '29019': 'Antharas',
  '29020': 'Baium',
  '29022': 'Zaken',
  '29028': 'Valakas',
  '29045': 'Frintezza',
  '29047': 'Scarlet van Halisha',
  '29068': 'Antharas',
}

export const CASTLE_CATALOG: Array<{
  id: number
  slug: string
  title: string
}> = [
  { id: 1, slug: 'gludio', title: 'Gludio' },
  { id: 2, slug: 'dion', title: 'Dion' },
  { id: 3, slug: 'giran', title: 'Giran' },
  { id: 4, slug: 'oren', title: 'Oren' },
  { id: 5, slug: 'aden', title: 'Aden' },
  { id: 6, slug: 'innadril', title: 'Innadril' },
  { id: 7, slug: 'goddard', title: 'Goddard' },
  { id: 8, slug: 'rune', title: 'Rune' },
  { id: 9, slug: 'schuttgart', title: 'Schuttgart' },
]

export function tabFromParam(param: string | null): Tab {
  if (param === 'olympiad_ranking') return tabs.find((item) => item.id === 'olympiad') ?? tabs[0]
  if (param === 'grandboss_status') return tabs.find((item) => item.id === 'grandboss') ?? tabs[0]
  return tabs.find((item) => item.id === param) ?? tabs[0]
}

export function tabHasValueLabel(tab: Tab) {
  return tab.type === 'ranking' || tab.id === 'olympiad'
}
