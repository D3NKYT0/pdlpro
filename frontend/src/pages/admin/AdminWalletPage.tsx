import { Card } from '../../components/ui/Card'
import { Toggle } from '../../components/ui/Toggle'
import { useFeedbackAction } from '../../hooks/useFeedbackAction'
import { Field } from '../../components/ui/Field'
import { useEffect, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Megaphone, Percent } from 'lucide-react'
import toast from 'react-hot-toast'
import { staffApi } from '../../services/api'
import { AdminHeader, AdminSaveBar } from './AdminChrome'

function toDatetimeLocal(iso: string | null | undefined) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromDatetimeLocal(value: string) {
  if (!value.trim()) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

export function AdminWalletPage() {
  const { t } = useTranslation('admin')
  const queryClient = useQueryClient()
  const promo = useQuery({ queryKey: ['staff-wallet-promo'], queryFn: staffApi.walletPromo })
  const [percent, setPercent] = useState('10.00')
  const [title, setTitle] = useState(() => t('wallet.defaultTitle'))
  const [description, setDescription] = useState('')
  const [active, setActive] = useState(false)
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const action = useFeedbackAction()
  const saving = action.pending

  useEffect(() => {
    if (!promo.data) return
    setPercent(promo.data.percent)
    setTitle(promo.data.title)
    setDescription(promo.data.description)
    setActive(promo.data.active)
    setStartsAt(toDatetimeLocal(promo.data.starts_at))
    setEndsAt(toDatetimeLocal(promo.data.ends_at))
  }, [promo.data])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    await action.run(async () => {
      await staffApi.saveWalletPromo({
        percent,
        title,
        description,
        active,
        starts_at: fromDatetimeLocal(startsAt),
        ends_at: fromDatetimeLocal(endsAt),
      })
      toast.success(t('wallet.toast.saved'))
      await queryClient.invalidateQueries({ queryKey: ['staff-wallet-promo'] })
    }, t('wallet.toast.error'))
  }

  return (
    <div className="account-page">
      <AdminHeader
        kicker={t('wallet.kicker')}
        title={t('wallet.title')}
        description={t('wallet.description')}
      />
      <form className="admin-coins-form" onSubmit={onSubmit}>
        <Card className="admin-config-section admin-coin-identity">
          <header>
            <span><Megaphone /></span>
            <div>
              <span className="panel-eyebrow">{t('wallet.eyebrow')}</span>
              <h2>{t('wallet.bannerTitle')}</h2>
              <p>{t('wallet.bannerText')}</p>
            </div>
          </header>
          <div className="account-form-fields">
            <Field>
              {t('wallet.fieldTitle')}
              <input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={120} />
            </Field>
            <Field>
              {t('wallet.fieldDescription')}
              <input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={240} placeholder={t('wallet.descriptionPlaceholder')} />
            </Field>
            <Field>
              <span className="admin-coin-metric-icon" aria-hidden="true"><Percent /></span>
              {t('wallet.percent')}
              <input type="number" min="0" max="100" step="0.01" value={percent} onChange={(event) => setPercent(event.target.value)} required />
            </Field>
            <Field>
              {t('wallet.startsAt')}
              <input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
            </Field>
            <Field>
              {t('wallet.endsAt')}
              <input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
            </Field>
            <Toggle label={t('wallet.activeToggle')} checked={active} onChange={(event) => setActive(event.target.checked)} />
          </div>
        </Card>

        <Card as="div" className="admin-server-actions">
          <span>
            <strong>{title || t('wallet.untitled')}</strong>
            <small>
              {t('wallet.summary', {
                percent: percent || '0',
                status: active
                  ? promo.data?.currently_active
                    ? t('wallet.status.current')
                    : t('wallet.status.outOfWindow')
                  : t('wallet.status.inactive'),
              })}
            </small>
          </span>
          <AdminSaveBar saving={saving} />
        </Card>
      </form>
    </div>
  )
}
