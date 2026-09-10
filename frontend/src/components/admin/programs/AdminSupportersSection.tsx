import { Card } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('admin')
  const query = useQuery({
    queryKey: ['staff-supporters'],
    queryFn: programsApi.staffSupporters,
  })
  const action = useProgramAction()
  const [edit, setEdit] = useState<Supporter | null>(null)
  return (
    <div className="program-page">
      <AdminHeader
        kicker={t('supporters.kicker')}
        title={t('supporters.title')}
        description={t('supporters.description')}
      />
      <ErrorNotice error={query.error || action.error} />
      {query.isPending && <Loading />}
      {edit && (
        <Card className="program-section">
          <h2>{t('supporters.review', { name: edit.name })}</h2>
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
                  t('supporters.reviewSaved'),
                  [['staff-supporters']],
                )
                .then((ok) => {
                  if (ok) setEdit(null)
                })
            }}
          >
            <div className="program-fields">
              <label>
                {t('supporters.decision')}
                <select name="status">
                  <option value="approved">{t('supporters.approve')}</option>
                  <option value="rejected">{t('supporters.reject')}</option>
                </select>
              </label>
              <label>
                {t('supporters.commission')}
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
              {t('supporters.reviewNote')}
              <textarea name="review_note" defaultValue={edit.review_note} />
            </label>
            <div className="program-actions">
              <Button type="submit" disabled={action.busy}>
                {t('supporters.saveReview')}
              </Button>
              <Button
                className="ghost"
                type="button"
                onClick={() => setEdit(null)}
              >
                {t('supporters.cancel')}
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
              {t('supporters.supporterMeta', {
                username: s.username,
                percent: s.commission_percent,
              })}
            </small>
            <p className="muted">{s.description || t('supporters.noDescription')}</p>
            <a href={s.channel_url} target="_blank" rel="noreferrer">
              {t('supporters.visitChannel')}
            </a>
            <div className="program-actions">
              <Button type="submit" className="ghost" onClick={() => setEdit(s)}>
                {t('supporters.reviewAction')}
              </Button>
            </div>
          </Card>
        ))}
      </div>
      {query.data?.supporters.length === 0 && (
        <Empty>{t('supporters.emptyApplications')}</Empty>
      )}
      <Card className="program-section">
        <h2>{t('supporters.payoutsTitle')}</h2>
        <p className="muted">{t('supporters.payoutsHint')}</p>
        {query.data?.payouts.length ? (
          <div className="program-table-wrap">
            <table className="program-table">
              <thead>
                <tr>
                  <th>{t('supporters.columnSupporter')}</th>
                  <th>{t('supporters.columnAmount')}</th>
                  <th>{t('supporters.columnStatus')}</th>
                  <th>{t('supporters.columnReview')}</th>
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
                                t('supporters.credited'),
                                [['staff-supporters']],
                              )
                            }
                          >
                            <Check size={16} />
                            {t('supporters.credit')}
                          </Button>
                          <Button type="submit"
                            className="ghost"
                            disabled={action.busy}
                            onClick={() =>
                              void action.run(
                                () => programsApi.reviewPayout(p.id, 'rejected'),
                                t('supporters.rejected'),
                                [['staff-supporters']],
                              )
                            }
                          >
                            <X size={16} />
                            {t('supporters.rejectPayout')}
                          </Button>
                        </div>
                      ) : (
                        t('supporters.processed')
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>{t('supporters.emptyPayouts')}</Empty>
        )}
      </Card>
    </div>
  )
}
