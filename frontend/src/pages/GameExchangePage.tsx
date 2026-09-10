import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeftRight, ShieldCheck, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import {
  commerceApi,
  lineageApi,
  type ExchangeRequest,
} from "../services/api";
import {
  Empty,
  ErrorNotice,
  Loading,
  Status,
} from "../components/programs/ProgramUI";
import { useProgramAction } from "../components/programs/useProgramAction";
import { formatDateTime } from "../lib/formatters";

export function GameExchangePage() {
  const { t } = useTranslation("panel");
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
      <Card as="header" className="program-hero">
        <div>
          <Link to="/panel/wallet" className="character-back">
            ← {t("exchange.back")}
          </Link>
          <span className="panel-eyebrow">{t("exchange.eyebrow")}</span>
          <h1>{t("exchange.title")}</h1>
          <p>{t("exchange.description")}</p>
        </div>
        <ArrowLeftRight />
      </Card>
      <ErrorNotice
        error={query.error || accounts.error || chars.error || action.error}
      />
      {query.isPending && <Loading />}
      <div className="program-two">
        <Card className="program-section">
          <h2>{t("exchange.form.title")}</h2>
          {query.data && !query.data.enabled && (
            <p className="program-note">
              {query.data.unavailable_reason ||
                t("exchange.form.unavailableReason")}{" "}
              {t("exchange.form.unavailableHint")}
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
                    r.message || t("exchange.toast.pending"),
                  );
                pending.current = null;
                setConfirmation(false);
              }, t("exchange.toast.completed"), [["game-exchange"], ["wallet"]]);
            }}
          >
            <label>
              {t("exchange.form.operation")}
              <select
                value={direction}
                onChange={(e) => {
                  reset();
                  setDirection(e.target.value);
                }}
              >
                <option value="to_game">{t("exchange.form.toGame")}</option>
                <option value="from_game">{t("exchange.form.fromGame")}</option>
              </select>
            </label>
            <label>
              {t("exchange.form.account")}
              <select
                required
                value={login}
                onChange={(e) => {
                  reset();
                  setLogin(e.target.value);
                  setCharId("");
                }}
              >
                <option value="">{t("exchange.form.selectAccount")}</option>
                {accounts.data?.accounts.map((a) => (
                  <option key={a.login} value={a.login}>
                    {a.login}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("exchange.form.character")}
              <select
                required
                value={charId}
                onChange={(e) => {
                  reset();
                  setCharId(e.target.value);
                }}
              >
                <option value="">{t("exchange.form.selectCharacter")}</option>
                {chars.data?.map((c) => (
                  <option disabled={c.online} key={c.char_id} value={c.char_id}>
                    {c.name}
                    {c.online ? t("exchange.form.onlineSuffix") : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("exchange.form.quantity")}
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
                {t("exchange.form.confirmation", {
                  quantity,
                  preposition: direction === "to_game"
                    ? t("exchange.form.prepositionTo")
                    : t("exchange.form.prepositionFrom"),
                  character: chars.data?.find((c) => c.char_id === Number(charId))?.name,
                  operation: direction === "to_game"
                    ? t("exchange.form.operationDebit")
                    : t("exchange.form.operationCredit"),
                  amount: (gross - fee).toFixed(2),
                })}
              </p>
            )}
            <Button type="submit"

              disabled={action.busy || !query.data?.enabled || !coin}
            >
              {action.busy
                ? t("exchange.form.processing")
                : confirmation
                  ? t("exchange.form.confirm")
                  : t("exchange.form.review")}
            </Button>
          </form>
        </Card>
        <Card className="program-section">
          <div className="program-section-heading">
            <h2>{t("exchange.summary.title")}</h2>
            <ShieldCheck color="var(--gold)" />
          </div>
          <div className="program-stat">
            <small>
              {direction === "to_game"
                ? t("exchange.summary.debit")
                : t("exchange.summary.credit")}
            </small>
            <strong>
              {Number.isFinite(gross) ? (gross - fee).toFixed(2) : "0.00"}
            </strong>
          </div>
          <p className="muted">
            {t("exchange.summary.coin", {
              name: coin?.name || t("exchange.summary.coinUnset"),
              id: coin?.item_id || "—",
            })}
          </p>
          <p className="muted">
            {t("exchange.summary.rate", { multiplier: coin?.multiplier || "—" })}
          </p>
          <p className="muted">
            {t("exchange.summary.fee", {
              percent: coin?.withdraw_fee_percent || "0",
              fee: fee.toFixed(2),
            })}
          </p>
          <p className="program-note">{t("exchange.summary.note")}</p>
        </Card>
      </div>
      <Card className="program-section">
        <h2>{t("exchange.history.title")}</h2>
        {query.data?.history.length ? (
          <div className="program-table-wrap">
            <table className="program-table">
              <thead>
                <tr>
                  <th>{t("exchange.history.date")}</th>
                  <th>{t("exchange.history.character")}</th>
                  <th>{t("exchange.history.operation")}</th>
                  <th>{t("exchange.history.quantity")}</th>
                  <th>{t("exchange.history.balance")}</th>
                  <th>{t("exchange.history.status")}</th>
                  <th>{t("exchange.history.action")}</th>
                </tr>
              </thead>
              <tbody>
                {query.data.history.map((r) => (
                  <tr key={r.id}>
                    <td>{formatDateTime(r.created_at)}</td>
                    <td>{r.character_name}</td>
                    <td>
                      {r.direction === "to_game"
                        ? t("exchange.history.toGame")
                        : t("exchange.history.fromGame")}
                    </td>
                    <td>{r.quantity}</td>
                    <td>{r.amount}</td>
                    <td>
                      <Status value={r.status} />
                    </td>
                    <td>
                      {r.status === "pending" && (
                        <Button type="submit"
                          className="ghost"
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
                            }, t("exchange.toast.completed"), [["game-exchange"], ["wallet"]])
                          }
                        >
                          <RefreshCw size={14} />
                          {t("exchange.history.resume")}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>{t("exchange.history.empty")}</Empty>
        )}
      </Card>
    </div>
  );
}
