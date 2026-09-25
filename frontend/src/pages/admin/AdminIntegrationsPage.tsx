import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { Tabs } from '../../components/ui/Tabs'
import { Toggle } from '../../components/ui/Toggle'
import { apiErrorMessage } from '../../lib/errors'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Cable, CreditCard, Mail, PlugZap, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  staffApi,
  type ApiIntegrationField,
  type ApiIntegrationsStatus,
  type IntegrationSectionId,
} from '../../services/api'
import { AdminHeader, AdminSaveBar } from './AdminChrome'

const SECRET_KEYS = new Set([
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'MERCADO_PAGO_ACCESS_TOKEN',
  'MERCADO_PAGO_WEBHOOK_SECRET',
  'LINEAGE_DB_PASSWORD',
  'LINEAGE_DB_SSL_KEY',
  'EMAIL_HOST_PASSWORD',
])

const MASKED_KEYS = new Set(['STRIPE_PUBLISHABLE_KEY', 'MERCADO_PAGO_PUBLIC_KEY'])

const BOOL_KEYS = new Set([
  'STRIPE_ACTIVATE_PAYMENTS',
  'MERCADO_PAGO_ACTIVATE_PAYMENTS',
  'LINEAGE_DB_ENABLED',
  'LINEAGE_DB_SSL',
  'LINEAGE_DB_SSL_VERIFY',
  'EMAIL_USE_TLS',
  'EMAIL_USE_SSL',
])

const CLEAR = '__CLEAR__'

type Draft = Record<string, string | boolean>

function fieldMap(section: { fields: ApiIntegrationField[] }) {
  return Object.fromEntries(section.fields.map((field) => [field.key, field]))
}

function draftFromStatus(status: ApiIntegrationsStatus, section: IntegrationSectionId): Draft {
  const draft: Draft = {}
  for (const field of status[section].fields) {
    if (SECRET_KEYS.has(field.key) || MASKED_KEYS.has(field.key)) {
      draft[field.key] = ''
      continue
    }
    if (BOOL_KEYS.has(field.key)) {
      draft[field.key] = Boolean(field.value)
      continue
    }
    draft[field.key] = field.value == null ? '' : String(field.value)
  }
  return draft
}

function buildPatch(draft: Draft, sectionFields: ApiIntegrationField[]) {
  const patch: Record<string, unknown> = {}
  const known = new Set(sectionFields.map((field) => field.key))
  for (const [key, value] of Object.entries(draft)) {
    if (!known.has(key)) continue
    if (SECRET_KEYS.has(key) || MASKED_KEYS.has(key)) {
      const text = String(value ?? '').trim()
      if (!text) continue
      patch[key] = text
      continue
    }
    if (BOOL_KEYS.has(key)) {
      patch[key] = Boolean(value)
      continue
    }
    patch[key] = String(value ?? '')
  }
  return patch
}

export function AdminIntegrationsPage() {
  const { t } = useTranslation('admin')
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<IntegrationSectionId>('payments')
  const [drafts, setDrafts] = useState<Record<IntegrationSectionId, Draft>>({
    payments: {},
    lineage: {},
    smtp: {},
  })
  const [clears, setClears] = useState<Record<string, boolean>>({})

  const status = useQuery({
    queryKey: ['staff-integrations'],
    queryFn: staffApi.integrationsStatus,
  })

  useEffect(() => {
    if (!status.data) return
    setDrafts({
      payments: draftFromStatus(status.data, 'payments'),
      lineage: draftFromStatus(status.data, 'lineage'),
      smtp: draftFromStatus(status.data, 'smtp'),
    })
    setClears({})
  }, [status.data])

  const save = useMutation({
    mutationFn: ({ section, payload }: { section: IntegrationSectionId; payload: Record<string, unknown> }) =>
      staffApi.saveIntegrationSection(section, payload),
    onSuccess: async () => {
      toast.success(t('integrations.toastSaved'))
      await queryClient.invalidateQueries({ queryKey: ['staff-integrations'] })
    },
    onError: (error) => toast.error(apiErrorMessage(error, t('integrations.toastSaveFail'))),
  })

  const test = useMutation({
    mutationFn: (section: IntegrationSectionId) => staffApi.testIntegrationSection(section),
    onSuccess: (result) => {
      if (result.ok) toast.success(result.message || t('integrations.toastTestOk'))
      else toast.error(result.message || t('integrations.toastTestFail'))
    },
    onError: (error) => toast.error(apiErrorMessage(error, t('integrations.toastTestFail'))),
  })

  const tabs = useMemo(
    () =>
      [
        { id: 'payments' as const, label: t('integrations.tabs.payments'), icon: <CreditCard aria-hidden="true" /> },
        { id: 'lineage' as const, label: t('integrations.tabs.lineage'), icon: <Cable aria-hidden="true" /> },
        { id: 'smtp' as const, label: t('integrations.tabs.smtp'), icon: <Mail aria-hidden="true" /> },
      ] as const,
    [t],
  )

  const section = status.data?.[tab]
  const fields = section ? fieldMap(section) : {}
  const draft = drafts[tab]

  const setField = (key: string, value: string | boolean) => {
    setDrafts((prev) => ({ ...prev, [tab]: { ...prev[tab], [key]: value } }))
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!section || save.isPending) return
    const payload = buildPatch(draft, section.fields)
    for (const [key, marked] of Object.entries(clears)) {
      if (marked && (SECRET_KEYS.has(key) || MASKED_KEYS.has(key))) payload[key] = CLEAR
    }
    save.mutate({ section: tab, payload })
  }

  const renderSecret = (key: string) => {
    const meta = fields[key]
    const configured = Boolean(meta?.configured)
    return (
      <Field
        key={key}
        label={t(`integrations.fields.${key}`)}
        hint={
          configured
            ? t('integrations.configuredHint', { fingerprint: meta?.fingerprint || meta?.masked || '…' })
            : t('integrations.emptyHint')
        }
      >
        <input
          type="password"
          autoComplete="new-password"
          value={String(draft[key] ?? '')}
          placeholder={configured ? t('integrations.keepPlaceholder') : ''}
          onChange={(event) => setField(key, event.target.value)}
          disabled={save.isPending}
        />
        {configured ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={save.isPending}
            onClick={() => setClears((prev) => ({ ...prev, [key]: !prev[key] }))}
          >
            <Trash2 aria-hidden="true" />
            {clears[key] ? t('integrations.clearArmed') : t('integrations.clear')}
          </Button>
        ) : null}
      </Field>
    )
  }

  const renderText = (key: string, inputType = 'text') => (
    <Field key={key} label={t(`integrations.fields.${key}`)}>
      <input
        type={inputType}
        value={String(draft[key] ?? '')}
        onChange={(event) => setField(key, event.target.value)}
        disabled={save.isPending}
      />
    </Field>
  )

  const renderBool = (key: string) => (
    <Toggle
      key={key}
      label={t(`integrations.fields.${key}`)}
      checked={Boolean(draft[key])}
      onChange={(event) => setField(key, event.target.checked)}
      disabled={save.isPending}
    />
  )

  return (
    <div className="account-page">
      <AdminHeader
        kicker={t('integrations.kicker')}
        title={t('integrations.title')}
        description={t('integrations.description')}
      />

      {status.isLoading ? (
        <Card className="admin-config-section">
          <p className="muted">{t('chrome.loading')}</p>
        </Card>
      ) : null}

      {status.isError ? (
        <Card className="admin-config-section">
          <p role="alert">{apiErrorMessage(status.error, t('integrations.loadError'))}</p>
        </Card>
      ) : null}

      {status.data ? (
        <Card className="admin-config-section">
          <Tabs id="admin-integrations" label={t('integrations.tabsLabel')} items={tabs} value={tab} onChange={setTab} />
          <form id={`admin-integrations-panel-${tab}`} role="tabpanel" aria-labelledby={`admin-integrations-tab-${tab}`} onSubmit={onSubmit} className="admin-server-form">
            {tab === 'payments' ? (
              <>
                <div className="account-section-heading">
                  <div>
                    <span className="panel-eyebrow">{t('integrations.payments.stripeEyebrow')}</span>
                    <h2>{t('integrations.payments.stripeTitle')}</h2>
                  </div>
                </div>
                {renderSecret('STRIPE_SECRET_KEY')}
                {renderSecret('STRIPE_PUBLISHABLE_KEY')}
                {renderSecret('STRIPE_WEBHOOK_SECRET')}
                {renderBool('STRIPE_ACTIVATE_PAYMENTS')}
                <div className="account-section-heading">
                  <div>
                    <span className="panel-eyebrow">{t('integrations.payments.mpEyebrow')}</span>
                    <h2>{t('integrations.payments.mpTitle')}</h2>
                  </div>
                </div>
                {renderSecret('MERCADO_PAGO_ACCESS_TOKEN')}
                {renderSecret('MERCADO_PAGO_PUBLIC_KEY')}
                {renderSecret('MERCADO_PAGO_WEBHOOK_SECRET')}
                {renderBool('MERCADO_PAGO_ACTIVATE_PAYMENTS')}
              </>
            ) : null}

            {tab === 'lineage' ? (
              <>
                <div className="account-section-heading">
                  <div>
                    <span className="panel-eyebrow">{t('integrations.lineage.dbEyebrow')}</span>
                    <h2>{t('integrations.lineage.dbTitle')}</h2>
                  </div>
                </div>
                {renderBool('LINEAGE_DB_ENABLED')}
                {renderText('LINEAGE_DB_HOST')}
                {renderText('LINEAGE_DB_PORT', 'number')}
                {renderText('LINEAGE_DB_NAME')}
                {renderText('LINEAGE_DB_USER')}
                {renderSecret('LINEAGE_DB_PASSWORD')}
                {renderBool('LINEAGE_DB_SSL')}
                {renderBool('LINEAGE_DB_SSL_VERIFY')}
                {renderText('LINEAGE_DB_SSL_CA')}
                {renderText('LINEAGE_DB_SSL_CERT')}
                {renderSecret('LINEAGE_DB_SSL_KEY')}
                {renderText('LINEAGE_QUERY_MODULE')}
                {renderText('LINEAGE_PASSWORD_ALGO')}
                {renderText('LINEAGE_DB_POOL_SIZE', 'number')}
                {renderText('LINEAGE_DB_MAX_OVERFLOW', 'number')}
                <div className="account-section-heading">
                  <div>
                    <span className="panel-eyebrow">{t('integrations.lineage.gameEyebrow')}</span>
                    <h2>{t('integrations.lineage.gameTitle')}</h2>
                  </div>
                </div>
                {renderText('GAME_SERVER_IP')}
                {renderText('GAME_SERVER_PORT', 'number')}
                {renderText('LOGIN_SERVER_PORT', 'number')}
                {renderText('SERVER_STATUS_TIMEOUT', 'number')}
              </>
            ) : null}

            {tab === 'smtp' ? (
              <>
                <div className="account-section-heading">
                  <div>
                    <span className="panel-eyebrow">{t('integrations.smtp.eyebrow')}</span>
                    <h2>{t('integrations.smtp.title')}</h2>
                    <p className="muted">{t('integrations.smtp.hint')}</p>
                  </div>
                </div>
                {renderText('EMAIL_BACKEND')}
                {renderText('EMAIL_HOST')}
                {renderText('EMAIL_PORT', 'number')}
                {renderBool('EMAIL_USE_TLS')}
                {renderBool('EMAIL_USE_SSL')}
                {renderText('EMAIL_HOST_USER')}
                {renderSecret('EMAIL_HOST_PASSWORD')}
                {renderText('DEFAULT_FROM_EMAIL')}
              </>
            ) : null}

            <div className="admin-server-actions">
              <Button
                type="button"
                variant="secondary"
                busy={test.isPending}
                disabled={save.isPending}
                onClick={() => test.mutate(tab)}
              >
                <PlugZap aria-hidden="true" />
                {t('integrations.test')}
              </Button>
              <AdminSaveBar saving={save.isPending} />
            </div>
          </form>
        </Card>
      ) : null}
    </div>
  )
}
