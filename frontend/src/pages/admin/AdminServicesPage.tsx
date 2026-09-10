import { Card } from '../../components/ui/Card'
import { useFeedbackAction } from '../../hooks/useFeedbackAction'
import { Field } from '../../components/ui/Field'
import { Toggle } from '../../components/ui/Toggle'
import { useEffect, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link2, MapPinOff, PencilLine, Settings2, VenusAndMars } from 'lucide-react'
import toast from 'react-hot-toast'
import { staffApi, type ApiStaffService } from '../../services/api'
import { AdminHeader, AdminSaveBar } from './AdminChrome'

const SERVICE_ICONS = {
  CHANGE_NICKNAME: PencilLine,
  CHANGE_SEX: VenusAndMars,
  LINK_SLOT: Link2,
  UNSTUCK: MapPinOff,
}

export function AdminServicesPage() {
  const { t } = useTranslation('admin')
  const queryClient = useQueryClient()
  const services = useQuery({ queryKey: ['staff-services'], queryFn: staffApi.services })
  const [rows, setRows] = useState<ApiStaffService[]>([])
  const action = useFeedbackAction()
  const saving = action.pending

  useEffect(() => {
    if (services.data) setRows(services.data)
  }, [services.data])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    await action.run(async () => {
      await staffApi.saveServices(rows)
      toast.success(t('services.toast.saved'))
      await queryClient.invalidateQueries({ queryKey: ['staff-services'] })
      await queryClient.invalidateQueries({ queryKey: ['service-prices'] })
    }, t('services.toast.error'))
  }

  return (
    <div className="account-page">
      <AdminHeader kicker={t('services.kicker')} title={t('services.title')} description={t('services.description')} />
      <form className="admin-services-form" onSubmit={onSubmit}>
        <Card className="admin-services-panel">
          <header className="admin-services-heading">
            <span><Settings2 /></span>
            <div><span className="panel-eyebrow">{t('services.eyebrow')}</span><h2>{t('services.panelTitle')}</h2><p>{t('services.panelText')}</p></div>
            <div className="admin-services-summary"><strong>{rows.filter((row) => row.active).length}</strong><small>{t('services.activeCount', { total: rows.length })}</small></div>
          </header>

          <div className="admin-service-grid">
            {rows.map((row, index) => {
              const Icon = SERVICE_ICONS[row.code as keyof typeof SERVICE_ICONS] ?? Settings2
              const description = t(`services.descriptions.${row.code}`, { defaultValue: t('services.descriptions.fallback') })
              return (
                <article className={`admin-service-card${row.active ? ' is-active' : ' is-inactive'}`} key={row.code}>
                  <header><span><Icon /></span><div><h3>{row.name}</h3><code>{row.code}</code></div><b>{row.active ? t('services.active') : t('services.inactive')}</b></header>
                  <p>{description}</p>
                  <div className="admin-service-controls">
                    <Field className="admin-service-price">
                      {t('services.price')}
                      <span><b>R$</b><input type="number" min="0" step="0.01" value={row.price} onChange={(event) => {
                        const next = [...rows]
                        next[index] = { ...row, price: event.target.value }
                        setRows(next)
                      }} /></span>
                    </Field>
                    <Toggle className="admin-service-switch" label={t('services.available')} checked={row.active} onChange={(event) => {
                        const next = [...rows]
                        next[index] = { ...row, active: event.target.checked }
                        setRows(next)
                      }} />
                  </div>
                </article>
              )
            })}
          </div>
        </Card>

        <Card as="div" className="admin-server-actions"><span><strong>{t('services.footerTitle')}</strong><small>{t('services.footerText')}</small></span><AdminSaveBar saving={saving} /></Card>
      </form>
    </div>
  )
}
