import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { CalendarDays, CheckCircle2, Dices, Gift, History, LockKeyhole } from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { gamesApi } from '../../services/api'
import { ErrorNotice, Loading, RewardHistoryList, RewardList } from '../programs/ProgramUI'
import { useProgramAction } from '../programs/useProgramAction'

const DAILY_KEYS = [['daily-details'], ['daily-bonus']] as const

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
  const currentDay = data?.season?.current_day || 0
  const totalDays = data?.days.length || 0
  const poolWeight = data?.pool.reduce((total, entry) => total + entry.weight, 0) || 0
  return (
    <div className="daily-layout">
      <ErrorNotice error={query.error || fallback.error || action.error} />
      {query.isPending && <Loading />}
      {data && (
        <>
          <Card className="battle-pass-card daily-hero">
            <header className="daily-hero-banner">
              <div className="pass-season-copy">
                <span className="panel-eyebrow">{t('rewards.daily.eyebrow')}</span>
                <h2>{data.season?.name || t('rewards.daily.title')}</h2>
                <p>
                  {data.season
                    ? t('rewards.daily.seasonDescription', { day: data.season.current_day })
                    : t('rewards.daily.simpleDescription', { amount: fallback.data?.amount || '0' })}
                </p>
              </div>
              <div className="daily-day-seal">
                <span>{t('rewards.daily.statusToday')}</span>
                <strong>{currentDay || '—'}</strong>
              </div>
              <Button
                disabled={action.busy || data.claimed || !fallback.data?.active}
                onClick={() =>
                  void action.run(
                    gamesApi.claimDailyBonus,
                    t('rewards.daily.claimToast'),
                    DAILY_KEYS,
                  )
                }
              >
                <CheckCircle2 aria-hidden="true" />
                {data.claimed ? t('rewards.daily.claimed') : t('rewards.daily.claim')}
              </Button>
            </header>
            {data.season && totalDays > 0 ? (
              <div className="battle-pass-progress">
                <div className="progress-labels">
                  <span>
                    <CalendarDays aria-hidden="true" />
                    {t('rewards.daily.calendarProgress', { day: currentDay, total: totalDays })}
                  </span>
                  <span>{Math.round(Math.min(100, (currentDay / totalDays) * 100))}%</span>
                </div>
                <div
                  className="progress-bar"
                  role="progressbar"
                  aria-label={t('rewards.daily.calendarTitle')}
                  aria-valuenow={currentDay}
                  aria-valuemin={0}
                  aria-valuemax={totalDays}
                >
                  <i style={{ width: `${Math.min(100, (currentDay / totalDays) * 100)}%` }} />
                </div>
              </div>
            ) : null}
          </Card>

          {totalDays > 0 ? (
            <Card className="battle-pass-card daily-calendar-card">
              <div className="progress-module-heading">
                <span><CalendarDays aria-hidden="true" /></span>
                <div>
                  <span className="panel-eyebrow">{t('rewards.daily.calendarEyebrow')}</span>
                  <h2>{t('rewards.daily.calendarTitle')}</h2>
                </div>
                {data.season ? <b>{currentDay}/{totalDays}</b> : null}
              </div>
              <div className="daily-calendar">
                {data.days.map((entry) => {
                  const today = entry.day === currentDay
                  const locked = entry.day > currentDay
                  return (
                    <article
                      className={`daily-day ${today ? 'is-today' : locked ? 'is-locked' : 'is-released'}`}
                      key={entry.day}
                    >
                      <span className="daily-day-stamp">{entry.day}</span>
                      <header>
                        <strong>{t('rewards.daily.day', { day: entry.day })}</strong>
                        <span className="pass-chip">
                          {locked ? <LockKeyhole aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
                          {today
                            ? t('rewards.daily.statusToday')
                            : locked
                              ? t('rewards.daily.statusLocked')
                              : t('rewards.daily.statusReleased')}
                        </span>
                      </header>
                      {entry.rewards.length ? (
                        <RewardList rewards={entry.rewards} />
                      ) : (
                        <span className="no-pass-reward">{t('rewards.daily.noReward')}</span>
                      )}
                    </article>
                  )
                })}
              </div>
            </Card>
          ) : null}

          {data.pool.length > 0 && (
            <Card className="battle-pass-card daily-pool-card">
              <div className="progress-module-heading">
                <span><Dices aria-hidden="true" /></span>
                <div>
                  <span className="panel-eyebrow">{t('rewards.daily.poolEyebrow')}</span>
                  <h2>{t('rewards.daily.poolTitle')}</h2>
                </div>
              </div>
              <p className="muted">{t('rewards.daily.poolDescription')}</p>
              <div className="daily-pool">
                {data.pool.map((entry, index) => {
                  const chance = poolWeight ? (entry.weight / poolWeight) * 100 : 0
                  return (
                    <article className="daily-pool-entry" key={`${entry.name}-${index}`}>
                      <header>
                        <h3>{entry.name}</h3>
                        <span className="pass-chip">
                          {t('rewards.daily.chance', { percent: chance.toFixed(1) })}
                        </span>
                      </header>
                      <div className="progress-bar">
                        <i style={{ width: `${Math.min(100, chance)}%` }} />
                      </div>
                      <RewardList rewards={entry.rewards} />
                    </article>
                  )
                })}
              </div>
            </Card>
          )}

          <Card className="battle-pass-card pass-history">
            <div className="progress-module-heading">
              <span><History aria-hidden="true" /></span>
              <div>
                <span className="panel-eyebrow">{t('rewards.daily.historyEyebrow')}</span>
                <h2>{t('rewards.daily.historyTitle')}</h2>
              </div>
            </div>
            <RewardHistoryList history={data.history} />
          </Card>
        </>
      )}
    </div>
  )
}
