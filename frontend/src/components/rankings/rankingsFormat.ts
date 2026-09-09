import type { ApiRankingEntry } from '../../services/types'
import { themeImage } from '../../theme/assets'
import { bossNames, CASTLE_CATALOG, type Tab, type WorldRow, worldColumnLabels } from './rankingsMeta'

export function initial(name: string) {
  return (name.trim()[0] || '?').toUpperCase()
}

export function formatScore(value: number) {
  return value.toLocaleString('pt-BR')
}

export function formatDuration(seconds: number) {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${Math.max(0, minutes)}m`
}

export function formatValue(tab: Tab, value: number) {
  if (tab.id === 'online') return formatDuration(value)
  if (tab.id === 'level') return String(value)
  return formatScore(value)
}

export function parseDate(value: unknown): Date | null {
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

export function formatDate(value: unknown) {
  const date = parseDate(value)
  return date
    ? date.toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'
}

export function formatRelative(date: Date) {
  const diffSec = Math.round((date.getTime() - Date.now()) / 1000)
  const abs = Math.abs(diffSec)
  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour')
  return rtf.format(Math.round(diffSec / 86400), 'day')
}

export function displayName(value: unknown, empty = '—') {
  const text = String(value ?? '').trim()
  return text && text !== 'None' && text !== 'null' ? text : empty
}

export function castleIdOf(row: WorldRow) {
  const value = row.castle_id ?? row.id
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0
}

export function castleInfo(row: WorldRow) {
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

export function siegeState(value: unknown) {
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

export function withCastleCatalog(rows: WorldRow[]): WorldRow[] {
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

export function formatTax(value: unknown) {
  if (value == null || value === '') return '—'
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '—'
  return `${amount.toLocaleString('pt-BR')}%`
}

export function formatTreasury(value: unknown) {
  if (value == null || value === '') return 'Vazio'
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) return 'Vazio'
  return `${amount.toLocaleString('pt-BR')} adena`
}

export function splitParticipants(rows: WorldRow[], ownerName: string) {
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

export function formatRespawn(value: unknown) {
  const date = parseDate(value)
  if (!date) return { live: true, label: 'Vivo' }
  if (date.getTime() <= Date.now()) return { live: true, label: 'Vivo' }
  return { live: false, label: date.toLocaleString('pt-BR') }
}

export function asRankingRows(rows: WorldRow[]): ApiRankingEntry[] {
  return rows
    .filter((row) => row.name)
    .map((row, index) => ({
      position: index + 1,
      name: String(row.name),
      value: Number(row.value ?? 0),
    }))
}

export function formatWorldCell(key: string, value: unknown) {
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

export function worldKeys(rows: WorldRow[]) {
  const keys = rows[0] ? Object.keys(rows[0]) : []
  return keys.filter((key) => !['char_id', 'clan_id', 'castle_id'].includes(key))
}

export function worldColumnLabel(key: string) {
  return worldColumnLabels[key] ?? key
}
