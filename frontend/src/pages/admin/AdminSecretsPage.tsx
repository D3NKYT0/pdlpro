import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { apiErrorMessage } from '../../lib/errors'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { KeyRound, RefreshCw, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import { staffApi, type ApiSecretsStatus } from '../../services/api'
import { AdminHeader } from './AdminChrome'

const ACTIONS = [
  'rotate_secret_key',
  'prune_secret_fallbacks',
  'rotate_data_encryption_key',
  'reencrypt_sealed_data',
  'prune_data_fallbacks',
  'rotate_backup_encryption_key',
  'revoke_all_sessions',
] as const

export function AdminSecretsPage() {
  const { t } = useTranslation('admin')
  const queryClient = useQueryClient()
  const status = useQuery({ queryKey: ['staff-secrets'], queryFn: staffApi.secretsStatus })
  const [confirmation, setConfirmation] = useState('')
  const [busyKind, setBusyKind] = useState<string | null>(null)
  const domainHint = status.data?.confirmation_domain || ''

  const action = useMutation({
    mutationFn: (kind: string) =>
      staffApi.secretsAction({ kind, confirmation, apply_now: true }),
    onMutate: (kind) => setBusyKind(kind),
    onSettled: () => setBusyKind(null),
    onSuccess: async (result) => {
      if (result.ok) {
        toast.success(result.message || t('secrets.toastOk'))
        if (result.restart_required) toast(t('secrets.restartHint'), { icon: '⚠️' })
      } else {
        toast.error(result.message || t('secrets.toastFail'))
      }
      await queryClient.invalidateQueries({ queryKey: ['staff-secrets'] })
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  return (
    <div className="admin-page admin-secrets">
      <AdminHeader
        kicker={t('secrets.kicker')}
        title={t('secrets.title')}
        description={t('secrets.description')}
      />

      {status.isLoading ? (
        <Card>
          <p>{t('chrome.loading')}</p>
        </Card>
      ) : null}
      {status.isError ? (
        <Card>
          <p>{apiErrorMessage(status.error)}</p>
        </Card>
      ) : null}

      {status.data ? <SecretsBody data={status.data} /> : null}

      <Card className="admin-secrets-actions">
        <h2>{t('secrets.actionsTitle')}</h2>
        <p>{t('secrets.actionsHint', { domain: domainHint || '…' })}</p>
        <Field label={t('secrets.confirmation')}>
          <input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={domainHint}
            autoComplete="off"
          />
        </Field>
        <div className="admin-secrets-action-grid">
          {ACTIONS.map((kind) => (
            <Button
              key={kind}
              type="button"
              variant={kind.startsWith('revoke') || kind.startsWith('prune') ? 'danger' : 'secondary'}
              busy={busyKind === kind}
              disabled={!confirmation.trim() || action.isPending}
              onClick={() => action.mutate(kind)}
            >
              {kind.startsWith('rotate') || kind === 'reencrypt_sealed_data' ? (
                <RefreshCw aria-hidden="true" />
              ) : (
                <ShieldAlert aria-hidden="true" />
              )}
              {t(`secrets.kinds.${kind}`)}
            </Button>
          ))}
        </div>
        {!status.data?.runtime_rotation_enabled ? (
          <p className="admin-secrets-note">{t('secrets.runtimeOff')}</p>
        ) : null}
      </Card>
    </div>
  )
}

function SecretsBody({ data }: { data: ApiSecretsStatus }) {
  const { t } = useTranslation('admin')
  return (
    <>
      <Card className="admin-secrets-summary">
        <div className="admin-secrets-summary-row">
          <KeyRound aria-hidden="true" />
          <div>
            <strong>{t('secrets.summaryTitle')}</strong>
            <p>
              {t('secrets.summaryMeta', {
                ttl: data.fallback_ttl_days,
                auto: data.auto_rotate_days || t('secrets.autoOff'),
                runtime: data.runtime_rotation_enabled
                  ? t('secrets.runtimeOn')
                  : t('secrets.runtimeOffShort'),
              })}
            </p>
            {data.restart_required ? (
              <p className="admin-secrets-warn">{t('secrets.restartPending')}</p>
            ) : null}
          </div>
        </div>
      </Card>

      <div className="admin-secrets-grid">
        {data.secrets.map((secret) => (
          <Card key={secret.name}>
            <h3>{secret.name}</h3>
            <p>
              {secret.present
                ? t('secrets.fingerprint', { value: secret.fingerprint })
                : t('secrets.missing')}
            </p>
            <p>{t('secrets.fallbacks', { count: secret.fallback_count })}</p>
            {secret.rotated_at ? <p>{t('secrets.rotatedAt', { value: secret.rotated_at })}</p> : null}
            {secret.stale_fallbacks ? <p className="admin-secrets-warn">{t('secrets.stale')}</p> : null}
            {secret.notes.map((note) => (
              <p key={note} className="admin-secrets-note">
                {note}
              </p>
            ))}
          </Card>
        ))}
      </div>

      {data.pending_jobs.length > 0 ? (
        <Card>
          <h2>{t('secrets.pendingTitle')}</h2>
          <ul>
            {data.pending_jobs.map((job) => (
              <li key={String(job.id)}>
                {String(job.kind)} — {String(job.status)} ({String(job.created_at || '')})
              </li>
            ))}
          </ul>
          <p className="admin-secrets-note">{t('secrets.pendingHint')}</p>
        </Card>
      ) : null}
    </>
  )
}
