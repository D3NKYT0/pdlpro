import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { Tabs } from '../../components/ui/Tabs'
import { Toggle } from '../../components/ui/Toggle'
import {
  ExchangeIcon,
  KeyRingIcon,
  MailSealIcon,
  PaymentCardIcon,
  PurseIcon,
  ServerTowerIcon,
  ShieldOkIcon,
} from '../../components/icons'
import { apiErrorMessage } from '../../lib/errors'
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { PlugZap, Trash2 } from 'lucide-react'
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
  'GOOGLE_CLIENT_SECRET',
  'DISCORD_CLIENT_SECRET',
  'HCAPTCHA_SECRET_KEY',
])

const MASKED_KEYS = new Set([
  'STRIPE_PUBLISHABLE_KEY',
  'MERCADO_PAGO_PUBLIC_KEY',
  'GOOGLE_CLIENT_ID',
  'DISCORD_CLIENT_ID',
  'HCAPTCHA_SITE_KEY',
])

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
type IntegrationTone =
  | 'stripe'
  | 'mercado'
  | 'lineage'
  | 'game'
  | 'smtp'
  | 'google'
  | 'discord'
  | 'hcaptcha'

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

function SectionCard({
  icon,
  tone,
  eyebrow,
  title,
  description,
  children,
}: {
  icon: ReactNode
  tone: IntegrationTone
  eyebrow: string
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <Card className="admin-config-section admin-integrations-section" data-tone={tone}>
      <header>
        <span className="admin-integrations-enamel" aria-hidden="true">
          {icon}
        </span>
        <div>
          <span className="panel-eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
      </header>
      {children}
    </Card>
  )
}

export function AdminIntegrationsPage() {
  const { t } = useTranslation('admin')
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<IntegrationSectionId>('payments')
  const [drafts, setDrafts] = useState<Record<IntegrationSectionId, Draft>>({
    payments: {},
    lineage: {},
    smtp: {},
    oauth: {},
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
      oauth: draftFromStatus(status.data, 'oauth'),
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
        {
          id: 'payments' as const,
          label: t('integrations.tabs.payments'),
          icon: <PaymentCardIcon width={28} height={28} />,
        },
        {
          id: 'lineage' as const,
          label: t('integrations.tabs.lineage'),
          icon: <ServerTowerIcon width={28} height={28} />,
        },
        {
          id: 'smtp' as const,
          label: t('integrations.tabs.smtp'),
          icon: <MailSealIcon width={28} height={28} />,
        },
        {
          id: 'oauth' as const,
          label: t('integrations.tabs.oauth'),
          icon: <KeyRingIcon width={28} height={28} />,
        },
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
    const armed = Boolean(clears[key])
    return (
      <div key={key} className={`admin-integrations-secret${armed ? ' is-clear' : ''}`}>
        <Field
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
        </Field>
        {configured ? (
          <Button
            type="button"
            variant={armed ? 'danger' : 'ghost'}
            size="sm"
            disabled={save.isPending}
            aria-pressed={armed}
            onClick={() => setClears((prev) => ({ ...prev, [key]: !prev[key] }))}
          >
            <Trash2 aria-hidden="true" />
            {armed ? t('integrations.clearArmed') : t('integrations.clear')}
          </Button>
        ) : null}
      </div>
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
      className="admin-integrations-toggle"
      label={t(`integrations.fields.${key}`)}
      checked={Boolean(draft[key])}
      onChange={(event) => setField(key, event.target.checked)}
      disabled={save.isPending}
    />
  )

  return (
    <div className="account-page admin-integrations-page">
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
        <form
          id={`admin-integrations-panel-${tab}`}
          role="tabpanel"
          aria-labelledby={`admin-integrations-tab-${tab}`}
          onSubmit={onSubmit}
          className="admin-server-form admin-integrations-form"
        >
          <Card className="admin-config-section admin-integrations-tabs" data-tone={tab}>
            <Tabs id="admin-integrations" label={t('integrations.tabsLabel')} items={tabs} value={tab} onChange={setTab} />
          </Card>

          {tab === 'payments' ? (
            <>
              <SectionCard
                icon={<PaymentCardIcon />}
                tone="stripe"
                eyebrow={t('integrations.payments.stripeEyebrow')}
                title={t('integrations.payments.stripeTitle')}
              >
                <div className="admin-integrations-stack">
                  {renderSecret('STRIPE_SECRET_KEY')}
                  {renderSecret('STRIPE_PUBLISHABLE_KEY')}
                  {renderSecret('STRIPE_WEBHOOK_SECRET')}
                  {renderBool('STRIPE_ACTIVATE_PAYMENTS')}
                </div>
              </SectionCard>
              <SectionCard
                icon={<PurseIcon />}
                tone="mercado"
                eyebrow={t('integrations.payments.mpEyebrow')}
                title={t('integrations.payments.mpTitle')}
              >
                <div className="admin-integrations-stack">
                  {renderSecret('MERCADO_PAGO_ACCESS_TOKEN')}
                  {renderSecret('MERCADO_PAGO_PUBLIC_KEY')}
                  {renderSecret('MERCADO_PAGO_WEBHOOK_SECRET')}
                  {renderBool('MERCADO_PAGO_ACTIVATE_PAYMENTS')}
                </div>
              </SectionCard>
            </>
          ) : null}

          {tab === 'lineage' ? (
            <>
              <SectionCard
                icon={<ServerTowerIcon />}
                tone="lineage"
                eyebrow={t('integrations.lineage.dbEyebrow')}
                title={t('integrations.lineage.dbTitle')}
              >
                <div className="admin-integrations-stack">
                  {renderBool('LINEAGE_DB_ENABLED')}
                  <div className="account-form-fields">
                    {renderText('LINEAGE_DB_HOST')}
                    {renderText('LINEAGE_DB_PORT', 'number')}
                    {renderText('LINEAGE_DB_NAME')}
                    {renderText('LINEAGE_DB_USER')}
                  </div>
                  {renderSecret('LINEAGE_DB_PASSWORD')}
                  <div className="admin-integrations-toggles">
                    {renderBool('LINEAGE_DB_SSL')}
                    {renderBool('LINEAGE_DB_SSL_VERIFY')}
                  </div>
                  <div className="account-form-fields">
                    {renderText('LINEAGE_DB_SSL_CA')}
                    {renderText('LINEAGE_DB_SSL_CERT')}
                  </div>
                  {renderSecret('LINEAGE_DB_SSL_KEY')}
                  <div className="account-form-fields">
                    {renderText('LINEAGE_QUERY_MODULE')}
                    {renderText('LINEAGE_PASSWORD_ALGO')}
                    {renderText('LINEAGE_DB_POOL_SIZE', 'number')}
                    {renderText('LINEAGE_DB_MAX_OVERFLOW', 'number')}
                  </div>
                </div>
              </SectionCard>
              <SectionCard
                icon={<ExchangeIcon />}
                tone="game"
                eyebrow={t('integrations.lineage.gameEyebrow')}
                title={t('integrations.lineage.gameTitle')}
              >
                <div className="account-form-fields">
                  {renderText('GAME_SERVER_IP')}
                  {renderText('GAME_SERVER_PORT', 'number')}
                  {renderText('LOGIN_SERVER_PORT', 'number')}
                  {renderText('SERVER_STATUS_TIMEOUT', 'number')}
                </div>
              </SectionCard>
            </>
          ) : null}

          {tab === 'smtp' ? (
            <SectionCard
              icon={<MailSealIcon />}
              tone="smtp"
              eyebrow={t('integrations.smtp.eyebrow')}
              title={t('integrations.smtp.title')}
              description={t('integrations.smtp.hint')}
            >
              <div className="admin-integrations-stack">
                {renderText('EMAIL_BACKEND')}
                <div className="account-form-fields">
                  {renderText('EMAIL_HOST')}
                  {renderText('EMAIL_PORT', 'number')}
                </div>
                <div className="admin-integrations-toggles">
                  {renderBool('EMAIL_USE_TLS')}
                  {renderBool('EMAIL_USE_SSL')}
                </div>
                <div className="account-form-fields">
                  {renderText('EMAIL_HOST_USER')}
                  {renderText('DEFAULT_FROM_EMAIL')}
                </div>
                {renderSecret('EMAIL_HOST_PASSWORD')}
              </div>
            </SectionCard>
          ) : null}

          {tab === 'oauth' ? (
            <>
              <SectionCard
                icon={<KeyRingIcon />}
                tone="google"
                eyebrow={t('integrations.oauth.googleEyebrow')}
                title={t('integrations.oauth.googleTitle')}
              >
                <div className="admin-integrations-stack">
                  {renderSecret('GOOGLE_CLIENT_ID')}
                  {renderSecret('GOOGLE_CLIENT_SECRET')}
                </div>
              </SectionCard>
              <SectionCard
                icon={<KeyRingIcon />}
                tone="discord"
                eyebrow={t('integrations.oauth.discordEyebrow')}
                title={t('integrations.oauth.discordTitle')}
              >
                <div className="admin-integrations-stack">
                  {renderSecret('DISCORD_CLIENT_ID')}
                  {renderSecret('DISCORD_CLIENT_SECRET')}
                </div>
              </SectionCard>
              <SectionCard
                icon={<ShieldOkIcon />}
                tone="hcaptcha"
                eyebrow={t('integrations.oauth.hcaptchaEyebrow')}
                title={t('integrations.oauth.hcaptchaTitle')}
                description={t('integrations.oauth.hcaptchaHint')}
              >
                <div className="admin-integrations-stack">
                  {renderSecret('HCAPTCHA_SITE_KEY')}
                  {renderSecret('HCAPTCHA_SECRET_KEY')}
                </div>
              </SectionCard>
            </>
          ) : null}

          <Card as="div" className="admin-server-actions">
            <span>
              <strong>{t('integrations.actionsTitle')}</strong>
              <small>{t('integrations.actionsHint')}</small>
            </span>
            <div className="admin-integrations-actions">
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
          </Card>
        </form>
      ) : null}
    </div>
  )
}
