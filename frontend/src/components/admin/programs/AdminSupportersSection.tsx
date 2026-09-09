import { Card } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, X } from 'lucide-react'
import {
  programsApi,
  type Supporter,
} from '../../../services/api'
import {
  Empty,
  ErrorNotice,
  Loading,
  Status,
} from '../../programs/ProgramUI'
import { useProgramAction } from '../../programs/useProgramAction'
import { AdminHeader } from '../../../pages/admin/AdminChrome'

export function AdminSupportersSection() {
  const query = useQuery({
    queryKey: ['staff-supporters'],
    queryFn: programsApi.staffSupporters,
  })
  const action = useProgramAction()
  const [edit, setEdit] = useState<Supporter | null>(null)
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
              e.preventDefault()
              const f = new FormData(e.currentTarget)
              void action
                .run(
                  () =>
                    programsApi.reviewSupporter(edit.id, {
                      status: f.get('status'),
                      commission_percent: f.get('commission_percent'),
                      review_note: f.get('review_note'),
                    }),
                  'Análise salva.',
                  [['staff-supporters']],
                )
                .then((ok) => {
                  if (ok) setEdit(null)
                })
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
            <p className="muted">{s.description || 'Sem descrição.'}</p>
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
                      {p.status === 'pending' ? (
                        <div className="program-actions">
                          <Button type="submit"
                            className="ghost"
                            disabled={action.busy}
                            onClick={() =>
                              void action.run(
                                () => programsApi.reviewPayout(p.id, 'paid'),
                                'Comissão creditada.',
                                [['staff-supporters']],
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
                              void action.run(
                                () => programsApi.reviewPayout(p.id, 'rejected'),
                                'Comissão recusada.',
                                [['staff-supporters']],
                              )
                            }
                          >
                            <X size={16} />
                            Recusar
                          </Button>
                        </div>
                      ) : (
                        'Processado'
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
  )
}
