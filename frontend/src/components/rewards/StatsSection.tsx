import { Card } from '../ui/Card'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { gamesApi } from '../../services/api'
import { Empty, ErrorNotice, Loading } from '../programs/ProgramUI'

const STAT_GAMES = ['roulette', 'dice', 'slots', 'fishing', 'economy'] as const

export function StatsSection() {
  const { t } = useTranslation('panel')
  const [game, setGame] = useState<string>('roulette')
  const query = useQuery({
    queryKey: ['game-statistics', game],
    queryFn: () => gamesApi.stats(game),
  })
  return (
    <>
      <div className="program-tabs">
        {STAT_GAMES.map((id) => (
          <button
            className={game === id ? 'active' : ''}
            key={id}
            onClick={() => setGame(id)}
          >
            {t(`rewards.stats.games.${id}`)}
          </button>
        ))}
      </div>
      <ErrorNotice error={query.error} />
      {query.isPending && <Loading />}
      {query.data && (
        <>
          <div className="program-grid">
            <Card as="div" className="program-stat">
              <small>{t('rewards.stats.plays')}</small>
              <strong>{query.data.plays}</strong>
            </Card>
            <Card as="div" className="program-stat">
              <small>{t('rewards.stats.wins')}</small>
              <strong>{query.data.wins}</strong>
            </Card>
            <Card as="div" className="program-stat">
              <small>{t('rewards.stats.successRate')}</small>
              <strong>
                {query.data.plays
                  ? ((query.data.wins / query.data.plays) * 100).toFixed(1)
                  : '0'}
                %
              </strong>
            </Card>
          </div>
          <Card className="program-section">
            <h2>{t('rewards.stats.rankingTitle')}</h2>
            <p className="muted">{t('rewards.stats.rankingDescription')}</p>
            {query.data.leaderboard.length ? (
              <div className="program-table-wrap">
                <table className="program-table">
                  <thead>
                    <tr>
                      <th>{t('rewards.stats.position')}</th>
                      <th>{t('rewards.stats.player')}</th>
                      <th>{t('rewards.stats.rounds')}</th>
                      <th>{t('rewards.stats.wins')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {query.data.leaderboard.map((r, i) => (
                      <tr key={r.username}>
                        <td>{i + 1}</td>
                        <td>{r.username}</td>
                        <td>{r.score}</td>
                        <td>{r.wins}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>{t('rewards.stats.empty')}</Empty>
            )}
          </Card>
        </>
      )}
    </>
  )
}
