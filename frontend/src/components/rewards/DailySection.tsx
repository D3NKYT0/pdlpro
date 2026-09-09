import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Gift } from 'lucide-react'
import { gamesApi } from '../../services/api'
import {
  ErrorNotice,
  Loading,
  RewardHistoryList,
  RewardList,
} from '../programs/ProgramUI'
import { useProgramAction } from '../programs/useProgramAction'

export function DailySection() {
  const { t } = useTranslation('panel')
  const query = useQuery({
    queryKey: ['daily-details'],
    queryFn: gamesApi.dailyDetails,
  })
  const fallback = useQuery({
    queryKey: ['daily-bonus'],
    queryFn: gamesApi.dailyBonus,
  })
  const action = useProgramAction()
  const data = query.data
  return (
    <>
      <ErrorNotice error={query.error || fallback.error || action.error} />
      {query.isPending && <Loading />}
      {data && (
        <>
          <Card className="program-section">
            <div className="program-section-heading">
              <div>
                <span className="panel-eyebrow">
                  {t('rewards.daily.eyebrow')}
                </span>
                <h2>{data.season?.name || t('rewards.daily.title')}</h2>
              </div>
              <Gift color="var(--gold)" size={30} />
            </div>
            <p className="muted">
              {data.season
                ? t('rewards.daily.seasonDescription', { day: data.season.current_day })
                : t('rewards.daily.simpleDescription', { amount: fallback.data?.amount || '0' })}
            </p>
            <div className="program-actions">
              <Button
                type="submit"
                disabled={action.busy || data.claimed || !fallback.data?.active}
                onClick={() =>
                  void action.run(
                    gamesApi.claimDailyBonus,
                    t('rewards.daily.claimToast'),
                    [['daily-details'], ['daily-bonus']],
                  )
                }
              >
                <CheckCircle2 size={18} />
                {data.claimed
                  ? t('rewards.daily.claimed')
                  : t('rewards.daily.claim')}
              </Button>
            </div>
          </Card>
          <div className="program-grid">
            {data.days.map((d) => (
              <article
                key={d.day}
                className={`card program-section program-day ${d.day === data.season?.current_day ? 'is-today' : ''} ${d.day > (data.season?.current_day || 0) ? 'is-locked' : ''}`}
              >
                <h3>
                  {d.day === data.season?.current_day
                    ? t('rewards.daily.dayToday', { day: d.day })
                    : t('rewards.daily.day', { day: d.day })}
                </h3>
                <RewardList rewards={d.rewards} />
              </article>
            ))}
          </div>
          {data.pool.length > 0 && (
            <Card className="program-section">
              <h2>{t('rewards.daily.poolTitle')}</h2>
              <p className="muted">{t('rewards.daily.poolDescription')}</p>
              <div className="program-grid">
                {data.pool.map((p, i) => (
                  <article className="program-item" key={i}>
                    <h3>{p.name}</h3>
                    <RewardList rewards={p.rewards} />
                    <small className="muted">
                      {t('rewards.daily.chance', {
                        percent: (
                          (p.weight /
                            data.pool.reduce((s, r) => s + r.weight, 0)) *
                          100
                        ).toFixed(1),
                      })}
                    </small>
                  </article>
                ))}
              </div>
            </Card>
          )}
          <Card className="program-section">
            <h2>{t('rewards.daily.historyTitle')}</h2>
            <RewardHistoryList history={data.history} />
          </Card>
        </>
      )}
    </>
  )
}
