import { Card } from '../components/ui/Card'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowUpRight,
  Gamepad2,
  KeyRound,
  Package,
  Server,
  ShoppingBag,
  SlidersHorizontal,
  Trophy,
  UserRoundCog,
  CircleUserRound,
  Users,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import { AchievementGrid } from '../components/AchievementGrid'
import { useAuth } from '../contexts/AuthContext'
import { canAccessStaff } from '../lib/staff'
import { authApi, serverApi } from '../services/api'
import { programsApi } from '../services/api'

const shortcuts: Array<{ to: string; key: string; icon: LucideIcon; resource?: string }> = [
  { to: '/panel/profile', key: 'profile', icon: CircleUserRound, resource: 'profile' },
  { to: '/panel/accounts', key: 'accounts', icon: UserRoundCog, resource: 'accounts' },
  { to: '/panel/inventory', key: 'inventory', icon: Package, resource: 'inventory' },
  { to: '/panel/wallet', key: 'wallet', icon: WalletCards, resource: 'wallet' },
  { to: '/panel/shop', key: 'shop', icon: ShoppingBag, resource: 'shop' },
  { to: '/panel/games', key: 'games', icon: Gamepad2, resource: 'games' },
  { to: '/panel/progress', key: 'progress', icon: Trophy, resource: 'progress' },
]

export function PainelPage() {
  const { t } = useTranslation('panel')
  const { user } = useAuth()
  const resources = useQuery({
    queryKey: ['resources'],
    queryFn: programsApi.resources,
    staleTime: 15000,
  })
  const resourceEnabled = (code?: string) =>
    !code || !resources.data?.some((r) => r.code === code && !r.enabled)
  const status = useQuery({ queryKey: ['server-status'], queryFn: serverApi.status })
  const progress = useQuery({
    queryKey: ['progress'],
    queryFn: authApi.progress,
    enabled: Boolean(user) && resourceEnabled('progress'),
  })
  const baseShortcuts = shortcuts.filter((item) => resourceEnabled(item.resource))
  const dashboardShortcuts = canAccessStaff(user)
    ? [...baseShortcuts, { to: '/panel/admin', key: 'admin', icon: SlidersHorizontal }]
    : baseShortcuts

  return (
    <div className="grid panel-dashboard">
      <Card className="panel-welcome">
        <span className="panel-eyebrow">{t('dashboard.eyebrow')}</span>
        <h1>{t('dashboard.greeting', { name: user?.display_name || user?.username })}</h1>
        <p className="muted">{t('dashboard.subtitle')}</p>
      </Card>

      <section className="grid cols-3 panel-status-grid" aria-label={t('dashboard.statusAria')}>
        <Card as="article" className="status-card">
          <Server aria-hidden="true" />
          <div className="status-copy">
            <span className="muted">{t('dashboard.gameServer')}</span>
            <div className={status.data?.game_online ? 'badge' : 'badge off'}>
              {status.data?.game_online ? t('dashboard.online') : t('dashboard.offline')}
            </div>
          </div>
        </Card>
        <Card as="article" className="status-card">
          <KeyRound aria-hidden="true" />
          <div className="status-copy">
            <span className="muted">{t('dashboard.loginServer')}</span>
            <div className={status.data?.login_online ? 'badge' : 'badge off'}>
              {status.data?.login_online ? t('dashboard.online') : t('dashboard.offline')}
            </div>
          </div>
        </Card>
        <Card as="article" className="status-card">
          <Users aria-hidden="true" />
          <div className="status-copy">
            <span className="muted">{t('dashboard.playersOnline')}</span>
            <div className="stat">{status.data?.players_online ?? 0}</div>
          </div>
        </Card>
      </section>

      {resourceEnabled('progress') ? <AchievementGrid achievements={progress.data?.achievements ?? []} /> : null}

      <section className="panel-section-heading">
        <div>
          <span className="panel-eyebrow">{t('dashboard.quickAccessEyebrow')}</span>
          <h2>{t('dashboard.quickAccessTitle')}</h2>
        </div>
      </section>

      <section className="grid cols-3 panel-shortcuts">
        {dashboardShortcuts.map((item) => {
          const Icon = item.icon
          return (
            <Link className="card shortcut-card" key={item.to} to={item.to}>
              <span className="shortcut-icon">
                <Icon aria-hidden="true" />
              </span>
              <span className="shortcut-copy">
                <h3>{t(`dashboard.shortcuts.${item.key}.label`)}</h3>
                <p className="muted">{t(`dashboard.shortcuts.${item.key}.text`)}</p>
              </span>
              <ArrowUpRight className="shortcut-arrow" aria-hidden="true" />
            </Link>
          )
        })}
      </section>
    </div>
  )
}
