import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'

/** Campo de template com ajuda acessível por clique, toque e teclado. */
export function PaymentDescriptionField({ provider, value, disabled, onChange }: {
  provider: 'STRIPE' | 'MERCADO_PAGO'
  value: string
  disabled: boolean
  onChange: (value: string) => void
}) {
  const { t } = useTranslation('admin')
  const id = useId()
  const [open, setOpen] = useState(false)
  const label = t(`integrations.fields.${provider}_PAYMENT_DESCRIPTION`)
  return <div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <label htmlFor={id}>{label}</label>
      <Button size="sm" variant="help" aria-label={t('integrations.payments.variablesHelp', { provider: provider === 'STRIPE' ? 'Stripe' : 'Mercado Pago' })}
        aria-expanded={open} aria-controls={`${id}-help`} onClick={() => setOpen(!open)}>?</Button>
    </div>
    <Field hint={t('integrations.payments.descriptionHint')}>
      <input id={id} value={value} disabled={disabled} onChange={event => onChange(event.target.value)}
        aria-describedby={open ? `${id}-help` : undefined}
        placeholder={t(`integrations.payments.${provider === 'STRIPE' ? 'stripe' : 'mp'}DescriptionPlaceholder`)} />
    </Field>
    <p id={`${id}-help`} className="muted" hidden={!open}>{t('integrations.payments.variablesHint')}</p>
  </div>
}
