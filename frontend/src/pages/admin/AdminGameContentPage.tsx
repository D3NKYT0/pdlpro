import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { Plus, Pencil } from "lucide-react";
import {
  programsApi,
  type ConfigRow,
  type Reward,
} from "../../services/domain/programs.service";
import {
  Empty,
  ErrorNotice,
  Loading,
} from "../../components/programs/ProgramUI";
import { RewardsEditor } from "../../components/programs/RewardsEditor";
import { useProgramAction } from "../../components/programs/useProgramAction";
import { AdminHeader } from "./AdminChrome";

type Field = {
  key: string;
  label: string;
  type?: string;
  source?: string;
  options?: [string, string][];
  initial?: unknown;
  min?: number;
};
const name: Field = { key: "name", label: "Nome" };
const active: Field = {
  key: "active",
  label: "Ativo",
  type: "checkbox",
  initial: true,
};
const season: Field = { key: "season", label: "Temporada", source: "seasons" };
const rewards: Field = {
  key: "rewards",
  label: "Recompensas",
  type: "rewards",
  initial: [],
};
const number = (key: string, label: string, initial = 1, min = 0): Field => ({
  key,
  label,
  type: "number",
  initial,
  min,
});
export const gameConfigSections: {
  id: string;
  label: string;
  fields: Field[];
}[] = [
  {
    id: "seasons",
    label: "Temporadas do passe",
    fields: [
      name,
      { key: "starts_at", label: "Início", type: "datetime-local" },
      { key: "ends_at", label: "Fim", type: "datetime-local" },
      number("premium_price", "Preço premium", 50),
      active,
    ],
  },
  {
    id: "levels",
    label: "Níveis",
    fields: [
      season,
      number("level", "Nível"),
      number("required_xp", "XP necessário", 0),
    ],
  },
  {
    id: "rewards",
    label: "Prêmios do passe",
    fields: [
      { key: "level_row", label: "Nível", source: "levels" },
      { key: "item_name", label: "Nome do item" },
      number("item_id", "ID do item", 57, 1),
      number("enchant", "Encantamento", 0),
      number("quantity", "Quantidade", 1, 1),
      { key: "description", label: "Descrição", type: "textarea" },
      { key: "is_premium", label: "Exclusivo premium", type: "checkbox" },
    ],
  },
  {
    id: "quests",
    label: "Missões",
    fields: [
      season,
      name,
      { key: "description", label: "Descrição", type: "textarea" },
      {
        key: "event",
        label: "Objetivo",
        options: [
          ["roulette", "Girar roleta"],
          ["dice", "Jogar dados"],
          ["slots", "Girar slots"],
          ["fishing", "Pescar"],
          ["economy", "Combater"],
          ["daily_bonus", "Resgatar bônus diário"],
        ],
      },
      number("target", "Quantidade necessária", 1, 1),
      number("xp", "Recompensa em XP", 25),
      {
        key: "period",
        label: "Repetição",
        options: [
          ["daily", "Diária"],
          ["weekly", "Semanal"],
          ["season", "Uma vez na temporada"],
        ],
      },
      active,
    ],
  },
  {
    id: "exchanges",
    label: "Trocas de itens",
    fields: [
      season,
      name,
      number("required_item_id", "ID do item exigido", 57, 1),
      number("required_enchant", "Encantamento exigido", 0),
      number("required_quantity", "Quantidade exigida", 1, 1),
      number("limit_per_user", "Limite por jogador (0 = sem limite)"),
      rewards,
      active,
    ],
  },
  {
    id: "milestones",
    label: "Marcos de progresso",
    fields: [
      season,
      name,
      number("required_xp", "XP necessário", 100),
      rewards,
    ],
  },
  {
    id: "daily-seasons",
    label: "Temporadas do bônus",
    fields: [
      name,
      { key: "starts_on", label: "Primeiro dia", type: "date" },
      { key: "ends_on", label: "Último dia", type: "date" },
      active,
    ],
  },
  {
    id: "daily-days",
    label: "Recompensas por dia",
    fields: [
      { key: "season", label: "Temporada", source: "daily-seasons" },
      number("day", "Dia da temporada", 1, 1),
      rewards,
    ],
  },
  {
    id: "daily-pool",
    label: "Sorteios do bônus",
    fields: [
      { key: "season", label: "Temporada", source: "daily-seasons" },
      name,
      number("weight", "Peso no sorteio", 1, 1),
      rewards,
    ],
  },
  {
    id: "baits",
    label: "Iscas de pesca",
    fields: [
      name,
      { key: "description", label: "Descrição", type: "textarea" },
      number("price", "Preço em fichas"),
      number("success_bonus", "Bônus de chance (pontos percentuais)", 5),
      active,
    ],
  },
];

export function AdminGameContentPage() {
  const [section, setSection] = useState("seasons");
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [editId, setEditId] = useState<string | undefined>();
  const action = useProgramAction();
  const queries = useQueries({
    queries: gameConfigSections.map((s) => ({
      queryKey: ["game-config", s.id],
      queryFn: () => programsApi.configs(s.id),
    })),
  });
  const config = gameConfigSections.find((s) => s.id === section)!;
  const query = queries[gameConfigSections.findIndex((s) => s.id === section)];
  const rows = (source: string) =>
    queries[gameConfigSections.findIndex((s) => s.id === source)]?.data || [];
  const rowLabel = (row: ConfigRow) =>
    String(
      row.name ||
        row.item_name ||
        (row.level !== undefined
          ? `Nível ${row.level} · ${rows("seasons").find((s) => s.id === row.season)?.name || "Temporada"}`
          : row.day !== undefined
            ? `Dia ${row.day}`
            : "Registro"),
    );
  function open(row?: ConfigRow) {
    setEditId(row?.id);
    setDraft(
      Object.fromEntries(
        config.fields.map((f) => [
          f.key,
          row?.[f.key] ??
            f.initial ??
            (f.type === "checkbox" ? false : f.options?.[0][0] || ""),
        ]),
      ),
    );
  }
  return (
    <div className="program-page">
      <AdminHeader
        kicker="Jogos e recompensas"
        title="Oficina de recompensas"
        description="Configure temporadas, objetivos, prêmios e iscas. Os jogadores só recebem recompensas após cumprir as regras no servidor."
      />
      <ErrorNotice error={query.error || action.error} />
      <div className="program-form">
        <label>
          Área de configuração
          <select
            value={section}
            onChange={(e) => {
              setSection(e.target.value);
              setDraft(null);
            }}
          >
            {gameConfigSections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="program-section-heading">
        <h2>{config.label}</h2>
        <div className="program-actions">
          <Button type="submit" onClick={() => open()}>
            <Plus size={18} />
            Novo registro
          </Button>
        </div>
      </div>
      {draft && (
        <Card className="program-section">
          <h2>
            {editId ? "Editar" : "Criar"} · {config.label}
          </h2>
          <form
            className="program-form"
            onSubmit={(e) => {
              e.preventDefault();
              const payload = { ...draft };
              for (const f of config.fields) {
                if (f.type === "datetime-local" && payload[f.key])
                  payload[f.key] = new Date(
                    String(payload[f.key]),
                  ).toISOString();
              }
              void action
                .run(() => programsApi.saveConfig(section, payload, editId))
                .then((ok) => {
                  if (ok) setDraft(null);
                });
            }}
          >
            <div className="program-fields">
              {config.fields
                .filter((f) => f.type !== "rewards")
                .map((f) => (
                  <label
                    key={f.key}
                    className={f.type === "checkbox" ? "program-check" : ""}
                  >
                    {f.type === "checkbox" ? (
                      <>
                        <input
                          type="checkbox"
                          checked={Boolean(draft[f.key])}
                          onChange={(e) =>
                            setDraft({ ...draft, [f.key]: e.target.checked })
                          }
                        />
                        {f.label}
                      </>
                    ) : (
                      <>
                        {f.label}
                        {f.source || f.options ? (
                          <select
                            required
                            value={String(draft[f.key] || "")}
                            onChange={(e) =>
                              setDraft({ ...draft, [f.key]: e.target.value })
                            }
                          >
                            <option value="">Selecione…</option>
                            {f.options
                              ? f.options.map(([v, l]) => (
                                  <option key={v} value={v}>
                                    {l}
                                  </option>
                                ))
                              : rows(f.source!).map((row) => (
                                  <option key={row.id} value={row.id}>
                                    {rowLabel(row)}
                                  </option>
                                ))}
                          </select>
                        ) : f.type === "textarea" ? (
                          <textarea
                            value={String(draft[f.key] || "")}
                            onChange={(e) =>
                              setDraft({ ...draft, [f.key]: e.target.value })
                            }
                          />
                        ) : (
                          <input
                            required
                            type={f.type || "text"}
                            min={f.min}
                            step={
                              f.type === "number" && f.key === "premium_price"
                                ? "0.01"
                                : undefined
                            }
                            value={
                              f.type === "datetime-local" && draft[f.key]
                                ? localDate(String(draft[f.key]))
                                : String(draft[f.key] ?? "")
                            }
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                [f.key]:
                                  f.type === "number"
                                    ? Number(e.target.value)
                                    : e.target.value,
                              })
                            }
                          />
                        )}
                      </>
                    )}
                  </label>
                ))}
            </div>
            {config.fields.some((f) => f.type === "rewards") && (
              <RewardsEditor
                value={draft.rewards as Reward[]}
                onChange={(rewards) => setDraft({ ...draft, rewards })}
              />
            )}
            <div className="program-actions">
              <Button type="submit" disabled={action.busy}>
                Salvar configuração
              </Button>
              <Button
                className="ghost"
                type="button"
                onClick={() => setDraft(null)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}
      {query.isPending && <Loading />}
      <div className="program-grid">
        {query.data?.map((row) => (
          <Card as="article" className="program-section" key={row.id}>
            <h3>{rowLabel(row)}</h3>
            <div className="program-page">
              {config.fields
                .filter(
                  (f) =>
                    f.type !== "rewards" &&
                    f.key !== "name" &&
                    f.type !== "textarea",
                )
                .map((f) => (
                  <small className="muted" key={f.key}>
                    {f.label}:{" "}
                    {f.source
                      ? rows(f.source).find((s) => s.id === row[f.key])
                        ? rowLabel(
                            rows(f.source).find((s) => s.id === row[f.key])!,
                          )
                        : "—"
                      : f.type === "checkbox"
                        ? row[f.key]
                          ? "Sim"
                          : "Não"
                        : f.type === "datetime-local"
                          ? new Date(String(row[f.key])).toLocaleString("pt-BR")
                          : f.type === "date"
                            ? new Date(
                                `${row[f.key]}T12:00:00`,
                              ).toLocaleDateString("pt-BR")
                            : f.options
                              ? f.options.find(
                                  ([key]) => key === row[f.key],
                                )?.[1] || String(row[f.key])
                              : String(row[f.key] ?? "—")}
                  </small>
                ))}
            </div>
            <div className="program-actions">
              <Button type="submit" className="ghost" onClick={() => open(row)}>
                <Pencil size={16} />
                Editar
              </Button>
            </div>
          </Card>
        ))}
      </div>
      {query.data?.length === 0 && (
        <Empty>
          Nenhum registro. Configure esta etapa para disponibilizar novas
          recompensas.
        </Empty>
      )}
    </div>
  );
}
function localDate(value: string) {
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(value)) return value;
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
