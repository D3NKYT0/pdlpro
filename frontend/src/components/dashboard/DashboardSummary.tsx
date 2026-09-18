import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Coins,
  Landmark,
  Package,
  ShieldCheck,
  Trophy,
  UserRoundCog,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { ApiGamerProfile, ApiUser, ApiWallet } from '../../services/api'
import { formatNumber } from '../../lib/formatters'

type Tile = {
  key: string
  to?: string
  art: string
  icon: LucideIcon
  label: string
  value: string
  hint?: string
}

export function DashboardSummary({
  user,
  progress,
  progressEnabled,
  wallet,
  walletEnabled,
  accountsCount,
  accountsEnabled,
  rosterTotal,
  bagCount,
  gamesEnabled,
}: {
  user: ApiUser | null
  progress?: ApiGamerProfile
  progressEnabled?: boolean
  wallet?: ApiWallet
  walletEnabled: boolean
  accountsCount: number
  accountsEnabled: boolean
  rosterTotal: number
  bagCount: number
  gamesEnabled: boolean
}) {
  const { t } = useTranslation('panel')
  const unlocked = progress?.unlocked_count ?? progress?.achievements?.filter((row) => row.unlocked).length ?? 0
  const totalAchievements = progress?.total_achievements ?? progress?.achievements?.length ?? 0
  const securityOk = Boolean(user?.is_email_verified && user?.is_2fa_enabled)

  const tiles: Tile[] = []
  if (progressEnabled !== false) {
    tiles.push({
      key: 'level',
      art: 'level',
      icon: Trophy,
      label: t('dashboard.statLevel'),
      value: String(progress?.level ?? 1),
      hint: t('dashboard.statXp', { xp: formatNumber(progress?.xp ?? 0), next: formatNumber(progress?.xp_next ?? 100) }),
    })
  }
  if (walletEnabled) {
    tiles.push({
      key: 'wallet',
      to: '/panel/wallet',
      art: 'wallet',
      icon: Landmark,
      label: t('dashboard.statWallet'),
      value: wallet?.balance ?? '0.00',
      hint: t('dashboard.statWalletBonus', { bonus: wallet?.bonus_balance ?? '0.00' }),
    })
  }
  if (gamesEnabled) {
    tiles.push({
      key: 'chips',
      to: '/panel/games',
      art: 'games',
      icon: Coins,
      label: t('dashboard.statChips'),
      value: formatNumber(user?.fichas ?? 0),
    })
    tiles.push({
      key: 'bag',
      to: '/panel/games',
      art: 'bag',
      icon: Package,
      label: t('dashboard.statBag'),
      value: formatNumber(bagCount),
    })
  }
  if (accountsEnabled) {
    tiles.push({
      key: 'characters',
      to: '/panel/accounts',
      art: 'characters',
      icon: Users,
      label: t('dashboard.statCharacters'),
      value: formatNumber(rosterTotal),
    })
    tiles.push({
      key: 'accounts',
      to: '/panel/accounts',
      art: 'accounts',
      icon: UserRoundCog,
      label: t('dashboard.statAccounts'),
      value: formatNumber(accountsCount),
    })
  }
  if (progressEnabled !== false) {
    tiles.push({
      key: 'achievements',
      art: 'achievements',
      icon: Zap,
      label: t('dashboard.statAchievements'),
      value: `${unlocked}/${totalAchievements || 0}`,
    })
  }
  tiles.push({
    key: 'security',
    to: '/panel/security',
    art: 'security',
    icon: ShieldCheck,
    label: t('dashboard.statSecurity'),
    value: securityOk ? t('dashboard.securityReady') : t('dashboard.securityAttention'),
  })

  return (
    <section className="dashboard-summary" aria-label={t('dashboard.summaryAria')}>
      <div className="dashboard-summary-grid">
        {tiles.map((tile) => {
          const Icon = tile.icon
          const body = (
            <>
              <span className="dashboard-summary-icon">
                <Icon aria-hidden="true" />
              </span>
              <span>
                <small>{tile.label}</small>
                <strong>{tile.value}</strong>
                {tile.hint ? <em>{tile.hint}</em> : null}
              </span>
            </>
          )
          return tile.to ? (
            <Link className="card dashboard-summary-card" data-art={tile.art} key={tile.key} to={tile.to}>
              {body}
            </Link>
          ) : (
            <article className="card dashboard-summary-card" data-art={tile.art} key={tile.key}>
              {body}
            </article>
          )
        })}
      </div>
    </section>
  )
}
