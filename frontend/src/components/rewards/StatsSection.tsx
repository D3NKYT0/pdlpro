import { Card } from '../ui/Card'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { gamesApi } from '../../services/api'
import { Empty, ErrorNotice, Loading } from '../programs/ProgramUI'

export function StatsSection() {
  const [game, setGame] = useState('roulette')
  const query = useQuery({
    queryKey: ['game-statistics', game],
    queryFn: () => gamesApi.stats(game),
  })
  return (
    <>
      <div className="program-tabs">
        {[
          ['roulette', 'Roleta'],
          ['dice', 'Dados'],
          ['slots', 'Slots'],
          ['fishing', 'Pesca'],
          ['economy', 'Economia'],
        ].map(([id, label]) => (
          <button
            className={game === id ? 'active' : ''}
            key={id}
            onClick={() => setGame(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <ErrorNotice error={query.error} />
      {query.isPending && <Loading />}
      {query.data && (
        <>
          <div className="program-grid">
            <Card as="div" className="program-stat">
              <small>Suas partidas</small>
              <strong>{query.data.plays}</strong>
            </Card>
            <Card as="div" className="program-stat">
              <small>Resultados positivos</small>
              <strong>{query.data.wins}</strong>
            </Card>
            <Card as="div" className="program-stat">
              <small>Taxa de sucesso</small>
              <strong>
                {query.data.plays
                  ? ((query.data.wins / query.data.plays) * 100).toFixed(1)
                  : '0'}
                %
              </strong>
            </Card>
          </div>
          <Card className="program-section">
            <h2>Ranking de desempenho</h2>
            <p className="muted">
              Jogadores com mais resultados positivos neste jogo; partidas como
              desempate.
            </p>
            {query.data.leaderboard.length ? (
              <div className="program-table-wrap">
                <table className="program-table">
                  <thead>
                    <tr>
                      <th>Posição</th>
                      <th>Jogador</th>
                      <th>Partidas</th>
                      <th>Resultados positivos</th>
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
              <Empty>A primeira partida começa este ranking.</Empty>
            )}
          </Card>
        </>
      )}
    </>
  )
}
