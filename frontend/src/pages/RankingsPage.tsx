import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
  type LucideIcon,
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { serverApi } from '../services/api'
import type { ApiRankingEntry } from '../services/types'

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
  return date ? date.toLocaleString('pt-BR') : '—'
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
            {tab.valueLabel ? <em>{tab.valueLabel}</em> : null}
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
            worldRows.length ? (
              <div className="rankings-world-grid">
                {worldRows.map((row) => (
                  <article className="rankings-world-card siege" key={String(row.castle_id ?? row.name)}>
                    <div className="rankings-mark sm">
                      <Castle aria-hidden="true" />
                    </div>
                    <span>Castelo</span>
                    <strong>{String(row.name ?? '—')}</strong>
                    <dl>
                      <div>
                        <dt>Clã</dt>
                        <dd>{String(row.clan_name ?? 'Livre')}</dd>
                      </div>
                      <div>
                        <dt>Líder</dt>
                        <dd>{String(row.leader ?? '—')}</dd>
                      </div>
                      <div>
                        <dt>Siege</dt>
                        <dd>{formatDate(row.sdate)}</dd>
                      </div>
                      <div>
                        <dt>Tesouro</dt>
                        <dd>{formatWorldCell('stax', row.stax)}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyWorld />
            )
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
