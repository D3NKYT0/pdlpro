import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { useQuery } from '@tanstack/react-query'
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
                  Uma nova recompensa a cada dia
                </span>
                <h2>{data.season?.name || 'Bônus diário'}</h2>
              </div>
              <Gift color="var(--gold)" size={30} />
            </div>
            <p className="muted">
              {data.season
                ? `Você está no dia ${data.season.current_day} da temporada. O prêmio muda conforme o calendário; os sorteios podem adicionar uma recompensa extra.`
                : `Receba ${fallback.data?.amount || '0'} moedas de saldo por dia.`}
            </p>
            <div className="program-actions">
              <Button
                type="submit"
                disabled={action.busy || data.claimed || !fallback.data?.active}
                onClick={() =>
                  void action.run(
                    gamesApi.claimDailyBonus,
                    'Recompensa diária recebida.',
                    [['daily-details'], ['daily-bonus']],
                  )
                }
              >
                <CheckCircle2 size={18} />
                {data.claimed
                  ? 'Recompensa de hoje resgatada'
                  : 'Resgatar recompensa de hoje'}
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
                  Dia {d.day}
                  {d.day === data.season?.current_day ? ' · Hoje' : ''}
                </h3>
                <RewardList rewards={d.rewards} />
              </article>
            ))}
          </div>
          {data.pool.length > 0 && (
            <Card className="program-section">
              <h2>Possíveis prêmios extras</h2>
              <p className="muted">
                Um conjunto é sorteado a cada resgate, de acordo com os pesos
                configurados.
              </p>
              <div className="program-grid">
                {data.pool.map((p, i) => (
                  <article className="program-item" key={i}>
                    <h3>{p.name}</h3>
                    <RewardList rewards={p.rewards} />
                    <small className="muted">
                      Chance:{' '}
                      {(
                        (p.weight /
                          data.pool.reduce((s, r) => s + r.weight, 0)) *
                        100
                      ).toFixed(1)}
                      %
                    </small>
                  </article>
                ))}
              </div>
            </Card>
          )}
          <Card className="program-section">
            <h2>Histórico de bônus</h2>
            <RewardHistoryList history={data.history} />
          </Card>
        </>
      )}
    </>
  )
}
