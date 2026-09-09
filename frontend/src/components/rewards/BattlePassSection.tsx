import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Crown } from 'lucide-react'
import { gamesApi } from '../../services/api'
import {
  Empty,
  ErrorNotice,
  Loading,
  Meter,
  RewardHistoryList,
  RewardList,
} from '../programs/ProgramUI'
import { useProgramAction } from '../programs/useProgramAction'

const BATTLE_PASS_KEYS = [['battle-pass'], ['battle-details']] as const

export function BattlePassSection() {
  const pass = useQuery({
    queryKey: ['battle-pass'],
    queryFn: gamesApi.battlePass,
  })
  const details = useQuery({
    queryKey: ['battle-details'],
    queryFn: gamesApi.battleDetails,
  })
  const action = useProgramAction()
  const [tab, setTab] = useState('quests')
  const data = details.data
  return (
    <>
      <ErrorNotice error={pass.error || details.error || action.error} />
      {(pass.isPending || details.isPending) && <Loading />}
      {pass.data && !pass.data.season ? (
        <Card className="program-section">
          <Empty>
            A próxima temporada está sendo preparada. Volte em breve.
          </Empty>
          <h2>Histórico de recompensas</h2>
          <RewardHistoryList history={data?.history || []} />
        </Card>
      ) : (
        pass.data?.season && (
          <>
            <Card className="program-section">
              <div className="program-section-heading">
                <div>
                  <span className="panel-eyebrow">Temporada ativa</span>
                  <h2>{pass.data.season.name}</h2>
                </div>
                <Crown color="var(--gold)" size={30} />
              </div>
              <div className="program-grid">
                <div className="program-stat">
                  <small>Nível do passe</small>
                  <strong>{pass.data.current_level}</strong>
                </div>
                <div className="program-stat">
                  <small>Experiência acumulada</small>
                  <strong>{pass.data.xp} XP</strong>
                </div>
                <div className="program-stat">
                  <small>Missões concluídas</small>
                  <strong>{data?.statistics.quests || 0}</strong>
                </div>
              </div>
              <div className="program-section-heading">
                <small className="muted">
                  Termina em{' '}
                  {new Date(pass.data.season.ends_at).toLocaleString('pt-BR')}
                </small>
                <div className="program-actions">
                  {pass.data.has_premium ? (
                    <span className="program-status status-approved">
                      Passe premium ativo
                    </span>
                  ) : (
                    <Button
                      type="submit"
                      disabled={action.busy}
                      onClick={() =>
                        void action.run(
                          gamesApi.buyBattlePassPremium,
                          'Passe premium ativado.',
                          BATTLE_PASS_KEYS,
                        )
                      }
                    >
                      <Crown size={17} />
                      Premium · {pass.data.season.premium_price} moedas
                    </Button>
                  )}
                </div>
              </div>
              <label className="program-check program-actions">
                <input
                  type="checkbox"
                  checked={data?.auto_claim || false}
                  disabled={action.busy}
                  onChange={(e) =>
                    void action.run(
                      () =>
                        gamesApi.battleAction(
                          'auto-claim',
                          undefined,
                          e.target.checked,
                        ),
                      'Preferência de resgate atualizada.',
                      BATTLE_PASS_KEYS,
                    )
                  }
                />
                Resgatar automaticamente os prêmios de nível desbloqueados
              </label>
            </Card>
            <div className="program-tabs">
              {[
                ['quests', 'Missões'],
                ['levels', 'Prêmios por nível'],
                ['exchanges', 'Trocas'],
                ['milestones', 'Marcos'],
                ['history', 'Histórico'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  className={tab === id ? 'active' : ''}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            {tab === 'quests' && (
              <div className="program-grid">
                {data?.quests.map((q) => (
                  <Card as="article" className="program-section" key={q.id}>
                    <div className="program-section-heading">
                      <h3>{q.name}</h3>
                      <span className="program-status">
                        {q.period === 'daily'
                          ? 'Diária'
                          : q.period === 'weekly'
                            ? 'Semanal'
                            : 'Temporada'}
                      </span>
                    </div>
                    <p className="muted">{q.description}</p>
                    <Meter
                      value={Math.min(q.current, q.target)}
                      max={q.target}
                    />
                    <small className="muted">
                      {Math.min(q.current, q.target)} / {q.target} · +{q.xp} XP
                    </small>
                    <Button
                      type="submit"
                      disabled={
                        action.busy || q.claimed || q.current < q.target
                      }
                      onClick={() =>
                        void action.run(
                          () => gamesApi.battleAction('quest', q.id),
                          'Experiência recebida.',
                          BATTLE_PASS_KEYS,
                        )
                      }
                    >
                      {q.claimed ? 'Missão resgatada' : 'Resgatar XP'}
                    </Button>
                  </Card>
                ))}
                {data?.quests.length === 0 && (
                  <Empty>Nenhuma missão publicada nesta temporada.</Empty>
                )}
              </div>
            )}
            {tab === 'levels' && (
              <div className="program-grid">
                {pass.data.levels.map((level) => (
                  <Card className="program-section" key={level.level}>
                    <h3>Nível {level.level}</h3>
                    <small className="muted">
                      {level.required_xp} XP necessários
                    </small>
                    {level.rewards.map((r) => (
                      <article className="program-item" key={r.id}>
                        <RewardList
                          rewards={[
                            {
                              kind: 'item',
                              name: r.item_name,
                              item_id: r.item_id,
                              quantity: r.quantity,
                            },
                          ]}
                        />
                        <small className="muted">
                          {r.is_premium ? 'Premium' : 'Gratuito'}
                        </small>
                        <Button
                          type="submit"
                          className="ghost"
                          disabled={
                            action.busy ||
                            r.claimed ||
                            !level.unlocked ||
                            r.locked_premium
                          }
                          onClick={() =>
                            void action.run(
                              () => gamesApi.claimBattlePass(r.id),
                              'Prêmio entregue na bag.',
                              BATTLE_PASS_KEYS,
                            )
                          }
                        >
                          {r.claimed
                            ? 'Resgatado'
                            : !level.unlocked
                              ? 'Nível bloqueado'
                              : r.locked_premium
                                ? 'Requer premium'
                                : 'Resgatar'}
                        </Button>
                      </article>
                    ))}
                  </Card>
                ))}
              </div>
            )}
            {tab === 'exchanges' && (
              <div className="program-grid">
                {data?.exchanges.map((e) => (
                  <Card as="article" className="program-section" key={e.id}>
                    <h3>{e.name}</h3>
                    <p className="muted">
                      Entregue {e.required_quantity} × item #
                      {e.required_item_id} +{e.required_enchant} da sua bag.
                    </p>
                    <small className="muted">
                      Você possui {e.owned} · Trocas {e.used} /{' '}
                      {e.limit || 'ilimitadas'}
                    </small>
                    <RewardList rewards={e.rewards} />
                    <Button
                      type="submit"
                      disabled={
                        action.busy ||
                        e.owned < e.required_quantity ||
                        (!!e.limit && e.used >= e.limit)
                      }
                      onClick={() =>
                        void action.run(
                          () => gamesApi.battleAction('exchange', e.id),
                          'Troca concluída.',
                          BATTLE_PASS_KEYS,
                        )
                      }
                    >
                      Trocar itens
                    </Button>
                  </Card>
                ))}
                {data?.exchanges.length === 0 && (
                  <Empty>Nenhuma troca disponível nesta temporada.</Empty>
                )}
              </div>
            )}
            {tab === 'milestones' && (
              <div className="program-grid">
                {data?.milestones.map((m) => (
                  <Card as="article" className="program-section" key={m.id}>
                    <h3>{m.name}</h3>
                    <Meter value={pass.data?.xp || 0} max={m.required_xp} />
                    <small className="muted">Meta: {m.required_xp} XP</small>
                    <RewardList rewards={m.rewards} />
                    <Button
                      type="submit"
                      disabled={
                        action.busy ||
                        m.claimed ||
                        (pass.data?.xp || 0) < m.required_xp
                      }
                      onClick={() =>
                        void action.run(
                          () => gamesApi.battleAction('milestone', m.id),
                          'Marco resgatado.',
                          BATTLE_PASS_KEYS,
                        )
                      }
                    >
                      {m.claimed ? 'Marco resgatado' : 'Resgatar marco'}
                    </Button>
                  </Card>
                ))}
                {data?.milestones.length === 0 && (
                  <Empty>Nenhum marco publicado nesta temporada.</Empty>
                )}
              </div>
            )}
            {tab === 'history' && (
              <Card className="program-section">
                <h2>Histórico de recompensas</h2>
                <div className="program-grid">
                  <div className="program-stat">
                    <small>Prêmios de nível</small>
                    <strong>{data?.statistics.rewards || 0}</strong>
                  </div>
                  <div className="program-stat">
                    <small>Trocas realizadas</small>
                    <strong>{data?.statistics.exchanges || 0}</strong>
                  </div>
                </div>
                <RewardHistoryList history={data?.history || []} />
              </Card>
            )}
          </>
        )
      )}
    </>
  )
}
