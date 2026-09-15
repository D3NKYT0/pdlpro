import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { BarChart3, Cherry, Dices, Fish, RotateCw, Sword, Trophy, type LucideIcon } from 'lucide-react'
import { Card } from '../ui/Card'
import { Tabs } from '../ui/Tabs'
import { gamesApi } from '../../services/api'
import { Empty, ErrorNotice, Loading } from '../programs/ProgramUI'

type StatGame = 'roulette' | 'dice' | 'slots' | 'fishing' | 'economy'

const STAT_GAMES: Array<{ id: StatGame; icon: LucideIcon }> = [
  { id: 'roulette', icon: RotateCw },
  { id: 'dice', icon: Dices },
  { id: 'slots', icon: Cherry },
  { id: 'fishing', icon: Fish },
  { id: 'economy', icon: Sword },
]

export function StatsSection() {
  const { t } = useTranslation('panel')
  const [game, setGame] = useState<StatGame>('roulette')
  const query = useQuery({
    queryKey: ['game-statistics', game],
    queryFn: () => gamesApi.stats(game),
  })
  const successRate = query.data?.plays
    ? (query.data.wins / query.data.plays) * 100
    : 0
  return (
    <div className="stats-layout">
      <Tabs
        id="stats"
        label={t('rewards.stats.tabsLabel')}
        className="game-tabs stats-tabs"
        value={game}
        onChange={setGame}
        items={STAT_GAMES.map(({ id, icon: Icon }) => ({
          id,
          label: t(`rewards.stats.games.${id}`),
          icon: <Icon aria-hidden="true" />,
        }))}
      />
      <div
        className="stats-tab-content"
        id={`stats-panel-${game}`}
        role="tabpanel"
        aria-labelledby={`stats-tab-${game}`}
      >
        <ErrorNotice error={query.error} />
        {query.isPending && <Loading />}
        {query.data && (
          <>
            <Card className="battle-pass-card stats-overview-card">
              <header className="stats-overview-banner">
                <div className="progress-module-heading">
                  <span><BarChart3 aria-hidden="true" /></span>
                  <div>
                    <span className="panel-eyebrow">{t('rewards.stats.overviewEyebrow')}</span>
                    <h2>{t('rewards.stats.overviewTitle', { game: t(`rewards.stats.games.${game}`) })}</h2>
                  </div>
                </div>
                <div className="stats-rate-seal">
                  <span>{t('rewards.stats.successRate')}</span>
                  <strong>{successRate.toFixed(1)}%</strong>
                </div>
              </header>
              <div className="battle-pass-overview">
                <div>
                  <RotateCw aria-hidden="true" />
                  <span>{t('rewards.stats.plays')}</span>
                  <strong>{query.data.plays}</strong>
                </div>
                <div>
                  <Trophy aria-hidden="true" />
                  <span>{t('rewards.stats.wins')}</span>
                  <strong>{query.data.wins}</strong>
                </div>
                <div>
                  <BarChart3 aria-hidden="true" />
                  <span>{t('rewards.stats.successRate')}</span>
                  <strong>{successRate.toFixed(1)}%</strong>
                </div>
              </div>
              <div className="battle-pass-progress">
                <div className="progress-labels">
                  <span>{t('rewards.stats.successRate')}</span>
                  <span>{successRate.toFixed(1)}%</span>
                </div>
                <div
                  className="progress-bar"
                  role="progressbar"
                  aria-label={t('rewards.stats.successRate')}
                  aria-valuenow={Math.round(successRate)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <i style={{ width: `${Math.min(100, successRate)}%` }} />
                </div>
              </div>
            </Card>

            <Card className="battle-pass-card stats-ranking-card">
              <div className="progress-module-heading">
                <span><Trophy aria-hidden="true" /></span>
                <div>
                  <span className="panel-eyebrow">{t('rewards.stats.rankingEyebrow')}</span>
                  <h2>{t('rewards.stats.rankingTitle')}</h2>
                </div>
              </div>
              <p className="muted">{t('rewards.stats.rankingDescription')}</p>
              {query.data.leaderboard.length ? (
                <div className="stats-table-wrap">
                  <table className="table stats-table" aria-label={t('rewards.stats.rankingTitle')}>
                    <thead>
                      <tr>
                        <th>{t('rewards.stats.position')}</th>
                        <th>{t('rewards.stats.player')}</th>
                        <th>{t('rewards.stats.rounds')}</th>
                        <th>{t('rewards.stats.wins')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {query.data.leaderboard.map((row, index) => (
                        <tr className={index < 3 ? `is-podium is-podium-${index + 1}` : undefined} key={row.username}>
                          <td><span className="stats-rank">{index + 1}</span></td>
                          <td>{row.username}</td>
                          <td>{row.score}</td>
                          <td>{row.wins}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty icon={<Trophy aria-hidden="true" />}>{t('rewards.stats.empty')}</Empty>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
