import { useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import {
  Castle,
  Clock,
  Coins,
  Crown,
  Search,
  Shield,
  Skull,
  Star,
  Swords,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { serverApi } from '../services/api'
import type { ApiRankingEntry } from '../services/types'
import { themeImage } from '../theme/assets'

type RankingTab = {
  id: string
  type: 'ranking'
  kind: string
  label: string
  kicker: string
  blurb: string
  valueLabel: string
  icon: LucideIcon
}

type WorldTab = {
  id: string
  type: 'world'
  name: string
  label: string
  kicker: string
  blurb: string
  valueLabel?: string
  icon: LucideIcon
}

type Tab = RankingTab | WorldTab
type WorldRow = Record<string, string | number | boolean | null>

const tabs: Tab[] = [
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

const worldColumnLabels: Record<string, string> = {
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

const bossNames: Record<string, string> = {
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

const CASTLE_CATALOG: Array<{
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

function tabFromParam(param: string | null): Tab {
  if (param === 'olympiad_ranking') return tabs.find((item) => item.id === 'olympiad') ?? tabs[0]
  if (param === 'grandboss_status') return tabs.find((item) => item.id === 'grandboss') ?? tabs[0]
  return tabs.find((item) => item.id === param) ?? tabs[0]
}

function initial(name: string) {
  return (name.trim()[0] || '?').toUpperCase()
}

function formatScore(value: number) {
  return value.toLocaleString('pt-BR')
}

function formatDuration(seconds: number) {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${Math.max(0, minutes)}m`
}

function formatValue(tab: Tab, value: number) {
  if (tab.id === 'online') return formatDuration(value)
  if (tab.id === 'level') return String(value)
  return formatScore(value)
}

function parseDate(value: unknown): Date | null {
  if (value == null || value === '' || value === 0 || value === '0') return null
  if (typeof value === 'string' && Number.isNaN(Number(value))) {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return null
  const date = new Date(numeric > 1e11 ? numeric : numeric * 1000)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDate(value: unknown) {
  const date = parseDate(value)
  return date
    ? date.toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'
}

function formatRelative(date: Date) {
  const diffSec = Math.round((date.getTime() - Date.now()) / 1000)
  const abs = Math.abs(diffSec)
  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour')
  return rtf.format(Math.round(diffSec / 86400), 'day')
}

function displayName(value: unknown, empty = '—') {
  const text = String(value ?? '').trim()
  return text && text !== 'None' && text !== 'null' ? text : empty
}

function castleIdOf(row: WorldRow) {
  const value = row.castle_id ?? row.id
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0
}

function castleInfo(row: WorldRow) {
  const id = castleIdOf(row)
  const rawName = displayName(row.name, '')
  const slug = rawName.toLowerCase().replace(/[^a-z]/g, '')
  const meta =
    CASTLE_CATALOG.find((item) => item.id === id) ??
    CASTLE_CATALOG.find((item) => item.slug === slug || item.title.toLowerCase() === slug)
  const resolvedSlug = meta?.slug ?? (slug || 'castle')
  return {
    id,
    slug: resolvedSlug,
    title: meta?.title ?? (rawName || `Castelo ${id || ''}`.trim()),
    territory: meta?.territory ?? 'Reino de Aden',
    blurb: meta?.blurb ?? 'Fortaleza do reino.',
    image: themeImage(`castles/${resolvedSlug}.jpg`),
  }
}

function siegeState(value: unknown) {
  const date = parseDate(value)
  if (!date) return { kind: 'idle' as const, label: 'Sem data marcada', detail: '—' }
  const diff = date.getTime() - Date.now()
  const twoHours = 2 * 60 * 60 * 1000
  if (diff <= 0 && diff > -twoHours) {
    return { kind: 'live' as const, label: 'Sob cerco', detail: formatDate(value) }
  }
  if (diff > 0) {
    return { kind: 'soon' as const, label: formatRelative(date), detail: formatDate(value) }
  }
  return { kind: 'idle' as const, label: 'Aguardando calendário', detail: formatDate(value) }
}

function withCastleCatalog(rows: WorldRow[]): WorldRow[] {
  return CASTLE_CATALOG.map((castle) => {
    const live =
      rows.find((row) => castleIdOf(row) === castle.id) ??
      rows.find((row) => displayName(row.name, '').toLowerCase().replace(/[^a-z]/g, '') === castle.slug)
    return {
      ...(live ?? {}),
      castle_id: castle.id,
      name: displayName(live?.name, castle.title),
    }
  })
}

function formatTax(value: unknown) {
  if (value == null || value === '') return '—'
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '—'
  return `${amount.toLocaleString('pt-BR')}%`
}

function formatTreasury(value: unknown) {
  if (value == null || value === '') return 'Vazio'
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) return 'Vazio'
  return `${amount.toLocaleString('pt-BR')} adena`
}

function splitParticipants(rows: WorldRow[], ownerName: string) {
  const owner = ownerName.trim().toLowerCase()
  const attackers: string[] = []
  const defenders: string[] = []
  for (const row of rows) {
    const name = displayName(row.clan_name, '')
    if (!name) continue
    const type = Number(row.type)
    const isOwner = name.toLowerCase() === owner
    if (isOwner || type === 1 || type === 3 || type === -1) {
      if (!defenders.includes(name)) defenders.push(name)
    } else if (!attackers.includes(name)) {
      attackers.push(name)
    }
  }
  return { attackers, defenders }
}

function formatRespawn(value: unknown) {
  const date = parseDate(value)
  if (!date) return { live: true, label: 'Vivo' }
  if (date.getTime() <= Date.now()) return { live: true, label: 'Vivo' }
  return { live: false, label: date.toLocaleString('pt-BR') }
}

function asRankingRows(rows: WorldRow[]): ApiRankingEntry[] {
  return rows
    .filter((row) => row.name)
    .map((row, index) => ({
      position: index + 1,
      name: String(row.name),
      value: Number(row.value ?? 0),
    }))
}

function formatWorldCell(key: string, value: unknown) {
  if (value == null || value === '') return '—'
  if (key === 'online') return Number(value) ? 'Online' : 'Offline'
  if (key === 'respawn') return formatRespawn(value).label
  if (key === 'sdate') return formatDate(value)
  if (key === 'boss_id') return bossNames[String(value)] ?? `Boss #${value}`
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  if (typeof value === 'number' || (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value))) {
    return Number(value).toLocaleString('pt-BR')
  }
  return String(value)
}

function worldKeys(rows: WorldRow[]) {
  const keys = rows[0] ? Object.keys(rows[0]) : []
  return keys.filter((key) => !['char_id', 'clan_id', 'castle_id'].includes(key))
}

export function RankingsPage() {
  const [searchParams] = useSearchParams()
  const tab = tabFromParam(searchParams.get('tab'))
  const Icon = tab.icon
  const [search, setSearch] = useState('')

  const status = useQuery({ queryKey: ['server-status'], queryFn: serverApi.status })
  const rankings = useQuery({
    queryKey: ['rankings', tab.type === 'ranking' ? tab.kind : '', 50],
    queryFn: () => serverApi.rankings(tab.type === 'ranking' ? tab.kind : 'pvp', 50),
    enabled: tab.type === 'ranking',
  })
  const world = useQuery({
    queryKey: ['world', tab.type === 'world' ? tab.name : ''],
    queryFn: () => serverApi.world(tab.type === 'world' ? tab.name : 'olympiad_ranking'),
    enabled: tab.type === 'world',
  })
  const characters = useQuery({
    queryKey: ['world-search', search],
    queryFn: () => serverApi.world('search_characters', { query: search }),
    enabled: search.trim().length >= 2,
  })

  const worldRows = world.data ?? []
  const rankingRows =
    tab.type === 'ranking' ? (rankings.data ?? []) : tab.id === 'olympiad' ? asRankingRows(worldRows) : []
  const isLoading = tab.type === 'ranking' ? rankings.isLoading : world.isLoading
  const isError = tab.type === 'ranking' ? rankings.isError : world.isError
  const leader = rankingRows[0]
  const rest = rankingRows.slice(3)
  const statusLabel = status.isLoading ? 'Verificando' : status.data?.game_online ? 'Online' : 'Offline'
  const statusClass = status.isLoading ? 'is-checking' : status.data?.game_online ? 'is-online' : 'is-offline'

  return (
    <div className="rankings-page">
      <header className="rankings-hero">
        <div className="rankings-hero-glow" aria-hidden="true" />
        <div className="container rankings-hero-inner">
          <div className="rankings-hero-copy">
            <span className="rankings-eyebrow">
              <Trophy aria-hidden="true" />
              Hall da fama
            </span>
            <h1>
              Os mais fortes do <em>reino</em>
            </h1>
            <p>PvP, riqueza, clãs e olimpíada — o quadro de honra de quem escreve a história no servidor.</p>
          </div>

          <aside className="rankings-hero-card" aria-label="Categoria atual">
            <div className="rankings-mark">
              <Icon aria-hidden="true" />
            </div>
            <div className={`rankings-live ${statusClass}`}>
              <i aria-hidden="true" />
              {statusLabel}
            </div>
            <span>{tab.kicker}</span>
            <strong>{tab.label}</strong>
            <p>{tab.blurb}</p>
            {leader ? (
              <dl className="rankings-hero-metrics">
                <div>
                  <dt>1º lugar</dt>
                  <dd>{leader.name}</dd>
                </div>
                <div>
                  <dt>{tab.valueLabel ?? 'Valor'}</dt>
                  <dd>{formatValue(tab, leader.value)}</dd>
                </div>
              </dl>
            ) : (
              <dl className="rankings-hero-metrics">
                <div>
                  <dt>Jogadores</dt>
                  <dd>{status.data?.players_online ?? '—'}</dd>
                </div>
                <div>
                  <dt>Lista</dt>
                  <dd>{isLoading ? '…' : rankingRows.length || worldRows.length || '—'}</dd>
                </div>
              </dl>
            )}
          </aside>
        </div>
      </header>

      <nav className="rankings-nav container" aria-label="Rankings">
        {tabs.map((item) => {
          const TabIcon = item.icon
          const active = tab.id === item.id
          return (
            <Link
              key={item.id}
              to={`/rankings?tab=${item.id}`}
              className={active ? 'is-active' : undefined}
              aria-current={active ? 'page' : undefined}
            >
              <TabIcon aria-hidden="true" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <main className="container rankings-content">
        <section className="rankings-section">
          <div className="rankings-heading">
            <span>
              <Icon aria-hidden="true" />
            </span>
            <div>
              <small>{tab.kicker}</small>
              <h2>{tab.label}</h2>
            </div>
            {tab.valueLabel ? (
              <em>{tab.valueLabel}</em>
            ) : tab.id === 'siege' && worldRows.length ? (
              <em>{worldRows.length} fortalezas</em>
            ) : null}
          </div>

          {isLoading ? (
            <div className="rankings-empty">
              <span className="rankings-diamond" aria-hidden="true" />
              <p>Consultando o hall da fama...</p>
            </div>
          ) : isError ? (
            <div className="rankings-empty">
              <span className="rankings-diamond" aria-hidden="true" />
              <p>Não foi possível carregar este ranking agora.</p>
            </div>
          ) : rankingRows.length ? (
            <>
              <div className={`rankings-podium${rankingRows.length < 3 ? ' is-short' : ''}`}>
                {rankingRows.slice(0, 3).map((row, index) => (
                  <article className={`rankings-card place-${index + 1}`} key={`${row.position}-${row.name}`}>
                    <div className="rankings-card-inner">
                      <span className="rankings-place">
                        {index === 0 ? <Crown aria-hidden="true" /> : null}
                        {row.position}º
                      </span>
                      <span className="rankings-crest" aria-hidden="true">
                        <span>{initial(row.name)}</span>
                      </span>
                      <h3>{row.name}</h3>
                      <strong>{formatValue(tab, row.value)}</strong>
                      <em>{tab.valueLabel}</em>
                    </div>
                  </article>
                ))}
              </div>
              {rest.length ? (
                <ol className="rankings-board">
                  {rest.map((row) => (
                    <li key={`${row.position}-${row.name}`}>
                      <span className="rankings-board-rank">{row.position}</span>
                      <span className="rankings-crest sm" aria-hidden="true">
                        <span>{initial(row.name)}</span>
                      </span>
                      <span className="rankings-board-name">{row.name}</span>
                      <span className="rankings-board-score">{formatValue(tab, row.value)}</span>
                    </li>
                  ))}
                </ol>
              ) : null}
            </>
          ) : tab.id === 'grandboss' ? (
            worldRows.length ? (
              <div className="rankings-world-grid">
                {worldRows.map((row) => {
                  const bossId = String(row.boss_id ?? '')
                  const respawn = formatRespawn(row.respawn)
                  return (
                    <article className="rankings-world-card" key={bossId || String(row.respawn)}>
                      <div className="rankings-mark sm">
                        <Crown aria-hidden="true" />
                      </div>
                      <span>Grand Boss</span>
                      <strong>{bossNames[bossId] ?? `Boss #${bossId || '—'}`}</strong>
                      <em className={respawn.live ? 'is-live' : 'is-down'}>{respawn.label}</em>
                    </article>
                  )
                })}
              </div>
            ) : (
              <EmptyWorld />
            )
          ) : tab.id === 'siege' ? (
            <SiegeBoard rows={worldRows} />
          ) : worldRows.length ? (
            <div className="rankings-table-wrap">
              <table className="rankings-table">
                <thead>
                  <tr>
                    {worldKeys(worldRows).map((key) => (
                      <th key={key}>{worldColumnLabels[key] ?? key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {worldRows.map((row, index) => (
                    <tr key={index}>
                      {worldKeys(worldRows).map((key) => (
                        <td key={key}>{formatWorldCell(key, row[key])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyWorld ranking={tab.type === 'ranking'} />
          )}
        </section>

        <section className="rankings-search" aria-label="Buscar personagem">
          <div className="rankings-heading">
            <span>
              <Search aria-hidden="true" />
            </span>
            <div>
              <small>Consulta</small>
              <h2>Buscar personagem</h2>
            </div>
          </div>
          <label className="rankings-search-field">
            <span className="sr-only">Nome do personagem</span>
            <Search aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Digite ao menos 2 letras..."
            />
          </label>
          {search.trim().length >= 2 ? (
            characters.isLoading ? (
              <p className="rankings-search-hint">Procurando no mundo...</p>
            ) : (characters.data ?? []).length ? (
              <ol className="rankings-board">
                {(characters.data ?? []).map((row, index) => (
                  <li key={`${row.char_id ?? row.name}-${index}`}>
                    <span className="rankings-board-rank">{formatWorldCell('value', row.value)}</span>
                    <span className="rankings-crest sm" aria-hidden="true">
                      <span>{initial(String(row.name ?? '?'))}</span>
                    </span>
                    <span className="rankings-board-name">
                      {String(row.name ?? '—')}
                      <small>{String(row.clan_name ?? 'Sem clã')}</small>
                    </span>
                    <span className={`rankings-board-score ${Number(row.online) ? 'is-live' : 'is-down'}`}>
                      {Number(row.online) ? 'Online' : 'Offline'}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="rankings-search-hint">Nenhum personagem encontrado com esse nome.</p>
            )
          ) : (
            <p className="rankings-search-hint">Use o nome do personagem para localizar clã, nível e status.</p>
          )}
        </section>
      </main>
    </div>
  )
}

function SiegeBoard({ rows }: { rows: WorldRow[] }) {
  const castles = withCastleCatalog(rows)
  const participants = useQueries({
    queries: castles.map((row) => {
      const castleId = castleIdOf(row)
      return {
        queryKey: ['world', 'siege_participants', castleId],
        queryFn: () => serverApi.world('siege_participants', { castle_id: String(castleId) }),
        enabled: castleId > 0,
      }
    }),
  })
  const occupied = castles.filter((row) => displayName(row.clan_name, '')).length
  const nextSiege = castles
    .map((row) => parseDate(row.sdate))
    .filter((date): date is Date => Boolean(date && date.getTime() > Date.now()))
    .sort((a, b) => a.getTime() - b.getTime())[0]
  const liveCount = castles.filter((row) => siegeState(row.sdate).kind === 'live').length

  return (
    <div className="rankings-siege">
      <dl className="rankings-siege-summary">
        <div>
          <dt>Ocupados</dt>
          <dd>
            {occupied}/{castles.length}
          </dd>
        </div>
        <div>
          <dt>Livres</dt>
          <dd>{castles.length - occupied}</dd>
        </div>
        <div>
          <dt>Em guerra</dt>
          <dd>{liveCount || 'Nenhum'}</dd>
        </div>
        <div>
          <dt>Próximo cerco</dt>
          <dd>{nextSiege ? formatRelative(nextSiege) : '—'}</dd>
        </div>
      </dl>

      <div className="rankings-siege-list">
        {castles.map((row, index) => {
          const info = castleInfo(row)
          const owner = displayName(row.clan_name, '')
          const leader = displayName(row.leader ?? row.char_name, 'Sem líder')
          const ally = displayName(row.ally_name, 'Sem aliança')
          const siege = siegeState(row.sdate)
          const sides = splitParticipants(participants[index]?.data ?? [], owner)
          const owned = Boolean(owner)

          return (
            <article className={`rankings-castle${owned ? ' is-owned' : ''}${siege.kind === 'live' ? ' is-live' : ''}`} key={info.slug || String(info.id)}>
              <div className="rankings-castle-visual">
                <img src={info.image} alt={`Castelo de ${info.title}`} onError={(event) => event.currentTarget.remove()} />
                <span className="rankings-castle-fallback" aria-hidden="true">
                  <Castle />
                </span>
                <div className="rankings-castle-visual-copy">
                  <small>{info.territory}</small>
                  <strong>{info.title}</strong>
                </div>
                <em className={`rankings-castle-status is-${siege.kind}`}>
                  {siege.kind === 'live' ? 'Sob cerco' : owned ? 'Dominado' : 'Sem dono'}
                </em>
              </div>

              <div className="rankings-castle-body">
                <header>
                  <span>{info.territory}</span>
                  <h3>{info.title} Castle</h3>
                  <p>{info.blurb}</p>
                </header>

                <dl className="rankings-castle-meta">
                  <div>
                    <dt>Clã dono</dt>
                    <dd>
                      <span className="rankings-crest sm" aria-hidden="true">
                        <span>{initial(owner || info.title)}</span>
                      </span>
                      {owner || 'Sem dono'}
                    </dd>
                  </div>
                  <div>
                    <dt>Líder</dt>
                    <dd>{leader}</dd>
                  </div>
                  <div>
                    <dt>Aliança</dt>
                    <dd>{ally}</dd>
                  </div>
                  <div>
                    <dt>Tesouro</dt>
                    <dd>{formatTreasury(row.stax)}</dd>
                  </div>
                  <div>
                    <dt>Taxa</dt>
                    <dd>{formatTax(row.tax)}</dd>
                  </div>
                  <div>
                    <dt>Próxima guerra</dt>
                    <dd>
                      {siege.detail}
                      {siege.kind === 'soon' ? <small>{siege.label}</small> : null}
                    </dd>
                  </div>
                  <div>
                    <dt>Forças do cerco</dt>
                    <dd>
                      {sides.attackers.length} atacantes · {sides.defenders.length} defensores
                    </dd>
                  </div>
                </dl>

                {sides.attackers.length || sides.defenders.length ? (
                  <div className="rankings-castle-forces">
                    <div>
                      <h4>
                        <Swords aria-hidden="true" />
                        Atacantes
                      </h4>
                      {sides.attackers.length ? (
                        <ul>
                          {sides.attackers.map((name) => (
                            <li key={`atk-${name}`}>{name}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>Nenhum clã registrado</p>
                      )}
                    </div>
                    <div>
                      <h4>
                        <Shield aria-hidden="true" />
                        Defensores
                      </h4>
                      {sides.defenders.length ? (
                        <ul>
                          {sides.defenders.map((name) => (
                            <li key={`def-${name}`}>{name}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>Nenhum clã registrado</p>
                      )}
                    </div>
                  </div>
                ) : participants[index]?.isLoading ? (
                  <p className="rankings-castle-hint">
                    <Users aria-hidden="true" />
                    Consultando clãs inscritos no cerco...
                  </p>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

function EmptyWorld({ ranking = false }: { ranking?: boolean }) {
  return (
    <div className="rankings-empty">
      <span className="rankings-diamond" aria-hidden="true" />
      <p>
        {ranking
          ? 'O hall da fama ainda aguarda os primeiros nomes.'
          : 'Sem dados desta consulta no momento.'}
      </p>
    </div>
  )
}
