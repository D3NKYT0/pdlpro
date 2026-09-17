import { Card } from '../../ui/Card'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeftRight,
  Bell,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  CircleHelp,
  CircleUserRound,
  Crosshair,
  Download,
  Fish,
  Flag,
  Gamepad2,
  Gavel,
  Gift,
  Handshake,
  Headphones,
  MessageCircle,
  Newspaper,
  Package,
  Puzzle,
  Settings2,
  ShoppingBag,
  Store,
  Ticket,
  Trophy,
  UserRoundCog,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { programsApi, type Resource } from '../../../services/api'
import { ErrorNotice, LoadingState } from '../../ui/Feedback'
import { Toggle } from '../../ui/Toggle'
import { AdminHeader } from '../../../pages/admin/AdminChrome'
import { apiErrorMessage } from '../../../lib/errors'

const CATEGORY_ORDER = ['economy', 'games', 'account', 'community', 'communication', 'content'] as const

const CATEGORY_BY_CODE: Record<string, (typeof CATEGORY_ORDER)[number] | 'other'> = {
  shop: 'economy',
  wallet: 'economy',
  inventory: 'economy',
  marketplace: 'economy',
  auction: 'economy',
  games: 'games',
  'battle-pass': 'games',
  'daily-bonus': 'games',
  fishing: 'games',
  hunt: 'games',
  profile: 'account',
  accounts: 'account',
  progress: 'account',
  supporters: 'community',
  notifications: 'communication',
  support: 'communication',
  help: 'communication',
  news: 'content',
  rankings: 'content',
  wiki: 'content',
  faq: 'content',
  downloads: 'content',
  calendar: 'content',
  roadmap: 'content',
  'game-stores': 'content',
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  economy: WalletCards,
  games: Gamepad2,
  account: CircleUserRound,
  community: Handshake,
  communication: Bell,
  content: Newspaper,
  other: Settings2,
}

const RESOURCE_ICONS: Record<string, LucideIcon> = {
  supporters: Handshake,
  roadmap: Flag,
  shop: ShoppingBag,
  wallet: WalletCards,
  inventory: Package,
  marketplace: ArrowLeftRight,
  auction: Gavel,
  games: Gamepad2,
  'battle-pass': Ticket,
  'daily-bonus': Gift,
  fishing: Fish,
  hunt: Crosshair,
  profile: CircleUserRound,
  accounts: UserRoundCog,
  progress: Trophy,
  notifications: Bell,
  support: Headphones,
  help: MessageCircle,
  news: Newspaper,
  rankings: ChartNoAxesCombined,
  wiki: BookOpen,
  faq: CircleHelp,
  downloads: Download,
  calendar: CalendarDays,
  'game-stores': Store,
}

function categoryKey(row: Resource) {
  return CATEGORY_BY_CODE[row.code] ?? 'other'
}

export function AdminResourcesSection() {
  const { t, i18n } = useTranslation('admin')
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['resources'],
    queryFn: programsApi.resources,
  })
  const [updating, setUpdating] = useState<string | null>(null)

  const labelFor = (row: Resource) => t(`resources.items.${row.code}.name`, { defaultValue: row.name })
  const descriptionFor = (row: Resource) =>
    t(`resources.items.${row.code}.description`, { defaultValue: row.description })

  const rows = query.data ?? []
  const buckets = new Map<string, Resource[]>()
  for (const row of rows) {
    const key = categoryKey(row)
    const list = buckets.get(key) ?? []
    list.push(row)
    buckets.set(key, list)
  }
  const categories = [
    ...CATEGORY_ORDER.filter((key) => buckets.has(key)),
    ...[...buckets.keys()].filter((key) => !CATEGORY_ORDER.includes(key as (typeof CATEGORY_ORDER)[number])),
  ]

  async function toggle(row: Resource, enabled: boolean) {
    if (updating) return
    setUpdating(row.id)
    try {
      await programsApi.toggleResource(row.id, enabled)
      toast.success(enabled ? t('resources.enabled') : t('resources.disabled'))
      await queryClient.invalidateQueries({ queryKey: ['resources'] })
    } catch (error) {
      toast.error(apiErrorMessage(error, t('resources.toast.error')))
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="account-page">
      <AdminHeader
        kicker={t('resources.kicker')}
        title={t('resources.title')}
        description={t('resources.description')}
      />
      <ErrorNotice error={query.error} onRetry={() => void query.refetch()} />
      {query.isPending && <LoadingState />}
      {!query.isPending && !query.error && !rows.length ? (
        <div className="account-empty-state">
          <strong>{t('resources.emptyTitle')}</strong>
          <span>{t('resources.emptyText')}</span>
        </div>
      ) : null}
      {categories.map((category) => {
        const items = [...(buckets.get(category) ?? [])].sort((left, right) =>
          labelFor(left).localeCompare(labelFor(right), i18n.resolvedLanguage || i18n.language),
        )
        const Icon = CATEGORY_ICONS[category] ?? Settings2
        const enabledCount = items.filter((item) => item.enabled).length
        return (
          <Card className="admin-games-panel" key={category}>
            <header className="admin-services-heading">
              <span>
                <Icon />
              </span>
              <div>
                <span className="panel-eyebrow">{t('resources.eyebrow')}</span>
                <h2>{t(`resources.categories.${category}`, { defaultValue: category })}</h2>
              </div>
              <div className="admin-services-summary">
                <strong>{enabledCount}</strong>
                <small>{t('resources.activeCount', { total: items.length })}</small>
              </div>
            </header>
            <div className="admin-game-grid">
              {items.map((row) => {
                const ItemIcon = RESOURCE_ICONS[row.code] ?? Puzzle
                const name = labelFor(row)
                const busy = updating === row.id
                return (
                  <article className={`admin-game-card${row.enabled ? ' is-active' : ' is-inactive'}`} key={row.id}>
                    <span className="admin-game-icon">
                      <ItemIcon aria-hidden={true} />
                    </span>
                    <div>
                      <h3>{name}</h3>
                      <code>{row.code}</code>
                      <p>{descriptionFor(row)}</p>
                    </div>
                    <Toggle
                      className={`admin-game-switch${busy ? ' is-busy' : ''}`}
                      busy={busy}
                      label={busy ? t('resources.updating') : t(row.enabled ? 'resources.disable' : 'resources.enable', { name })}
                      checked={row.enabled}
                      onChange={(event) => void toggle(row, event.target.checked)}
                    />
                  </article>
                )
              })}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
