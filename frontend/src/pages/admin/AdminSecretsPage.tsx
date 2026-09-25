import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { apiErrorMessage } from '../../lib/errors'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  Clock3,
  Database,
  HardDrive,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  Shield,
  ShieldOff,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { staffApi, type ApiSecretsStatus } from '../../services/api'
import { AdminHeader } from './AdminChrome'

type ActionKind =
  | 'rotate_secret_key'
  | 'prune_secret_fallbacks'
  | 'rotate_data_encryption_key'
  | 'reencrypt_sealed_data'
  | 'prune_data_fallbacks'
  | 'rotate_backup_encryption_key'
  | 'revoke_all_sessions'

const ACTION_GROUPS: { titleKey: string; kinds: ActionKind[] }[] = [
  {
    titleKey: 'secrets.groups.django',
    kinds: ['rotate_secret_key', 'prune_secret_fallbacks'],
  },
  {
    titleKey: 'secrets.groups.data',
    kinds: ['rotate_data_encryption_key', 'reencrypt_sealed_data', 'prune_data_fallbacks'],
  },
  {
    titleKey: 'secrets.groups.ops',
    kinds: ['rotate_backup_encryption_key', 'revoke_all_sessions'],
  },
]

const SECRET_ICONS: Record<string, typeof KeyRound> = {
  SECRET_KEY: KeyRound,
  PDL_DATA_ENCRYPTION_KEY: LockKeyhole,
  PDL_DATA_HMAC_KEY: Shield,
  BACKUP_ENCRYPTION_KEY: HardDrive,
  REDIS_PASSWORD: Database,
}

const DANGER_KINDS = new Set<ActionKind>([
  'prune_secret_fallbacks',
  'prune_data_fallbacks',
  'revoke_all_sessions',
])

export function AdminSecretsPage() {
  const { t } = useTranslation('admin')
  const queryClient = useQueryClient()
  const status = useQuery({ queryKey: ['staff-secrets'], queryFn: staffApi.secretsStatus })
  const [confirmation, setConfirmation] = useState('')
  const [selected, setSelected] = useState<ActionKind>('rotate_secret_key')

  const domainHint = status.data?.confirmation_domain || ''
  const unlocked = Boolean(domainHint) && confirmation.trim() === domainHint

  const action = useMutation({
    mutationFn: (kind: ActionKind) =>
      staffApi.secretsAction({ kind, confirmation, apply_now: true }),
    onSuccess: async (result) => {
      if (result.ok) {
        toast.success(result.message || t('secrets.toastOk'))
        if (result.restart_required) toast(t('secrets.restartHint'), { icon: '⚠️' })
        setConfirmation('')
      } else {
        toast.error(result.message || t('secrets.toastFail'))
      }
      await queryClient.invalidateQueries({ queryKey: ['staff-secrets'] })
    },
    onError: (error) => toast.error(apiErrorMessage(error, t('secrets.toastFail'))),
  })

  const selectedLabel = t(`secrets.kinds.${selected}`)
  const isDanger = DANGER_KINDS.has(selected)

  return (
    <div className="account-page">
      <AdminHeader
        kicker={t('secrets.kicker')}
        title={t('secrets.title')}
        description={t('secrets.description')}
      />

      {status.isLoading ? (
        <Card className="admin-config-section">
          <p className="muted">{t('chrome.loading')}</p>
        </Card>
      ) : null}
      {status.isError ? (
        <Card className="admin-config-section">
          <p role="alert">{apiErrorMessage(status.error, t('secrets.loadError'))}</p>
        </Card>
      ) : null}

      {status.data ? (
        <div className="admin-server-form admin-secrets-layout">
          <SecretsOverview data={status.data} />
          <SecretsInventory data={status.data} />
          {status.data.pending_jobs.length > 0 ? <PendingJobs data={status.data} /> : null}

          <Card className="admin-config-section">
            <header>
              <span>
                <RefreshCw aria-hidden="true" />
              </span>
              <div>
                <span className="panel-eyebrow">{t('secrets.actionsEyebrow')}</span>
                <h2>{t('secrets.actionsTitle')}</h2>
                <p>{t('secrets.actionsDescription')}</p>
              </div>
            </header>

            <div className="admin-secrets-action-groups">
              {ACTION_GROUPS.map((group) => (
                <section key={group.titleKey} className="admin-secrets-action-group">
                  <h3>{t(group.titleKey)}</h3>
                  <div className="admin-secrets-choice-list" role="radiogroup" aria-label={t(group.titleKey)}>
                    {group.kinds.map((kind) => (
                      <label
                        key={kind}
                        className={`admin-secrets-choice${selected === kind ? ' is-selected' : ''}${
                          DANGER_KINDS.has(kind) ? ' is-danger' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name="secret-action"
                          value={kind}
                          checked={selected === kind}
                          onChange={() => setSelected(kind)}
                        />
                        <span>
                          <strong>{t(`secrets.kinds.${kind}`)}</strong>
                          <small>{t(`secrets.kindHints.${kind}`)}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            {!status.data.runtime_rotation_enabled ? (
              <p className="admin-secrets-banner is-info">{t('secrets.runtimeOff')}</p>
            ) : null}

            <div className="admin-secrets-confirm">
              <Field>
                <span>
                  {t('secrets.confirmation')}
                  <small>{t('secrets.actionsHint', { domain: domainHint || '…' })}</small>
                </span>
                <input
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  placeholder={domainHint}
                  autoComplete="off"
                  spellCheck={false}
                />
              </Field>
              <Button
                type="button"
                variant={isDanger ? 'danger' : 'primary'}
                size="md"
                busy={action.isPending}
                disabled={!unlocked || action.isPending}
                onClick={() => action.mutate(selected)}
              >
                {isDanger ? <ShieldOff aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
                {unlocked ? t('secrets.runAction', { action: selectedLabel }) : t('secrets.unlockFirst')}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  )
}

function SecretsOverview({ data }: { data: ApiSecretsStatus }) {
  const { t } = useTranslation('admin')
  const healthTone =
    data.action_count > 0 ? 'action' : data.attention_count > 0 ? 'attention' : 'ok'
  const pills = useMemo(
    () => [
      {
        label: t('secrets.meta.health'),
        value:
          data.action_count > 0
            ? t('secrets.meta.healthAction', { count: data.action_count })
            : data.attention_count > 0
              ? t('secrets.meta.healthAttention', { count: data.attention_count })
              : t('secrets.meta.healthOk'),
        tone: healthTone,
      },
      {
        label: t('secrets.meta.ttl'),
        value: t('secrets.meta.ttlValue', { count: data.fallback_ttl_days }),
      },
      {
        label: t('secrets.meta.auto'),
        value: data.auto_rotate_days
          ? t('secrets.meta.autoValue', { count: data.auto_rotate_days })
          : t('secrets.autoOff'),
      },
      {
        label: t('secrets.meta.runtime'),
        value: data.runtime_rotation_enabled ? t('secrets.runtimeOn') : t('secrets.runtimeOffShort'),
        tone: data.runtime_rotation_enabled ? 'ok' : 'muted',
      },
    ],
    [data, healthTone, t],
  )

  return (
    <Card className="admin-config-section">
      <header>
        <span>
          <KeyRound aria-hidden="true" />
        </span>
        <div>
          <span className="panel-eyebrow">{t('secrets.summaryEyebrow')}</span>
          <h2>{t('secrets.summaryTitle')}</h2>
          <p>{t('secrets.summaryDescription')}</p>
        </div>
      </header>
      <div className="admin-secrets-meta">
        {pills.map((pill) => (
          <div key={pill.label} className={`admin-secrets-pill${pill.tone ? ` is-${pill.tone}` : ''}`}>
            <small>{pill.label}</small>
            <strong>{pill.value}</strong>
          </div>
        ))}
      </div>
      {data.action_count > 0 ? (
        <p className="admin-secrets-banner is-action">
          <AlertTriangle aria-hidden="true" />
          {t('secrets.bannerAction', { count: data.action_count })}
        </p>
      ) : null}
      {data.action_count === 0 && data.attention_count > 0 ? (
        <p className="admin-secrets-banner is-warn">
          <AlertTriangle aria-hidden="true" />
          {t('secrets.bannerAttention', { count: data.attention_count })}
        </p>
      ) : null}
      {data.restart_required ? (
        <p className="admin-secrets-banner is-warn">
          <AlertTriangle aria-hidden="true" />
          {t('secrets.restartPending')}
        </p>
      ) : null}
    </Card>
  )
}

const LEVEL_ORDER = { action: 0, attention: 1, optional: 2, ok: 3 } as const

function SecretsInventory({ data }: { data: ApiSecretsStatus }) {
  const { t } = useTranslation('admin')
  const ordered = useMemo(
    () =>
      [...data.secrets].sort(
        (a, b) => (LEVEL_ORDER[a.level] ?? 9) - (LEVEL_ORDER[b.level] ?? 9),
      ),
    [data.secrets],
  )

  return (
    <Card className="admin-config-section">
      <header>
        <span>
          <Shield aria-hidden="true" />
        </span>
        <div>
          <span className="panel-eyebrow">{t('secrets.inventoryEyebrow')}</span>
          <h2>{t('secrets.inventoryTitle')}</h2>
          <p>{t('secrets.inventoryDescription')}</p>
        </div>
      </header>
      <div className="admin-secrets-legend" aria-hidden="true">
        <span className="is-ok">{t('secrets.legendOk')}</span>
        <span className="is-attention">{t('secrets.legendAttention')}</span>
        <span className="is-action">{t('secrets.legendAction')}</span>
        <span className="is-optional">{t('secrets.legendOptional')}</span>
      </div>
      <div className="admin-secrets-inventory">
        {ordered.map((secret) => {
          const Icon = SECRET_ICONS[secret.name] || KeyRound
          const badge =
            secret.level === 'action'
              ? t('secrets.badgeAction')
              : secret.level === 'attention'
                ? t('secrets.badgeStale')
                : secret.level === 'optional'
                  ? t('secrets.badgeOptional')
                  : t('secrets.badgeOk')
          return (
            <article key={secret.name} className={`admin-secrets-row is-${secret.level}`}>
              <Icon aria-hidden="true" />
              <div>
                <strong>{secret.name}</strong>
                <small>
                  {secret.present
                    ? t('secrets.fingerprint', { value: secret.fingerprint })
                    : t('secrets.missing')}
                  {' · '}
                  {t('secrets.fallbacks', { count: secret.fallback_count })}
                  {secret.rotated_at
                    ? ` · ${t('secrets.rotatedAt', { value: secret.rotated_at })}`
                    : ''}
                </small>
                {secret.notes[0] ? <em>{secret.notes[0]}</em> : null}
              </div>
              <b className={`is-${secret.level}`}>{badge}</b>
            </article>
          )
        })}
      </div>
    </Card>
  )
}

function PendingJobs({ data }: { data: ApiSecretsStatus }) {
  const { t } = useTranslation('admin')
  return (
    <Card className="admin-config-section">
      <header>
        <span>
          <Clock3 aria-hidden="true" />
        </span>
        <div>
          <span className="panel-eyebrow">{t('secrets.pendingEyebrow')}</span>
          <h2>{t('secrets.pendingTitle')}</h2>
          <p>{t('secrets.pendingHint')}</p>
        </div>
      </header>
      <div className="admin-secrets-inventory">
        {data.pending_jobs.map((job) => (
          <article key={String(job.id)} className="admin-secrets-row is-attention">
            <Clock3 aria-hidden="true" />
            <div>
              <strong>{String(job.kind)}</strong>
              <small>{String(job.created_at || '')}</small>
            </div>
            <b className="is-attention">{String(job.status)}</b>
          </article>
        ))}
      </div>
    </Card>
  )
}
