import { Card } from '../../components/ui/Card'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Bell,
  ChartNoAxesCombined,
  CalendarDays,
  Coins,
  ExternalLink,
  Gamepad2,
  PackagePlus,
  Headphones,
  Newspaper,
  Server,
  Settings2,
  ShoppingBag,
  SlidersHorizontal,
  Palette,
  Unlink,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'

type Entry = { to: string; key: string; icon: LucideIcon; external?: boolean }
type Category = {
  key: string
  tone: 'programs' | 'support' | 'system' | 'reports' | 'finance' | 'games' | 'content' | 'server'
  entries: Entry[]
}

const categories: Category[] = [
  {key: 'programs', tone: 'programs', entries: [
    {to:'/panel/admin/supporters',key:'supporters',icon:Coins},
    {to:'/panel/admin/commerce',key:'commerce',icon:ShoppingBag},
    {to:'/panel/admin/rewards',key:'rewardsWorkshop',icon:Gamepad2},
  ]},
  {
    key: 'support',
    tone: 'support',
    entries: [
      { to: '/panel/admin/support', key: 'tickets', icon: Headphones },
    ],
  },
  {
    key: 'system',
    tone: 'system',
    entries: [
      { to: '/panel/admin/resources', key: 'resources', icon: Settings2 },
      { to: '/panel/admin/themes', key: 'themes', icon: Palette },
      { to: '/admin/', key: 'djangoAdmin', icon: ExternalLink, external: true },
    ],
  },
  {
    key: 'reports',
    tone: 'reports',
    entries: [
      { to: '/panel/admin/reports', key: 'reports', icon: ChartNoAxesCombined },
    ],
  },
  {
    key: 'finance',
    tone: 'finance',
    entries: [
      { to: '/panel/admin/coins', key: 'coins', icon: Coins },
      { to: '/panel/admin/shop', key: 'shop', icon: ShoppingBag },
      { to: '/panel/admin/wallet', key: 'wallet', icon: WalletCards },
    ],
  },
  {
    key: 'games',
    tone: 'games',
    entries: [{ to: '/panel/admin/games', key: 'gameModules', icon: Gamepad2 }],
  },
  {
    key: 'content',
    tone: 'content',
    entries: [
      { to: '/panel/admin/news', key: 'news', icon: Newspaper },
      { to: '/panel/admin/roadmap', key: 'roadmap', icon: CalendarDays },
      { to: '/panel/admin/server', key: 'comingSoon', icon: CalendarDays },
    ],
  },
  {
    key: 'server',
    tone: 'server',
    entries: [
      { to: '/panel/admin/server', key: 'server', icon: Server },
      { to: '/panel/admin/items', key: 'itemWatch', icon: ChartNoAxesCombined },
      { to: '/panel/admin/items/customs', key: 'customItems', icon: PackagePlus },
      { to: '/panel/admin/services', key: 'services', icon: Settings2 },
      { to: '/panel/admin/accounts', key: 'lineageAccounts', icon: Unlink },
    ],
  },
]

export function AdminHubPage() {
  const { t } = useTranslation('admin')
  return (
    <div className="account-page admin-hub">
      <Card as="header" className="account-hero">
        <div>
          <span className="panel-eyebrow">{t('hub.eyebrow')}</span>
          <h1>{t('hub.title')}</h1>
          <p className="muted">{t('hub.description')}</p>
        </div>
        <span className="account-status-pill is-active">
          <SlidersHorizontal aria-hidden="true" />
          {t('common:staff')}
        </span>
      </Card>

      {categories.map((category) => (
        <Card className="admin-category" data-tone={category.tone} key={category.key}>
          <div className="account-section-heading">
            <div>
              <span className="panel-eyebrow">{t('hub.module')}</span>
              <h2>{t(`hub.categories.${category.key}`)}</h2>
            </div>
          </div>
          <div className="admin-entry-grid">
            {category.entries.map((entry) => {
              const Icon = entry.icon
              const title = entry.key === 'reports' ? t('hub.reports') : t(`hub.entries.${entry.key}.title`)
              const description = entry.key === 'reports' ? t('hub.reportsDesc') : t(`hub.entries.${entry.key}.description`)
              const body = (
                <>
                  <span className="admin-entry-icon">
                    <Icon aria-hidden="true" />
                  </span>
                  <span>
                    <strong>{title}</strong>
                    <small>{description}</small>
                  </span>
                </>
              )
              return entry.external ? (
                <a className="admin-entry" key={entry.key} href={entry.to} target="_blank" rel="noreferrer">
                  {body}
                </a>
              ) : (
                <Link className="admin-entry" key={entry.to + entry.key} to={entry.to}>
                  {body}
                </Link>
              )
            })}
          </div>
        </Card>
      ))}

      <p className="muted admin-hub-note">
        <Bell aria-hidden="true" />
        {t('hub.note')}
      </p>
    </div>
  )
}
