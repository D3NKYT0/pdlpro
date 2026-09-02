import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, X, Plus, Pencil, Trash2 } from "lucide-react";
import {
  programsApi,
  type RoadmapEntry,
  type Supporter,
} from "../../services/domain/programs.service";
import {
  Empty,
  ErrorNotice,
  Loading,
  Status,
} from "../../components/programs/ProgramUI";
import { useProgramAction } from "../../components/programs/useProgramAction";
import { AdminHeader } from "./AdminChrome";

export function AdminResourcesPage() {
  const query = useQuery({
    queryKey: ["resources"],
    queryFn: programsApi.resources,
  });
  const action = useProgramAction();
  const categories = [...new Set(query.data?.map((r) => r.category))];
  return (
    <div className="program-page">
      <AdminHeader
        kicker="Sistema"
        title="Controle de recursos"
        description="Defina quais módulos ficam disponíveis. A desativação bloqueia as telas e a API; o acesso administrativo é preservado."
      />
      <ErrorNotice error={query.error || action.error} />
      {query.isPending && <Loading />}
      {categories.map((category) => (
        <Card className="program-section" key={category}>
          <h2>{category}</h2>
          <div className="program-grid">
            {query.data
              ?.filter((r) => r.category === category)
              .map((r) => (
                <article className="program-item program-resource" key={r.id}>
                  <div>
                    <h3>{r.name}</h3>
                    <p>{r.description}</p>
                    <small>
                      {r.enabled
                        ? "Disponível aos jogadores"
                        : "Temporariamente desativado"}
                    </small>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={r.enabled}
                    aria-label={`${r.enabled ? "Desativar" : "Ativar"} ${r.name}`}
                    disabled={action.busy}
                    className="program-switch"
                    onClick={() =>
                      void action.run(() =>
                        programsApi.toggleResource(r.id, !r.enabled),
                      )
                    }
                  >
                    <span />
                  </button>
                </article>
              ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

export function AdminRoadmapPage() {
  const query = useQuery({
    queryKey: ["staff-roadmap"],
    queryFn: () => programsApi.roadmap(true),
  });
  const action = useProgramAction();
  const [edit, setEdit] = useState<Partial<RoadmapEntry> | null>(null);
  const [remove, setRemove] = useState<string | null>(null);
  return (
    <div className="program-page">
      <AdminHeader
        kicker="Conteúdo"
        title="Gerenciar roadmap"
        description="Organize os próximos passos e mantenha a comunidade informada."
      />
      <ErrorNotice error={query.error || action.error} />
      <div className="program-actions">
        <Button type="submit"

          onClick={() =>
            setEdit({ status: "planned", progress: 0, published: true })
          }
        >
          <Plus size={18} />
          Nova atualização
        </Button>
      </div>
      {edit && (
        <Card className="program-section">
          <h2>{edit.id ? "Editar atualização" : "Nova atualização"}</h2>
          <form
            key={edit.id || "new"}
            className="program-form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void action
                .run(() =>
                  programsApi.saveRoadmap(
                    {
                      title: String(f.get("title")),
                      description: String(f.get("description")),
                      category: String(f.get("category")),
                      status: String(f.get("status")),
                      progress: Number(f.get("progress")),
                      target_date: String(f.get("target_date")) || null,
                      published: f.has("published"),
                      order: Number(f.get("order")),
                    },
                    edit.id,
                  ),
                )
                .then((ok) => {
                  if (ok) setEdit(null);
                });
            }}
          >
            <label>
              Título
              <input
                name="title"
                required
                maxLength={160}
                defaultValue={edit.title}
              />
            </label>
            <label>
              Descrição
              <textarea
                name="description"
                required
                defaultValue={edit.description}
              />
            </label>
            <div className="program-fields">
              <label>
                Categoria
                <input
                  name="category"
                  required
                  maxLength={60}
                  defaultValue={edit.category || "Servidor"}
                />
              </label>
              <label>
                Etapa
                <select name="status" defaultValue={edit.status}>
                  <option value="planned">Planejado</option>
                  <option value="progress">Em andamento</option>
                  <option value="completed">Concluído</option>
                </select>
              </label>
              <label>
                Progresso (%)
                <input
                  name="progress"
                  type="number"
                  min={0}
                  max={100}
                  required
                  defaultValue={edit.progress}
                />
              </label>
              <label>
                Previsão
                <input
                  name="target_date"
                  type="date"
                  defaultValue={edit.target_date || ""}
                />
              </label>
              <label>
                Ordem
                <input
                  name="order"
                  type="number"
                  min={0}
                  defaultValue={edit.order || 0}
                />
              </label>
            </div>
            <label className="program-check">
              <input
                name="published"
                type="checkbox"
                defaultChecked={edit.published}
              />
              Publicar no site
            </label>
            <div className="program-actions">
              <Button type="submit" disabled={action.busy}>
                Salvar atualização
              </Button>
              <Button
                className="ghost"
                type="button"
                onClick={() => setEdit(null)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}
      {query.isPending && <Loading />}
      <div className="program-grid">
        {query.data?.map((r) => (
          <Card as="article" className="program-section" key={r.id}>
            <Status value={r.status} />
            <h2>{r.title}</h2>
            <p className="muted">
              {r.category} · {r.progress}% ·{" "}
              {r.published ? "Publicado" : "Rascunho"}
            </p>
            <div className="program-actions">
              <Button type="submit" className="ghost" onClick={() => setEdit(r)}>
                <Pencil size={16} />
                Editar
              </Button>
              {remove === r.id ? (
                <>
                  <Button type="submit"

                    disabled={action.busy}
                    onClick={() =>
                      void action
                        .run(() => programsApi.deleteRoadmap(r.id))
                        .then(() => setRemove(null))
                    }
                  >
                    Confirmar exclusão
                  </Button>
                  <Button type="submit" className="ghost" onClick={() => setRemove(null)}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button type="submit"
                  className="ghost"
                  onClick={() => setRemove(r.id)}
                  aria-label={`Excluir ${r.title}`}
                >
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
      {query.data?.length === 0 && (
        <Empty>Crie a primeira atualização do roadmap.</Empty>
      )}
    </div>
  );
}

export function AdminSupportersPage() {
  const query = useQuery({
    queryKey: ["staff-supporters"],
    queryFn: programsApi.staffSupporters,
  });
  const action = useProgramAction();
  const [edit, setEdit] = useState<Supporter | null>(null);
  return (
    <div className="program-page">
      <AdminHeader
        kicker="Comunidade"
        title="Apoiadores e comissões"
        description="Analise candidaturas, defina a comissão e aprove créditos na carteira dos apoiadores."
      />
      <ErrorNotice error={query.error || action.error} />
      {query.isPending && <Loading />}
      {edit && (
        <Card className="program-section">
          <h2>Analisar {edit.name}</h2>
          <form
            className="program-form"
            key={edit.id}
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void action
                .run(() =>
                  programsApi.reviewSupporter(edit.id, {
                    status: f.get("status"),
                    commission_percent: f.get("commission_percent"),
                    review_note: f.get("review_note"),
                  }),
                )
                .then((ok) => {
                  if (ok) setEdit(null);
                });
            }}
          >
            <div className="program-fields">
              <label>
                Decisão
                <select name="status">
                  <option value="approved">Aprovar</option>
                  <option value="rejected">Recusar</option>
                </select>
              </label>
              <label>
                Comissão (%)
                <input
                  name="commission_percent"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  required
                  defaultValue={edit.commission_percent}
                />
              </label>
            </div>
            <label>
              Resposta ao apoiador
              <textarea name="review_note" defaultValue={edit.review_note} />
            </label>
            <div className="program-actions">
              <Button type="submit" disabled={action.busy}>
                Salvar análise
              </Button>
              <Button
                className="ghost"
                type="button"
                onClick={() => setEdit(null)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}
      <div className="program-grid">
        {query.data?.supporters.map((s) => (
          <Card as="article" className="program-section" key={s.id}>
            <div className="program-section-heading">
              <h2>{s.name}</h2>
              <Status value={s.status} />
            </div>
            <small className="muted">
              @{s.username} · Comissão {s.commission_percent}%
            </small>
            <p className="muted">{s.description || "Sem descrição."}</p>
            <a href={s.channel_url} target="_blank" rel="noreferrer">
              Visitar canal ↗
            </a>
            <div className="program-actions">
              <Button type="submit" className="ghost" onClick={() => setEdit(s)}>
                Analisar cadastro
              </Button>
            </div>
          </Card>
        ))}
      </div>
      {query.data?.supporters.length === 0 && (
        <Empty>Nenhuma candidatura recebida.</Empty>
      )}
      <Card className="program-section">
        <h2>Solicitações de comissão</h2>
        <p className="muted">
          A aprovação credita o valor na carteira do apoiador. Uma solicitação
          processada não pode ser creditada novamente.
        </p>
        {query.data?.payouts.length ? (
          <div className="program-table-wrap">
            <table className="program-table">
              <thead>
                <tr>
                  <th>Apoiador</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Análise</th>
                </tr>
              </thead>
              <tbody>
                {query.data.payouts.map((p) => (
                  <tr key={p.id}>
                    <td>{p.supporter_name}</td>
                    <td>{p.amount}</td>
                    <td>
                      <Status value={p.status} />
                    </td>
                    <td>
                      {p.status === "pending" ? (
                        <div className="program-actions">
                          <Button type="submit"
                            className="ghost"
                            disabled={action.busy}
                            onClick={() =>
                              void action.run(
                                () => programsApi.reviewPayout(p.id, "paid"),
                                "Comissão creditada.",
                              )
                            }
                          >
                            <Check size={16} />
                            Creditar
                          </Button>
                          <Button type="submit"
                            className="ghost"
                            disabled={action.busy}
                            onClick={() =>
                              void action.run(() =>
                                programsApi.reviewPayout(p.id, "rejected"),
                              )
                            }
                          >
                            <X size={16} />
                            Recusar
                          </Button>
                        </div>
                      ) : (
                        "Processado"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>Nenhuma comissão solicitada.</Empty>
        )}
      </Card>
    </div>
  );
}
