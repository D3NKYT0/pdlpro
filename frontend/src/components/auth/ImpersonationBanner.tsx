import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { authApi, reloadForIdentityChange } from '../../services/api'
import { useAsyncAction } from '../../hooks/useAsyncAction'
import { CornerUpLeft } from 'lucide-react'
import { Button } from '../ui/Button'
import { ErrorNotice } from '../ui/Feedback'
import './impersonation.css'

/** A prova de retorno vive em cookie HttpOnly; recarregar não perde a conta original. */
export function ImpersonationBanner() {
  const { t } = useTranslation('admin')
  const status = useQuery({ queryKey: ['impersonation'], queryFn: () => authApi.impersonation(), retry: false })
  const action = useAsyncAction()
  if (!status.data) return null
  return <aside className="impersonation-return" data-theme-surface="overlay" data-theme-part="impersonation-return" aria-label={t('siteUsers.active', { username: status.data.target_username })}>
    <Button size="sm" variant="secondary" title={t('siteUsers.active', { username: status.data.target_username })} busy={action.pending} onClick={() => void action.run(async () => {
      await authApi.stopImpersonation()
      reloadForIdentityChange('/panel/admin/accounts')
    })}><CornerUpLeft size={15} aria-hidden="true" />{t('siteUsers.return', { username: status.data.username })}</Button>
    <ErrorNotice error={action.error} />
  </aside>
}
