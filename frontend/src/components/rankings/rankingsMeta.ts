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
  label: string
  kicker: string
  blurb: string
  valueLabel: string
  icon: LucideIcon
}

export type WorldTab = {
  id: string
  type: 'world'
  name: string
  label: string
  kicker: string
  blurb: string
  valueLabel?: string
  icon: LucideIcon
}

export type Tab = RankingTab | WorldTab
export type WorldRow = Record<string, string | number | boolean | null>

export const tabs: Tab[] = [
  { id: 'pvp', type: 'ranking', kind: 'pvp', label: 'PvP', kicker: 'Campo de batalha', blurb: 'Os guerreiros com mais vitórias em combate.', valueLabel: 'Kills', icon: Swords },
  { id: 'pk', type: 'ranking', kind: 'pk', label: 'PK', kicker: 'Os temidos', blurb: 'Quem impõe respeito nas terras do reino.', valueLabel: 'Kills', icon: Skull },
  { id: 'adena', type: 'ranking', kind: 'adena', label: 'Adena', kicker: 'Riqueza', blurb: 'Os mais ricos do continente.', valueLabel: 'Adena', icon: Coins },
  { id: 'clans', type: 'ranking', kind: 'clans', label: 'Clãs', kicker: 'Honra', blurb: 'As casas que dominam o território.', valueLabel: 'Reputação', icon: Shield },
  { id: 'level', type: 'ranking', kind: 'level', label: 'Nível', kicker: 'Progressão', blurb: 'Quem chegou mais longe na jornada.', valueLabel: 'Nível', icon: Star },
  { id: 'online', type: 'ranking', kind: 'online', label: 'Online', kicker: 'Dedicação', blurb: 'Tempo de jogo acumulado no servidor.', valueLabel: 'Tempo', icon: Clock },
  { id: 'olympiad', type: 'world', name: 'olympiad_ranking', label: 'Olimpíada', kicker: 'Nobles', blurb: 'Os nobres no topo da arena.', valueLabel: 'Pontos', icon: Trophy },
  { id: 'grandboss', type: 'world', name: 'grandboss_status', label: 'Bosses', kicker: 'Épicos', blurb: 'O status dos grandes chefes do mundo.', icon: Crown },
  { id: 'siege', type: 'world', name: 'siege', label: 'Siege', kicker: 'Castelos', blurb: 'Quem governa as fortalezas do reino.', icon: Castle },
]

export const worldColumnLabels: Record<string, string> = {
  name: 'Nome',
  value: 'Valor',
  online: 'Status',
  clan_name: 'Clã',
  class_id: 'Classe',
  boss_id: 'Boss',
  respawn: 'Respawn',
  castle_id: 'Castelo',
  sdate: 'Siege',
  stax: 'Tesouro',
  leader: 'Líder',
  ally_name: 'Aliança',
  clan_id: 'ID do clã',
  char_id: 'ID',
}

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
  territory: string
  blurb: string
}> = [
  { id: 1, slug: 'gludio', title: 'Gludio', territory: 'Território de Gludio', blurb: 'A fortaleza do oeste, porta de entrada do continente.' },
  { id: 2, slug: 'dion', title: 'Dion', territory: 'Território de Dion', blurb: 'Castelo das terras ao sul, entre Gludio e Giran.' },
  { id: 3, slug: 'giran', title: 'Giran', territory: 'Território de Giran', blurb: 'O coração comercial do reino e um dos mais disputados.' },
  { id: 4, slug: 'oren', title: 'Oren', territory: 'Território de Oren', blurb: 'Domínio ao norte, à sombra da Ivory Tower.' },
  { id: 5, slug: 'aden', title: 'Aden', territory: 'Capital de Aden', blurb: 'A fortaleza real, símbolo máximo de poder no continente.' },
  { id: 6, slug: 'innadril', title: 'Innadril', territory: 'Território de Innadril', blurb: 'O castelo das águas, em Heine.' },
  { id: 7, slug: 'goddard', title: 'Goddard', territory: 'Território de Goddard', blurb: 'A fortaleza do norte, caminho para as terras geladas.' },
  { id: 8, slug: 'rune', title: 'Rune', territory: 'Território de Rune', blurb: 'O bastião do extremo norte, vizinho de Elmore.' },
  { id: 9, slug: 'schuttgart', title: 'Schuttgart', territory: 'Território de Schuttgart', blurb: 'A cidadela das montanhas nevadas.' },
]

export function tabFromParam(param: string | null): Tab {
  if (param === 'olympiad_ranking') return tabs.find((item) => item.id === 'olympiad') ?? tabs[0]
  if (param === 'grandboss_status') return tabs.find((item) => item.id === 'grandboss') ?? tabs[0]
  return tabs.find((item) => item.id === param) ?? tabs[0]
}
