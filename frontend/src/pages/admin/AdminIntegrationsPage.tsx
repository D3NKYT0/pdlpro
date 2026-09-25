import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { Select } from '../../components/ui/Select'
import { Tabs } from '../../components/ui/Tabs'
import { Toggle } from '../../components/ui/Toggle'
import {
  BrainOrbIcon,
  CloudBucketIcon,
  ExchangeIcon,
  KeyRingIcon,
  MailSealIcon,
  PaymentCardIcon,
  PurseIcon,
  RadarPulseIcon,
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
  'VAPID_PRIVATE_KEY',
  'GOOGLE_CLIENT_SECRET',
  'DISCORD_CLIENT_SECRET',
  'HCAPTCHA_SECRET_KEY',
  'DENKYNHO_LLM_API_KEY',
  'AWS_SECRET_ACCESS_KEY',
  'SENTRY_DSN',
])

const MASKED_KEYS = new Set([
  'STRIPE_PUBLISHABLE_KEY',
  'MERCADO_PAGO_PUBLIC_KEY',
  'VAPID_PUBLIC_KEY',
  'GOOGLE_CLIENT_ID',
  'DISCORD_CLIENT_ID',
  'HCAPTCHA_SITE_KEY',
  'AWS_ACCESS_KEY_ID',
])

const BOOL_KEYS = new Set([
  'STRIPE_ACTIVATE_PAYMENTS',
  'MERCADO_PAGO_ACTIVATE_PAYMENTS',
  'LINEAGE_DB_ENABLED',
  'LINEAGE_DB_SSL',
  'LINEAGE_DB_SSL_VERIFY',
  'EMAIL_USE_TLS',
  'EMAIL_USE_SSL',
  'PAYMENT_ALLOW_MOCK',
  'DENKYNHO_LLM_ENABLED',
  'DENKYNHO_OLLAMA_DOCKER',
  'DENKYNHO_EMBEDDINGS_ENABLED',
  'USE_S3',
  'AWS_S3_PRIVATE_MEDIA',
])

const LIST_KEYS = new Set(['PAYMENT_METHODS', 'WEBAUTHN_ORIGINS'])

const CLEAR = '__CLEAR__'

type Draft = Record<string, string | boolean>
type IntegrationTone =
  | 'stripe'
  | 'mercado'
  | 'policy'
  | 'lineage'
  | 'game'
  | 'smtp'
  | 'push'
  | 'google'
  | 'discord'
  | 'hcaptcha'
  | 'webauthn'
  | 'denkynho'
  | 'storage'
  | 'observability'

function fieldMap(section: { fields: ApiIntegrationField[] }) {
  return Object.fromEntries(section.fields.map((field) => [field.key, field]))
}

function listToDraft(value: unknown) {
  if (Array.isArray(value)) return value.map(String).join(', ')
  return value == null ? '' : String(value)
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
    if (LIST_KEYS.has(field.key)) {
      draft[field.key] = listToDraft(field.value)
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
    if (LIST_KEYS.has(key)) {
      patch[key] = String(value ?? '')
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

const EMPTY_DRAFTS: Record<IntegrationSectionId, Draft> = {
  payments: {},
  lineage: {},
  smtp: {},
  oauth: {},
  denkynho: {},
  storage: {},
  observability: {},
}

export function AdminIntegrationsPage() {
  const { t } = useTranslation('admin')
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<IntegrationSectionId>('payments')
  const [drafts, setDrafts] = useState<Record<IntegrationSectionId, Draft>>(EMPTY_DRAFTS)
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
      denkynho: draftFromStatus(status.data, 'denkynho'),
      storage: draftFromStatus(status.data, 'storage'),
      observability: draftFromStatus(status.data, 'observability'),
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
        { id: 'payments' as const, label: t('integrations.tabs.payments'), icon: <PaymentCardIcon width={28} height={28} /> },
        { id: 'lineage' as const, label: t('integrations.tabs.lineage'), icon: <ServerTowerIcon width={28} height={28} /> },
        { id: 'smtp' as const, label: t('integrations.tabs.smtp'), icon: <MailSealIcon width={28} height={28} /> },
        { id: 'oauth' as const, label: t('integrations.tabs.oauth'), icon: <KeyRingIcon width={28} height={28} /> },
        { id: 'denkynho' as const, label: t('integrations.tabs.denkynho'), icon: <BrainOrbIcon width={28} height={28} /> },
        { id: 'storage' as const, label: t('integrations.tabs.storage'), icon: <CloudBucketIcon width={28} height={28} /> },
        {
          id: 'observability' as const,
          label: t('integrations.tabs.observability'),
          icon: <RadarPulseIcon width={28} height={28} />,
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

  const renderText = (key: string, inputType = 'text', hint?: string) => (
    <Field key={key} label={t(`integrations.fields.${key}`)} hint={hint}>
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
              <SectionCard
                icon={<PaymentCardIcon />}
                tone="policy"
                eyebrow={t('integrations.payments.policyEyebrow')}
                title={t('integrations.payments.policyTitle')}
                description={t('integrations.payments.policyHint')}
              >
                <div className="admin-integrations-stack">
                  {renderText('PAYMENT_METHODS', 'text', t('integrations.payments.methodsHint'))}
                  {renderText('PAYMENT_WEBHOOK_BASE_URL')}
                  {renderText('COINS_PER_USD')}
                  {renderText('PAYMENT_REUSE_HOURS', 'number')}
                  {renderBool('PAYMENT_ALLOW_MOCK')}
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
                <div className="admin-integrations-stack">
                  <div className="account-form-fields">
                    {renderText('GAME_SERVER_IP')}
                    {renderText('GAME_SERVER_PORT', 'number')}
                    {renderText('LOGIN_SERVER_PORT', 'number')}
                    {renderText('SERVER_STATUS_TIMEOUT', 'number')}
                  </div>
                  <div className="account-form-fields">
                    {renderText('FAKE_PLAYERS_FACTOR', 'number')}
                    {renderText('FAKE_PLAYERS_MIN', 'number')}
                    {renderText('FAKE_PLAYERS_MAX', 'number')}
                  </div>
                </div>
              </SectionCard>
            </>
          ) : null}

          {tab === 'smtp' ? (
            <>
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
              <SectionCard
                icon={<MailSealIcon />}
                tone="push"
                eyebrow={t('integrations.smtp.pushEyebrow')}
                title={t('integrations.smtp.pushTitle')}
                description={t('integrations.smtp.pushHint')}
              >
                <div className="admin-integrations-stack">
                  {renderSecret('VAPID_PUBLIC_KEY')}
                  {renderSecret('VAPID_PRIVATE_KEY')}
                  {renderText('VAPID_SUBJECT')}
                </div>
              </SectionCard>
            </>
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
              <SectionCard
                icon={<KeyRingIcon />}
                tone="webauthn"
                eyebrow={t('integrations.oauth.webauthnEyebrow')}
                title={t('integrations.oauth.webauthnTitle')}
                description={t('integrations.oauth.webauthnHint')}
              >
                <div className="admin-integrations-stack">
                  {renderText('WEBAUTHN_RP_ID')}
                  {renderText('WEBAUTHN_RP_NAME')}
                  {renderText('WEBAUTHN_ORIGINS', 'text', t('integrations.oauth.originsHint'))}
                </div>
              </SectionCard>
            </>
          ) : null}

          {tab === 'denkynho' ? (
            <>
              <SectionCard
                icon={<BrainOrbIcon />}
                tone="denkynho"
                eyebrow={t('integrations.denkynho.eyebrow')}
                title={t('integrations.denkynho.title')}
                description={t('integrations.denkynho.hint')}
              >
                <div className="admin-integrations-stack">
                  {renderBool('DENKYNHO_LLM_ENABLED')}
                  <Field label={t('integrations.fields.DENKYNHO_LLM_PROVIDER')} hint={t('integrations.denkynho.providerHint')}>
                    <Select
                      aria-label={t('integrations.fields.DENKYNHO_LLM_PROVIDER')}
                      value={String(draft.DENKYNHO_LLM_PROVIDER || 'ollama')}
                      disabled={save.isPending}
                      options={[
                        { value: 'ollama', label: t('integrations.denkynho.providerOllama') },
                        { value: 'remote', label: t('integrations.denkynho.providerRemote') },
                      ]}
                      onChange={(value) => setField('DENKYNHO_LLM_PROVIDER', value)}
                    />
                  </Field>
                  {renderText('DENKYNHO_LLM_TIMEOUT', 'number')}
                </div>
              </SectionCard>
              <SectionCard
                icon={<BrainOrbIcon />}
                tone="denkynho"
                eyebrow={t('integrations.denkynho.modelEyebrow')}
                title={t('integrations.denkynho.modelTitle')}
                description={t('integrations.denkynho.modelHint')}
              >
                <div className="admin-integrations-stack">
                  {renderText('DENKYNHO_LLM_MODEL', 'text', t('integrations.denkynho.modelExamples'))}
                </div>
              </SectionCard>
              <SectionCard
                icon={<ServerTowerIcon />}
                tone="lineage"
                eyebrow={t('integrations.denkynho.ollamaEyebrow')}
                title={t('integrations.denkynho.ollamaTitle')}
                description={t('integrations.denkynho.ollamaHint')}
              >
                <div className="admin-integrations-stack">
                  {renderText('DENKYNHO_OLLAMA_URL')}
                  {renderBool('DENKYNHO_OLLAMA_DOCKER')}
                </div>
              </SectionCard>
              <SectionCard
                icon={<KeyRingIcon />}
                tone="google"
                eyebrow={t('integrations.denkynho.remoteEyebrow')}
                title={t('integrations.denkynho.remoteTitle')}
                description={t('integrations.denkynho.remoteHint')}
              >
                <div className="admin-integrations-stack">
                  {renderText('DENKYNHO_LLM_API_URL', 'text', t('integrations.denkynho.apiUrlHint'))}
                  {renderSecret('DENKYNHO_LLM_API_KEY')}
                </div>
              </SectionCard>
              <SectionCard
                icon={<RadarPulseIcon />}
                tone="observability"
                eyebrow={t('integrations.denkynho.embedEyebrow')}
                title={t('integrations.denkynho.embedTitle')}
                description={t('integrations.denkynho.embedHint')}
              >
                <div className="admin-integrations-stack">
                  {renderBool('DENKYNHO_EMBEDDINGS_ENABLED')}
                  {renderText('DENKYNHO_EMBEDDING_MODEL')}
                </div>
              </SectionCard>
            </>
          ) : null}

          {tab === 'storage' ? (
            <SectionCard
              icon={<CloudBucketIcon />}
              tone="storage"
              eyebrow={t('integrations.storage.eyebrow')}
              title={t('integrations.storage.title')}
              description={t('integrations.storage.hint')}
            >
              <div className="admin-integrations-stack">
                {renderBool('USE_S3')}
                {renderSecret('AWS_ACCESS_KEY_ID')}
                {renderSecret('AWS_SECRET_ACCESS_KEY')}
                <div className="account-form-fields">
                  {renderText('AWS_STORAGE_BUCKET_NAME')}
                  {renderText('AWS_S3_REGION_NAME')}
                </div>
                {renderText('AWS_S3_ENDPOINT_URL')}
                {renderText('AWS_S3_CUSTOM_DOMAIN')}
                {renderBool('AWS_S3_PRIVATE_MEDIA')}
                <div className="account-form-fields">
                  {renderText('AWS_QUERYSTRING_EXPIRE', 'number')}
                  {renderText('AWS_LOCATION')}
                </div>
              </div>
            </SectionCard>
          ) : null}

          {tab === 'observability' ? (
            <SectionCard
              icon={<RadarPulseIcon />}
              tone="observability"
              eyebrow={t('integrations.observability.eyebrow')}
              title={t('integrations.observability.title')}
              description={t('integrations.observability.hint')}
            >
              <div className="admin-integrations-stack">
                {renderSecret('SENTRY_DSN')}
                <div className="account-form-fields">
                  {renderText('SENTRY_ENVIRONMENT')}
                  {renderText('SENTRY_RELEASE')}
                  {renderText('SENTRY_TRACES_SAMPLE_RATE', 'number')}
                </div>
              </div>
            </SectionCard>
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
