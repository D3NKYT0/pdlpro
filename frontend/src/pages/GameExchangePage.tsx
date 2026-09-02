import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, ShieldCheck, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import {
  commerceApi,
  type ExchangeRequest,
} from "../services/domain/commerce.service";
import { lineageApi } from "../services/domain/lineage.service";
import {
  Empty,
  ErrorNotice,
  Loading,
  Status,
} from "../components/programs/ProgramUI";
import { useProgramAction } from "../components/programs/useProgramAction";

export function GameExchangePage() {
  const query = useQuery({
    queryKey: ["game-exchange"],
    queryFn: commerceApi.exchangeState,
  });
  const accounts = useQuery({
    queryKey: ["lineage-accounts"],
    queryFn: lineageApi.accounts,
  });
  const [login, setLogin] = useState("");
  const chars = useQuery({
    queryKey: ["exchange-characters", login],
    queryFn: () => lineageApi.characters(login),
    enabled: !!login,
  });
  const [charId, setCharId] = useState("");
  const [direction, setDirection] = useState("to_game");
  const [quantity, setQuantity] = useState(1);
  const [confirmation, setConfirmation] = useState(false);
  const pending = useRef<ExchangeRequest | null>(null);
  const action = useProgramAction();
  const coin = query.data?.coin;
  const gross = quantity / Number(coin?.multiplier || 1);
  const fee =
    direction === "from_game"
      ? Math.floor(gross * Number(coin?.withdraw_fee_percent || 0)) / 100
      : 0;
  const reset = () => {
    setConfirmation(false);
    pending.current = null;
  };
  return (
    <div className="program-page">
      <header className="card program-hero">
        <div>
          <Link to="/painel/wallet" className="character-back">
            ← Voltar à carteira
          </Link>
          <span className="panel-eyebrow">Sua economia, conectada</span>
          <h1>Carteira ↔ jogo</h1>
          <p>
            Envie moedas ao personagem ou converta moedas do jogo em saldo. O
            personagem precisa estar offline.
          </p>
        </div>
        <ArrowLeftRight />
      </header>
      <ErrorNotice
        error={query.error || accounts.error || chars.error || action.error}
      />
      {query.isPending && <Loading />}
      <div className="program-two">
        <section className="card program-section">
          <h2>Nova transferência</h2>
          {query.data && !query.data.enabled && (
            <p className="program-note">
              {query.data.unavailable_reason || "A integração do jogo está indisponível."} A transferência ficará
              disponível quando a integração estiver pronta.
            </p>
          )}
          <form
            className="program-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!confirmation) {
                setConfirmation(true);
                return;
              }
              pending.current ||= {
                request_key: crypto.randomUUID(),
                direction,
                login,
                character_id: Number(charId),
                quantity,
              };
              void action.run(async () => {
                const r = await commerceApi.exchange(pending.current!);
                if (r.status !== "completed")
                  throw new Error(
                    r.message ||
                      "Transferência pendente. Use Retomar no histórico.",
                  );
                pending.current = null;
                setConfirmation(false);
              }, "Transferência concluída.");
            }}
          >
            <label>
              Operação
              <select
                value={direction}
                onChange={(e) => {
                  reset();
                  setDirection(e.target.value);
                }}
              >
                <option value="to_game">Enviar saldo ao jogo</option>
                <option value="from_game">Trazer moedas do jogo</option>
              </select>
            </label>
            <label>
              Conta Lineage
              <select
                required
                value={login}
                onChange={(e) => {
                  reset();
                  setLogin(e.target.value);
                  setCharId("");
                }}
              >
                <option value="">Selecione sua conta</option>
                {accounts.data?.accounts.map((a) => (
                  <option key={a.login} value={a.login}>
                    {a.login}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Personagem
              <select
                required
                value={charId}
                onChange={(e) => {
                  reset();
                  setCharId(e.target.value);
                }}
              >
                <option value="">Selecione o personagem</option>
                {chars.data?.map((c) => (
                  <option disabled={c.online} key={c.char_id} value={c.char_id}>
                    {c.name}
                    {c.online ? " · Online" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Quantidade de moedas no jogo
              <input
                type="number"
                required
                min={1}
                max={1000000000}
                value={quantity}
                onChange={(e) => {
                  reset();
                  setQuantity(Number(e.target.value));
                }}
              />
            </label>
            {confirmation && (
              <p className="program-note">
                Confirme a transferência de {quantity} moedas{" "}
                {direction === "to_game" ? "para" : "de"}{" "}
                {chars.data?.find((c) => c.char_id === Number(charId))?.name}.{" "}
                {direction === "to_game" ? "Débito" : "Crédito"} de{" "}
                {(gross - fee).toFixed(2)} no saldo.
              </p>
            )}
            <button
              className="btn"
              disabled={action.busy || !query.data?.enabled || !coin}
            >
              {action.busy
                ? "Processando…"
                : confirmation
                  ? "Confirmar transferência"
                  : "Revisar transferência"}
            </button>
          </form>
        </section>
        <section className="card program-section">
          <div className="program-section-heading">
            <h2>Resumo da conversão</h2>
            <ShieldCheck color="var(--gold)" />
          </div>
          <div className="program-stat">
            <small>
              {direction === "to_game" ? "Saldo a debitar" : "Saldo a receber"}
            </small>
            <strong>
              {Number.isFinite(gross) ? (gross - fee).toFixed(2) : "0.00"}
            </strong>
          </div>
          <p className="muted">
            Moeda: {coin?.name || "Não configurada"} · ID {coin?.item_id || "—"}
          </p>
          <p className="muted">
            1 moeda de saldo = {coin?.multiplier || "—"} unidade(s) no jogo.
          </p>
          <p className="muted">
            Taxa de retirada: {coin?.withdraw_fee_percent || "0"}%. Nesta
            operação: {fee.toFixed(2)}.
          </p>
          <p className="program-note">
            Saldo bônus não é transferível. Envios ao jogo usam a fila de
            entrega do servidor. Em caso de falha de conexão, retome a operação
            pendente no histórico.
          </p>
        </section>
      </div>
      <section className="card program-section">
        <h2>Histórico de transferências</h2>
        {query.data?.history.length ? (
          <div className="program-table-wrap">
            <table className="program-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Personagem</th>
                  <th>Operação</th>
                  <th>Quantidade</th>
                  <th>Saldo</th>
                  <th>Status</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {query.data.history.map((r) => (
                  <tr key={r.id}>
                    <td>{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                    <td>{r.character_name}</td>
                    <td>
                      {r.direction === "to_game" ? "Para o jogo" : "Do jogo"}
                    </td>
                    <td>{r.quantity}</td>
                    <td>{r.amount}</td>
                    <td>
                      <Status value={r.status} />
                    </td>
                    <td>
                      {r.status === "pending" && (
                        <button
                          className="btn ghost"
                          disabled={action.busy}
                          onClick={() =>
                            void action.run(async () => {
                              const result = await commerceApi.exchange({
                                request_key: r.request_key,
                                direction: r.direction,
                                login: r.login,
                                character_id: r.character_id,
                                quantity: r.quantity,
                              });
                              if (result.status !== "completed")
                                throw new Error(result.message);
                            }, "Transferência concluída.")
                          }
                        >
                          <RefreshCw size={14} />
                          Retomar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>
            Você ainda não realizou transferências entre a carteira e o jogo.
          </Empty>
        )}
      </section>
    </div>
  );
}
