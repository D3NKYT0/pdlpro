import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Coins, TicketPercent } from "lucide-react";
import { programsApi } from "../services/domain/programs.service";
import {
  Empty,
  ErrorNotice,
  Loading,
  Status,
} from "../components/programs/ProgramUI";
import { useProgramAction } from "../components/programs/useProgramAction";
import { ProgramHeader } from "../components/programs/ProgramHeader";

export function SupportersPage() {
  const query = useQuery({
    queryKey: ["supporter"],
    queryFn: programsApi.supporter,
  });
  const action = useProgramAction();
  const data = query.data;
  const profile = data?.profile;
  return (
    <div className="program-page">
      <ProgramHeader
        eyebrow="Cresça com a comunidade"
        title="Programa de apoiadores"
        description="Compartilhe o servidor, acompanhe seus cupons e receba comissões pelas compras que você indicar."
      />
      <ErrorNotice error={query.error || action.error} />
      {query.isPending && <Loading />}
      {data && (
        <>
          <div className="program-grid">
            <Card as="div" className="program-stat">
              <small>Comissão disponível</small>
              <strong>{Number(data.available).toFixed(2)} moedas</strong>
            </Card>
            <Card as="div" className="program-stat">
              <small>Sua participação</small>
              <strong>{profile?.commission_percent || "0"}%</strong>
            </Card>
            <Card as="div" className="program-stat">
              <small>Seu cadastro</small>
              <div style={{ marginTop: 14 }}>
                {profile ? (
                  <Status value={profile.status} />
                ) : (
                  <span className="muted">Ainda não enviado</span>
                )}
              </div>
            </Card>
          </div>
          <div className="program-two">
            <Card className="program-section">
              <h2>
                {profile ? "Seu perfil de apoiador" : "Faça parte do programa"}
              </h2>
              {profile?.review_note && (
                <p className="program-note">
                  Resposta da equipe: {profile.review_note}
                </p>
              )}
              <form
                key={profile?.id || "new"}
                className="program-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  const file = form.get("image");
                  if (file instanceof File && !file.size) form.delete("image");
                  void action.run(
                    () => programsApi.apply(form),
                    "Cadastro enviado para a equipe.",
                  );
                }}
              >
                {profile?.image && (
                  <img
                    src={profile.image}
                    className="program-avatar"
                    alt={profile.name}
                  />
                )}
                <label>
                  Nome público
                  <input
                    name="name"
                    defaultValue={profile?.name}
                    required
                    maxLength={100}
                    placeholder="Como sua comunidade conhece você"
                  />
                </label>
                <label>
                  Canal ou página
                  <input
                    name="channel_url"
                    defaultValue={profile?.channel_url}
                    type="url"
                    required
                    placeholder="https://…"
                  />
                </label>
                <label>
                  Conte um pouco sobre seu trabalho
                  <textarea
                    name="description"
                    defaultValue={profile?.description}
                    maxLength={2000}
                    placeholder="Seu conteúdo, comunidade e como pretende divulgar o servidor"
                  />
                </label>
                <label>
                  Imagem do perfil
                  <input
                    type="file"
                    name="image"
                    accept="image/png,image/jpeg,image/webp"
                  />
                </label>
                <div className="program-actions">
                  <Button disabled={action.busy} type="submit">
                    {action.busy
                      ? "Enviando…"
                      : profile
                        ? "Salvar perfil"
                        : "Enviar candidatura"}
                    <ArrowUpRight size={17} />
                  </Button>
                </div>
              </form>
            </Card>
            <div className="program-page">
              <Card className="program-section">
                <div className="program-section-heading">
                  <h2>Seus cupons</h2>
                  <TicketPercent size={22} />
                </div>
                {data.coupons.length ? (
                  data.coupons.map((c) => (
                    <article className="program-item" key={c.code}>
                      <div className="program-section-heading">
                        <strong>{c.code}</strong>
                        <Status value={c.active ? "available" : "rejected"} />
                      </div>
                      <p>
                        {c.percent}% de desconto · {c.uses} utilizações
                      </p>
                    </article>
                  ))
                ) : (
                  <Empty>
                    Após a aprovação, a equipe poderá vincular seus cupons.
                  </Empty>
                )}
              </Card>
              <Card className="program-section">
                <h2>Solicitar comissão</h2>
                <p className="muted">
                  As comissões aprovadas são creditadas na sua carteira do
                  painel. O cálculo considera o saldo pago, sem a parte coberta
                  por bônus.
                </p>
                <div className="program-actions">
                  <Button type="submit"

                    disabled={
                      action.busy ||
                      profile?.status !== "approved" ||
                      Number(data.available) <= 0
                    }
                    onClick={() =>
                      void action.run(
                        programsApi.payout,
                        "Comissão solicitada. Aguarde a análise da equipe.",
                      )
                    }
                  >
                    <Coins size={18} />
                    Solicitar saldo disponível
                  </Button>
                </div>
              </Card>
            </div>
          </div>
          <Card className="program-section">
            <h2>Solicitações de comissão</h2>
            {data.payouts.length ? (
              <div className="program-table-wrap">
                <table className="program-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Valor</th>
                      <th>Status</th>
                      <th>Observação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.payouts.map((p) => (
                      <tr key={p.id}>
                        <td>
                          {new Date(p.created_at).toLocaleDateString("pt-BR")}
                        </td>
                        <td>{p.amount}</td>
                        <td>
                          <Status value={p.status} />
                        </td>
                        <td>{p.note || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>Você ainda não solicitou comissões.</Empty>
            )}
          </Card>
          <Card className="program-section">
            <h2>Comissões geradas</h2>
            {data.commissions.length ? (
              <div className="program-table-wrap">
                <table className="program-table">
                  <thead>
                    <tr>
                      <th>Compra realizada em</th>
                      <th>Comissão</th>
                      <th>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.commissions.map((c) => (
                      <tr key={c.id}>
                        <td>
                          {new Date(c.created_at).toLocaleString("pt-BR")}
                        </td>
                        <td>{c.amount}</td>
                        <td>
                          <Status value={c.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>
                As compras realizadas com seus cupons aparecerão aqui.
              </Empty>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
