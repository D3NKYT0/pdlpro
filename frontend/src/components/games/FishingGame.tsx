import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Fish } from "lucide-react";
import { gamesApi } from "../../services/api";
import { programsApi } from "../../services/domain/programs.service";
import { Empty, ErrorNotice, Loading } from "../programs/ProgramUI";
import { useProgramAction } from "../programs/useProgramAction";

export function FishingGame() {
  const query = useQuery({
    queryKey: ["fishing-details"],
    queryFn: programsApi.fishing,
  });
  const fishing = useQuery({
    queryKey: ["fishing"],
    queryFn: gamesApi.fishing,
  });
  const action = useProgramAction();
  const [bait, setBait] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [result, setResult] = useState("");
  const selectedBait = query.data?.baits.find((b) => b.id === bait && b.quantity > 0);
  const canCast = !!fishing.data?.active && !fishing.isError && !query.isError && !query.isPending && (fishing.data?.fichas ?? 0) >= (fishing.data?.cost ?? 1);
  const validQuantity = Number.isInteger(quantity) && quantity >= 1 && quantity <= 999;
  return (
    <div className="program-page fishing-game">
      <ErrorNotice error={query.error || fishing.error || action.error} />
      {(query.isPending || fishing.isPending) && <Loading />}
      <div className="program-two">
        <Card className="program-section">
          <div>
            <span className="panel-eyebrow">Lago do reino</span>
            <h2>Pesca</h2>
          </div>
          <div className="program-grid">
            <div className="program-stat">
              <small>Vara de pesca</small>
              <strong>Nível {fishing.data?.rod.level || 1}</strong>
            </div>
            <div className="program-stat">
              <small>Experiência</small>
              <strong>{fishing.data?.rod.xp ?? 0} XP</strong>
            </div>
            <div className="program-stat">
              <small>Fichas disponíveis</small>
              <strong>{fishing.data?.fichas || 0}</strong>
            </div>
          </div>
          <form
            className="program-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!canCast || action.busy) return;
              void action.run(async () => {
                const r = await gamesApi.cast(selectedBait?.id);
                if (selectedBait?.quantity === 1) setBait("");
                setResult(
                  r.success
                    ? `Você pescou ${r.fish?.name}!`
                    : "O peixe escapou. Tente novamente.",
                );
              }, "Lançamento concluído.");
            }}
          >
            <label>
              Isca
              <select value={selectedBait?.id ?? ""} disabled={action.busy} onChange={(e) => setBait(e.target.value)}>
                <option value="">Sem isca especial</option>
                {query.data?.baits
                  .filter((b) => b.quantity > 0)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} · {b.quantity} no estoque · +{b.success_bonus}%
                    </option>
                  ))}
              </select>
            </label>
            <small className="muted">
              Cada lançamento custa {fishing.data?.cost || 1} ficha(s). A isca
              selecionada é consumida mesmo quando o peixe escapa.
            </small>
            <Button type="submit"
              className="fishing-cast-button"
              disabled={action.busy || !canCast}
            >
              {action.busy ? "Aguarde…" : "Lançar a linha"}
            </Button>
          </form>
          {fishing.data && !fishing.data.active && <p className="muted">A pescaria está temporariamente indisponível.</p>}
          {fishing.data?.active && fishing.data.fichas < fishing.data.cost && <p className="muted">Fichas insuficientes para lançar a linha. Compre fichas na aba Roleta.</p>}
          {result && (
            <p className="program-note" role="status">
              {result}
            </p>
          )}
        </Card>
        <Card className="program-section">
          <h2>Loja de iscas</h2>
          <label className="program-form">
            Quantidade por compra
            <input
              type="number"
              step={1}
              min={1}
              max={999}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </label>
          {query.data?.baits.map((b) => (
            <article className="program-item" key={b.id}>
              <h3>{b.name}</h3>
              <p>{b.description}</p>
              <small>
                +{b.success_bonus} pontos de chance · Estoque: {b.quantity}
              </small>
              <Button type="submit"
                className="ghost"
                disabled={action.busy || !validQuantity || !fishing.data || query.isError || fishing.isError || fishing.data.fichas < b.price * quantity}
                onClick={() =>
                  void action.run(
                    () => programsApi.buyBait(b.id, quantity),
                    "Iscas adicionadas ao estoque.",
                  )
                }
              >
                Comprar · {b.price * quantity} fichas
              </Button>
            </article>
          ))}
          {query.data?.baits.length === 0 && (
            <Empty>Nenhuma isca à venda no momento.</Empty>
          )}
        </Card>
      </div>
      {(fishing.data?.recent ?? []).length > 0 && (
        <Card className="program-section">
          <h2>Últimos lançamentos</h2>
          <div className="recent-results">
            {fishing.data?.recent.map((row, index) => (
              <span key={`${row.created_at}-${index}`}>
                {row.success ? row.fish : "O peixe escapou"} · {row.created_at}
              </span>
            ))}
          </div>
        </Card>
      )}
      <Card className="program-section">
        <h2>Sua coleção</h2>
        <p className="muted">
          Descubra todas as espécies. Cada captura bem-sucedida fica registrada
          na sua coleção.
        </p>
        <div className="program-grid">
          {query.data?.collection.map((f) => (
            <article
              className={`program-item ${f.count ? "" : "program-day is-locked"}`}
              key={f.id}
            >
              <Fish color={f.count ? "var(--gold)" : "var(--muted)"} />
              <h3>{f.name}</h3>
              <small>
                {(
                  {
                    common: "Comum",
                    rare: "Raro",
                    epic: "Épico",
                    legendary: "Lendário",
                  } as Record<string, string>
                )[f.rarity] || f.rarity}{" "}
                ·{" "}
                {f.count
                  ? `${f.count} ${f.count === 1 ? "captura" : "capturas"}`
                  : "Ainda não descoberto"}
              </small>
            </article>
          ))}
        </div>
      </Card>
    </div>
  );
}
