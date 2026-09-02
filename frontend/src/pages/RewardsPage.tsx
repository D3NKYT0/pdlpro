import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate, useSearchParams } from "react-router-dom";
import { Crown, Gift, CheckCircle2 } from "lucide-react";
import { gamesApi } from "../services/api";
import { programsApi } from "../services/domain/programs.service";
import {
  Empty,
  ErrorNotice,
  Loading,
  Meter,
  RewardHistoryList,
  RewardList,
} from "../components/programs/ProgramUI";
import { useProgramAction } from "../components/programs/useProgramAction";
import { ResourceGate } from "../components/programs/ResourceGate";
import { ProgramHeader } from "../components/programs/ProgramHeader";

export function RewardsPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "battle";
  if (tab === "fishing") return <Navigate to="/painel/games?tab=fishing" replace />;
  return (
    <div className="program-page">
      <ProgramHeader
        eyebrow="Cada conquista importa"
        title="Jornada e recompensas"
        description="Cumpra missões, descubra novos prêmios e acompanhe sua evolução no servidor."
      />
      <div className="program-tabs">
        {[
          ["battle", "Passe de batalha"],
          ["daily", "Bônus diário"],
          ["statistics", "Rankings e estatísticas"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setParams({ tab: id })}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "battle" ? (
        <ResourceGate code="battle-pass">
          <BattleJourney />
        </ResourceGate>
      ) : tab === "daily" ? (
        <ResourceGate code="daily-bonus">
          <DailyJourney />
        </ResourceGate>
      ) : (
        <GameStatistics />
      )}
    </div>
  );
}

function BattleJourney() {
  const pass = useQuery({
    queryKey: ["battle-pass"],
    queryFn: gamesApi.battlePass,
  });
  const details = useQuery({
    queryKey: ["battle-details"],
    queryFn: programsApi.battle,
  });
  const action = useProgramAction();
  const [tab, setTab] = useState("quests");
  const data = details.data;
  return (
    <>
      <ErrorNotice error={pass.error || details.error || action.error} />
      {(pass.isPending || details.isPending) && <Loading />}
      {pass.data && !pass.data.season ? (
        <section className="card program-section">
          <Empty>
            A próxima temporada está sendo preparada. Volte em breve.
          </Empty>
          <h2>Histórico de recompensas</h2>
          <RewardHistoryList history={data?.history || []} />
        </section>
      ) : (
        pass.data?.season && (
          <>
            <section className="card program-section">
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
                  Termina em{" "}
                  {new Date(pass.data.season.ends_at).toLocaleString("pt-BR")}
                </small>
                <div className="program-actions">
                  {pass.data.has_premium ? (
                    <span className="program-status status-approved">
                      Passe premium ativo
                    </span>
                  ) : (
                    <button
                      className="btn"
                      disabled={action.busy}
                      onClick={() =>
                        void action.run(
                          gamesApi.buyBattlePassPremium,
                          "Passe premium ativado.",
                        )
                      }
                    >
                      <Crown size={17} />
                      Premium · {pass.data.season.premium_price} moedas
                    </button>
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
                        programsApi.battleAction(
                          "auto-claim",
                          undefined,
                          e.target.checked,
                        ),
                      "Preferência de resgate atualizada.",
                    )
                  }
                />
                Resgatar automaticamente os prêmios de nível desbloqueados
              </label>
            </section>
            <div className="program-tabs">
              {[
                ["quests", "Missões"],
                ["levels", "Prêmios por nível"],
                ["exchanges", "Trocas"],
                ["milestones", "Marcos"],
                ["history", "Histórico"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  className={tab === id ? "active" : ""}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            {tab === "quests" && (
              <div className="program-grid">
                {data?.quests.map((q) => (
                  <article className="card program-section" key={q.id}>
                    <div className="program-section-heading">
                      <h3>{q.name}</h3>
                      <span className="program-status">
                        {q.period === "daily"
                          ? "Diária"
                          : q.period === "weekly"
                            ? "Semanal"
                            : "Temporada"}
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
                    <button
                      className="btn"
                      disabled={
                        action.busy || q.claimed || q.current < q.target
                      }
                      onClick={() =>
                        void action.run(
                          () => programsApi.battleAction("quest", q.id),
                          "Experiência recebida.",
                        )
                      }
                    >
                      {q.claimed ? "Missão resgatada" : "Resgatar XP"}
                    </button>
                  </article>
                ))}
                {data?.quests.length === 0 && (
                  <Empty>Nenhuma missão publicada nesta temporada.</Empty>
                )}
              </div>
            )}
            {tab === "levels" && (
              <div className="program-grid">
                {pass.data.levels.map((level) => (
                  <section className="card program-section" key={level.level}>
                    <h3>Nível {level.level}</h3>
                    <small className="muted">
                      {level.required_xp} XP necessários
                    </small>
                    {level.rewards.map((r) => (
                      <article className="program-item" key={r.id}>
                        <RewardList
                          rewards={[
                            {
                              kind: "item",
                              name: r.item_name,
                              item_id: r.item_id,
                              quantity: r.quantity,
                            },
                          ]}
                        />
                        <small className="muted">
                          {r.is_premium ? "Premium" : "Gratuito"}
                        </small>
                        <button
                          className="btn ghost"
                          disabled={
                            action.busy ||
                            r.claimed ||
                            !level.unlocked ||
                            r.locked_premium
                          }
                          onClick={() =>
                            void action.run(
                              () => gamesApi.claimBattlePass(r.id),
                              "Prêmio entregue na bag.",
                            )
                          }
                        >
                          {r.claimed
                            ? "Resgatado"
                            : !level.unlocked
                              ? "Nível bloqueado"
                              : r.locked_premium
                                ? "Requer premium"
                                : "Resgatar"}
                        </button>
                      </article>
                    ))}
                  </section>
                ))}
              </div>
            )}
            {tab === "exchanges" && (
              <div className="program-grid">
                {data?.exchanges.map((e) => (
                  <article className="card program-section" key={e.id}>
                    <h3>{e.name}</h3>
                    <p className="muted">
                      Entregue {e.required_quantity} × item #
                      {e.required_item_id} +{e.required_enchant} da sua bag.
                    </p>
                    <small className="muted">
                      Você possui {e.owned} · Trocas {e.used} /{" "}
                      {e.limit || "ilimitadas"}
                    </small>
                    <RewardList rewards={e.rewards} />
                    <button
                      className="btn"
                      disabled={
                        action.busy ||
                        e.owned < e.required_quantity ||
                        (!!e.limit && e.used >= e.limit)
                      }
                      onClick={() =>
                        void action.run(
                          () => programsApi.battleAction("exchange", e.id),
                          "Troca concluída.",
                        )
                      }
                    >
                      Trocar itens
                    </button>
                  </article>
                ))}
                {data?.exchanges.length === 0 && (
                  <Empty>Nenhuma troca disponível nesta temporada.</Empty>
                )}
              </div>
            )}
            {tab === "milestones" && (
              <div className="program-grid">
                {data?.milestones.map((m) => (
                  <article className="card program-section" key={m.id}>
                    <h3>{m.name}</h3>
                    <Meter value={pass.data?.xp || 0} max={m.required_xp} />
                    <small className="muted">Meta: {m.required_xp} XP</small>
                    <RewardList rewards={m.rewards} />
                    <button
                      className="btn"
                      disabled={
                        action.busy ||
                        m.claimed ||
                        (pass.data?.xp || 0) < m.required_xp
                      }
                      onClick={() =>
                        void action.run(
                          () => programsApi.battleAction("milestone", m.id),
                          "Marco resgatado.",
                        )
                      }
                    >
                      {m.claimed ? "Marco resgatado" : "Resgatar marco"}
                    </button>
                  </article>
                ))}
                {data?.milestones.length === 0 && (
                  <Empty>Nenhum marco publicado nesta temporada.</Empty>
                )}
              </div>
            )}
            {tab === "history" && (
              <section className="card program-section">
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
              </section>
            )}
          </>
        )
      )}
    </>
  );
}

function DailyJourney() {
  const query = useQuery({
    queryKey: ["daily-details"],
    queryFn: programsApi.daily,
  });
  const fallback = useQuery({
    queryKey: ["daily-bonus"],
    queryFn: gamesApi.dailyBonus,
  });
  const action = useProgramAction();
  const data = query.data;
  return (
    <>
      <ErrorNotice error={query.error || fallback.error || action.error} />
      {query.isPending && <Loading />}
      {data && (
        <>
          <section className="card program-section">
            <div className="program-section-heading">
              <div>
                <span className="panel-eyebrow">
                  Uma nova recompensa a cada dia
                </span>
                <h2>{data.season?.name || "Bônus diário"}</h2>
              </div>
              <Gift color="var(--gold)" size={30} />
            </div>
            <p className="muted">
              {data.season
                ? `Você está no dia ${data.season.current_day} da temporada. O prêmio muda conforme o calendário; os sorteios podem adicionar uma recompensa extra.`
                : `Receba ${fallback.data?.amount || "0"} moedas de saldo por dia.`}
            </p>
            <div className="program-actions">
              <button
                className="btn"
                disabled={action.busy || data.claimed || !fallback.data?.active}
                onClick={() =>
                  void action.run(
                    gamesApi.claimDailyBonus,
                    "Recompensa diária recebida.",
                  )
                }
              >
                <CheckCircle2 size={18} />
                {data.claimed
                  ? "Recompensa de hoje resgatada"
                  : "Resgatar recompensa de hoje"}
              </button>
            </div>
          </section>
          <div className="program-grid">
            {data.days.map((d) => (
              <article
                key={d.day}
                className={`card program-section program-day ${d.day === data.season?.current_day ? "is-today" : ""} ${d.day > (data.season?.current_day || 0) ? "is-locked" : ""}`}
              >
                <h3>
                  Dia {d.day}
                  {d.day === data.season?.current_day ? " · Hoje" : ""}
                </h3>
                <RewardList rewards={d.rewards} />
              </article>
            ))}
          </div>
          {data.pool.length > 0 && (
            <section className="card program-section">
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
                      Chance:{" "}
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
            </section>
          )}
          <section className="card program-section">
            <h2>Histórico de bônus</h2>
            <RewardHistoryList history={data.history} />
          </section>
        </>
      )}
    </>
  );
}

function GameStatistics() {
  const [game, setGame] = useState("roulette");
  const query = useQuery({
    queryKey: ["game-statistics", game],
    queryFn: () => programsApi.stats(game),
  });
  return (
    <>
      <div className="program-tabs">
        {[
          ["roulette", "Roleta"],
          ["dice", "Dados"],
          ["slots", "Slots"],
          ["fishing", "Pesca"],
          ["economy", "Economia"],
        ].map(([id, label]) => (
          <button
            className={game === id ? "active" : ""}
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
            <div className="card program-stat">
              <small>Suas partidas</small>
              <strong>{query.data.plays}</strong>
            </div>
            <div className="card program-stat">
              <small>Resultados positivos</small>
              <strong>{query.data.wins}</strong>
            </div>
            <div className="card program-stat">
              <small>Taxa de sucesso</small>
              <strong>
                {query.data.plays
                  ? ((query.data.wins / query.data.plays) * 100).toFixed(1)
                  : "0"}
                %
              </strong>
            </div>
          </div>
          <section className="card program-section">
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
          </section>
        </>
      )}
    </>
  );
}
