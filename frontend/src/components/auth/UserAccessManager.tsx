import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { CheckCircle2, Eye, Info, Save, ShieldCheck } from 'lucide-react'
import { authApi, type ApiUserAccess } from '../../services/api'
import { useAsyncAction } from '../../hooks/useAsyncAction'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'
import { Toggle } from '../ui/Toggle'
import { ErrorNotice, LoadingState } from '../ui/Feedback'
import { RoleBadge } from './RoleBadge'

/** Carrega o estado atual antes de editar; o backend decide concessões e valida a revisão. */
export function UserAccessManager({ id, username, onClose }: { id: string; username: string; onClose: () => void }) {
  const { t } = useTranslation('admin')
  const state = useQuery({ queryKey: ['admin-user-access', id], queryFn: () => authApi.userAccess(id), staleTime: 0 })
  const catalog = useQuery({ queryKey: ['admin-access-roles'], queryFn: authApi.accessRoles })
  return <Modal open title={t('access.title', { username })} onClose={onClose}>
    {(state.isPending || catalog.isPending) && <LoadingState />}
    <ErrorNotice error={state.error || catalog.error} onRetry={() => { void state.refetch(); void catalog.refetch() }} />
    {state.data && catalog.data && <AccessForm key={state.data.revision} current={state.data} catalog={catalog.data.roles} groupCatalog={catalog.data.additional_role_capabilities ?? catalog.data.roles} onClose={onClose} />}
  </Modal>
}

function AccessForm({ current, catalog, groupCatalog, onClose }: { current: ApiUserAccess; catalog: Record<string, string[]>; groupCatalog: Record<string, string[]>; onClose: () => void }) {
  const { t } = useTranslation('admin')
  const client = useQueryClient()
  const action = useAsyncAction()
  const [role, setRole] = useState(current.role)
  const [additional, setAdditional] = useState(current.additional_roles)
  const [entry, setEntry] = useState(current.is_staff)
  const selectedRoles = [...new Set([role, ...additional])]
  const preview = [...new Set([...(catalog[role] ?? []), ...additional.flatMap(slug => groupCatalog[slug] ?? []), ...current.extra_capabilities])].sort()
  const disabled = action.pending || current.is_superuser
  const roleName = (slug: string) => t(`panel:profile.roles.${slug}`)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (disabled) return
    const result = await action.run(async () => {
      const updated = await authApi.updateUserAccess(current.id, { role, additional_roles: additional, is_staff: entry, revision: current.revision })
      await client.invalidateQueries({ queryKey: ['admin-site-users'] })
      client.setQueryData(['admin-user-access', current.id], updated)
    })
    if (result.ok) toast.success(t('access.saved'))
  }
  return <form className="user-access-form" onSubmit={event => void submit(event)}>
    <p className="user-access-intro"><Info size={18} aria-hidden="true" />{t('access.description')}</p>
    {current.is_superuser && <p role="status">{t('access.protected')}</p>}
    <label htmlFor="access-primary-role">{t('access.primary')}</label>
    <Select id="access-primary-role" value={role} disabled={disabled} options={Object.keys(catalog).map(value => ({ value, label: roleName(value) }))} onChange={setRole} />
    <fieldset disabled={disabled}>
      <legend>{t('access.additional')}</legend>
      {Object.keys(catalog).map(slug => <Toggle className="user-access-role-option" key={slug} label={<RoleBadge role={slug} />} checked={additional.includes(slug)} onChange={event => setAdditional(event.target.checked ? [...additional, slug] : additional.filter(value => value !== slug))} />)}
    </fieldset>
    <Toggle label={t('access.adminEntry')} checked={entry} disabled={disabled} onChange={event => setEntry(event.target.checked)} />
    <p>{t('access.adminHint')}</p>
    <section className="user-access-preview" data-theme-part="access-preview" aria-label={t('access.preview')}>
      <h3><ShieldCheck size={19} aria-hidden="true" />{t('access.preview')}</h3>
      <div className="user-access-selected-roles" aria-live="polite" aria-atomic="true">
        {selectedRoles.map(slug => <div key={slug} className="user-access-role-summary">
          <RoleBadge role={slug} />
          {['player', 'supporter', 'promoter', 'partner'].includes(slug) && <p>{t(`access.roleDescriptions.${slug}`)}</p>}
        </div>)}
      </div>
      {preview.length ? <ul>{preview.map(capability => { const [area, operation] = capability.split('.'); const Icon = operation === 'manage' ? CheckCircle2 : Eye; return <li key={capability} data-operation={operation}><Icon size={15} aria-hidden="true" />{t(`access.areas.${area}`)} — {t(operation === 'manage' ? 'access.manageAction' : 'access.view')}</li> })}</ul> : <p>{t('access.personalOnly')}</p>}
    </section>
    {(current.explicit_permissions.length > 0 || current.other_groups.length > 0) && <details>
      <summary>{t('access.extraGrants')}</summary>
      <p>{t('access.extraHint')}</p>
      <ul>{[...current.other_groups, ...current.explicit_permissions].map(grant => <li key={grant}>{grant}</li>)}</ul>
    </details>}
    <ErrorNotice error={action.error} />
    <footer className="user-access-actions">
      <Button type="submit" variant="success" busy={action.pending} disabled={disabled}><Save size={16} aria-hidden="true" />{t('access.save')}</Button>
      <Button disabled={action.pending} onClick={onClose}>{t('access.close')}</Button>
    </footer>
  </form>
}
