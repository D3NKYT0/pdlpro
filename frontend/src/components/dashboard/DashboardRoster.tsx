import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Users } from 'lucide-react'
import { CharacterAvatar } from '../character/CharacterAvatar'
import { ButtonLink } from '../ui/Button'
import { Card } from '../ui/Card'
import { EmptyState, LoadingState } from '../ui/Feedback'
import { getClassName } from '../../lib/lineage'
import type { ApiGameCharacter } from '../../services/api'

export function DashboardRoster({
  login,
  characters,
  pending,
}: {
  login?: string
  characters: ApiGameCharacter[]
  pending: boolean
}) {
  const { t } = useTranslation('panel')

  return (
    <Card className="dashboard-roster">
      <div className="dashboard-roster-heading">
        <div>
          <span className="panel-eyebrow">{t('dashboard.rosterEyebrow')}</span>
          <h2>{t('dashboard.rosterTitle')}</h2>
        </div>
        <ButtonLink to="/panel/accounts" variant="ghost">
          {t('dashboard.linkAccount')}
        </ButtonLink>
      </div>
      {pending ? <LoadingState /> : null}
      {!pending && characters.length ? (
        <div className="dashboard-roster-grid">
          {characters.map((row) => (
            <Link
              className={`dashboard-roster-card ${row.online ? 'is-online' : ''}`}
              key={row.char_id}
              to={login ? `/panel/accounts/${encodeURIComponent(login)}/${row.char_id}` : '/panel/accounts'}
            >
              <CharacterAvatar name={row.name} classId={row.class_id} sex={row.sex} size="lg" />
              <span>
                <strong>{row.name}</strong>
                <small>
                  {getClassName(row.class_id)} · {t('dashboard.rosterLevel', { level: row.level })}
                </small>
                <b className={row.online ? 'is-on' : 'is-off'}>
                  {row.online ? t('dashboard.rosterOnline') : t('dashboard.rosterOffline')}
                </b>
              </span>
            </Link>
          ))}
        </div>
      ) : null}
      {!pending && !characters.length ? (
        <EmptyState icon={<Users aria-hidden="true" />}>{t('dashboard.rosterEmpty')}</EmptyState>
      ) : null}
    </Card>
  )
}
