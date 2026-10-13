import { useResourceControls } from '../../contexts/ResourceControlsContext'
import { MicroResource } from '../programs/MicroResource'
import { CircleUserRound, KeyRound, Server, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ButtonLink } from '../ui/Button'
import { Card } from '../ui/Card'
import type { ApiServerStatus, ApiUser } from '../../services/api'

export function DashboardHero({
  user,
  status,
  gamesEnabled,
}: {
  user: ApiUser | null
  status?: ApiServerStatus
  gamesEnabled: boolean
}) {
  const { t } = useTranslation('panel')
  const resourceOn = useResourceControls()
  const showIndicators = resourceOn('server-status') || resourceOn('players-online')
  const name = user?.display_name || user?.username || ''

  return (
    <Card className={`panel-welcome dashboard-hero${showIndicators ? '' : ' dashboard-hero--without-status'}`} data-theme-part="page-header">
      <div className="dashboard-hero-identity">
        {user?.avatar_url ? (
          <img className="dashboard-hero-avatar" src={user.avatar_url} alt={t('profile.avatarAlt', { username: user.username })} />
        ) : (
          <span className="dashboard-hero-avatar is-fallback">
            <CircleUserRound aria-hidden="true" />
          </span>
        )}
        <div>
          <span className="panel-eyebrow">{t('dashboard.eyebrow')}</span>
          <h1>{t('dashboard.greeting', { name })}</h1>
          <p className="muted">{t('dashboard.subtitle')}</p>
          <div className="dashboard-hero-actions">
            <ButtonLink to="/panel/profile">{t('dashboard.openProfile')}</ButtonLink>
            {gamesEnabled ? (
              <ButtonLink variant="ghost" to="/panel/games">
                {t('dashboard.play')}
              </ButtonLink>
            ) : null}
          </div>
        </div>
      </div>
      {showIndicators && <ul className="dashboard-hero-status" aria-label={t('dashboard.statusAria')}>
        <MicroResource code="server-status"><li>
          <Server aria-hidden="true" />
          <span>{t('dashboard.gameServer')}</span>
          <b className={status?.game_online ? 'is-on' : 'is-off'}>
            {status?.game_online ? t('dashboard.online') : t('dashboard.offline')}
          </b>
        </li>
        <li>
          <KeyRound aria-hidden="true" />
          <span>{t('dashboard.loginServer')}</span>
          <b className={status?.login_online ? 'is-on' : 'is-off'}>
            {status?.login_online ? t('dashboard.online') : t('dashboard.offline')}
          </b>
        </li></MicroResource>
        <MicroResource code="players-online"><li>
          <Users aria-hidden="true" />
          <span>{t('dashboard.playersOnline')}</span>
          <strong>{status?.players_online ?? 0}</strong>
        </li></MicroResource>
      </ul>}
    </Card>
  )
}
