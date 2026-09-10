import type { TFunction } from 'i18next'

export type GameContentField = {
  key: string
  label: string
  type?: string
  source?: string
  options?: [string, string][]
  initial?: unknown
  min?: number
}

export type GameContentSection = {
  id: string
  label: string
  fields: GameContentField[]
}

/** Rótulos vêm do namespace `admin`; as chaves e os valores das opções continuam estáveis para a API. */
const field = (t: TFunction, key: string, extra: Partial<GameContentField> = {}): GameContentField => ({
  key,
  label: t(`gameContent.fields.${key}`),
  ...extra,
})

const number = (t: TFunction, key: string, initial = 1, min = 0): GameContentField =>
  field(t, key, { type: 'number', initial, min })

const options = (t: TFunction, group: string, values: string[]): [string, string][] =>
  values.map((value) => [value, t(`gameContent.${group}.${value}`)])

export function buildGameContentConfig(t: TFunction): GameContentSection[] {
  const name = field(t, 'name')
  const active = field(t, 'active', { type: 'checkbox', initial: true })
  const season = field(t, 'season', { source: 'seasons' })
  const rewards = field(t, 'rewards', { type: 'rewards', initial: [] })
  const section = (id: string, fields: GameContentField[]): GameContentSection => ({
    id,
    label: t(`gameContent.sections.${id}`),
    fields,
  })

  return [
    section('seasons', [
      name,
      field(t, 'starts_at', { type: 'datetime-local' }),
      field(t, 'ends_at', { type: 'datetime-local' }),
      number(t, 'premium_price', 50),
      active,
    ]),
    section('levels', [season, number(t, 'level'), number(t, 'required_xp', 0)]),
    section('rewards', [
      field(t, 'level_row', { source: 'levels' }),
      field(t, 'item_name'),
      number(t, 'item_id', 57, 1),
      number(t, 'enchant', 0),
      number(t, 'quantity', 1, 1),
      field(t, 'description', { type: 'textarea' }),
      field(t, 'is_premium', { type: 'checkbox' }),
    ]),
    section('quests', [
      season,
      name,
      field(t, 'description', { type: 'textarea' }),
      field(t, 'event', {
        options: options(t, 'events', ['roulette', 'dice', 'slots', 'fishing', 'economy', 'daily_bonus']),
      }),
      number(t, 'target', 1, 1),
      number(t, 'xp', 25),
      field(t, 'period', { options: options(t, 'periods', ['daily', 'weekly', 'season']) }),
      active,
    ]),
    section('exchanges', [
      season,
      name,
      number(t, 'required_item_id', 57, 1),
      number(t, 'required_enchant', 0),
      number(t, 'required_quantity', 1, 1),
      number(t, 'limit_per_user'),
      rewards,
      active,
    ]),
    section('milestones', [season, name, number(t, 'required_xp', 100), rewards]),
    section('daily-seasons', [
      name,
      field(t, 'starts_on', { type: 'date' }),
      field(t, 'ends_on', { type: 'date' }),
      active,
    ]),
    section('daily-days', [
      field(t, 'season', { source: 'daily-seasons' }),
      number(t, 'day', 1, 1),
      rewards,
    ]),
    section('daily-pool', [
      field(t, 'season', { source: 'daily-seasons' }),
      name,
      number(t, 'weight', 1, 1),
      rewards,
    ]),
    section('baits', [
      name,
      field(t, 'description', { type: 'textarea' }),
      number(t, 'price'),
      number(t, 'success_bonus', 5),
      active,
    ]),
  ]
}

export function localDate(value: string) {
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(value)) return value
  const d = new Date(value)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)
}

export function buildRowLabel(
  t: TFunction,
  row: { id: string; [key: string]: unknown },
  seasons: Array<{ id: string; [key: string]: unknown }>,
) {
  return String(
    row.name ||
      row.item_name ||
      (row.level !== undefined
        ? t('gameContent.rowLevel', {
            level: row.level,
            season: seasons.find((s) => s.id === row.season)?.name || t('gameContent.rowSeason'),
          })
        : row.day !== undefined
          ? t('gameContent.rowDay', { day: row.day })
          : t('gameContent.rowRecord')),
  )
}
