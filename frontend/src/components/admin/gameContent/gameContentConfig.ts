export type GameContentField = {
  key: string
  label: string
  type?: string
  source?: string
  options?: [string, string][]
  initial?: unknown
  min?: number
}

const name: GameContentField = { key: 'name', label: 'Nome' }
const active: GameContentField = {
  key: 'active',
  label: 'Ativo',
  type: 'checkbox',
  initial: true,
}
const season: GameContentField = { key: 'season', label: 'Temporada', source: 'seasons' }
const rewards: GameContentField = {
  key: 'rewards',
  label: 'Recompensas',
  type: 'rewards',
  initial: [],
}
const number = (key: string, label: string, initial = 1, min = 0): GameContentField => ({
  key,
  label,
  type: 'number',
  initial,
  min,
})

export const gameConfigSections: {
  id: string
  label: string
  fields: GameContentField[]
}[] = [
  {
    id: 'seasons',
    label: 'Temporadas do passe',
    fields: [
      name,
      { key: 'starts_at', label: 'Início', type: 'datetime-local' },
      { key: 'ends_at', label: 'Fim', type: 'datetime-local' },
      number('premium_price', 'Preço premium', 50),
      active,
    ],
  },
  {
    id: 'levels',
    label: 'Níveis',
    fields: [
      season,
      number('level', 'Nível'),
      number('required_xp', 'XP necessário', 0),
    ],
  },
  {
    id: 'rewards',
    label: 'Prêmios do passe',
    fields: [
      { key: 'level_row', label: 'Nível', source: 'levels' },
      { key: 'item_name', label: 'Nome do item' },
      number('item_id', 'ID do item', 57, 1),
      number('enchant', 'Encantamento', 0),
      number('quantity', 'Quantidade', 1, 1),
      { key: 'description', label: 'Descrição', type: 'textarea' },
      { key: 'is_premium', label: 'Exclusivo premium', type: 'checkbox' },
    ],
  },
  {
    id: 'quests',
    label: 'Missões',
    fields: [
      season,
      name,
      { key: 'description', label: 'Descrição', type: 'textarea' },
      {
        key: 'event',
        label: 'Objetivo',
        options: [
          ['roulette', 'Girar roleta'],
          ['dice', 'Jogar dados'],
          ['slots', 'Girar slots'],
          ['fishing', 'Pescar'],
          ['economy', 'Combater'],
          ['daily_bonus', 'Resgatar bônus diário'],
        ],
      },
      number('target', 'Quantidade necessária', 1, 1),
      number('xp', 'Recompensa em XP', 25),
      {
        key: 'period',
        label: 'Repetição',
        options: [
          ['daily', 'Diária'],
          ['weekly', 'Semanal'],
          ['season', 'Uma vez na temporada'],
        ],
      },
      active,
    ],
  },
  {
    id: 'exchanges',
    label: 'Trocas de itens',
    fields: [
      season,
      name,
      number('required_item_id', 'ID do item exigido', 57, 1),
      number('required_enchant', 'Encantamento exigido', 0),
      number('required_quantity', 'Quantidade exigida', 1, 1),
      number('limit_per_user', 'Limite por jogador (0 = sem limite)'),
      rewards,
      active,
    ],
  },
  {
    id: 'milestones',
    label: 'Marcos de progresso',
    fields: [
      season,
      name,
      number('required_xp', 'XP necessário', 100),
      rewards,
    ],
  },
  {
    id: 'daily-seasons',
    label: 'Temporadas do bônus',
    fields: [
      name,
      { key: 'starts_on', label: 'Primeiro dia', type: 'date' },
      { key: 'ends_on', label: 'Último dia', type: 'date' },
      active,
    ],
  },
  {
    id: 'daily-days',
    label: 'Recompensas por dia',
    fields: [
      { key: 'season', label: 'Temporada', source: 'daily-seasons' },
      number('day', 'Dia da temporada', 1, 1),
      rewards,
    ],
  },
  {
    id: 'daily-pool',
    label: 'Sorteios do bônus',
    fields: [
      { key: 'season', label: 'Temporada', source: 'daily-seasons' },
      name,
      number('weight', 'Peso no sorteio', 1, 1),
      rewards,
    ],
  },
  {
    id: 'baits',
    label: 'Iscas de pesca',
    fields: [
      name,
      { key: 'description', label: 'Descrição', type: 'textarea' },
      number('price', 'Preço em fichas'),
      number('success_bonus', 'Bônus de chance (pontos percentuais)', 5),
      active,
    ],
  },
]

export function localDate(value: string) {
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(value)) return value
  const d = new Date(value)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)
}

export function rowLabel(
  row: { id: string; [key: string]: unknown },
  seasons: Array<{ id: string; [key: string]: unknown }>,
) {
  return String(
    row.name ||
      row.item_name ||
      (row.level !== undefined
        ? `Nível ${row.level} · ${seasons.find((s) => s.id === row.season)?.name || 'Temporada'}`
        : row.day !== undefined
          ? `Dia ${row.day}`
          : 'Registro'),
  )
}
