import { useState, type FormEvent } from 'react'
import { Search, LogIn, UserRound, ShieldCheck } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { authApi, reloadForIdentityChange } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { formatNumber } from '../../lib/formatters'
import { useAsyncAction } from '../../hooks/useAsyncAction'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { EmptyState, ErrorNotice, LoadingState } from '../ui/Feedback'
import './impersonation.css'

/** Consulta paginada de contas do site e entrada temporária no painel do usuário. */
export function SiteUsersAdmin() {
  const { t } = useTranslation('admin')
  const { user } = useAuth()
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const action = useAsyncAction()
  const users = useQuery({ queryKey: ['admin-site-users', search, page], queryFn: () => authApi.siteUsers(search, page), enabled: Boolean(user?.is_superuser) })
  if (!user?.is_superuser) return null
  function submit(event: FormEvent) { event.preventDefault(); setSearch(input.trim()); setPage(1) }
  return <Card data-theme-part="site-users">
    <header className="site-users-heading">
      <span className="site-users-heading-icon"><UserRound aria-hidden="true" /></span>
      <div><h2>{t('siteUsers.title')}</h2><p>{t('siteUsers.description')}</p></div>
    </header>
    <form className="site-users-search" onSubmit={submit}>
      <Field className="site-users-search-field">{t('siteUsers.search')}<input value={input} maxLength={100} onChange={event => setInput(event.target.value)} /></Field>
      <Button type="submit" disabled={users.isFetching || action.pending}><Search size={16} aria-hidden="true" />{t('common:search')}</Button>
    </form>
    {users.isPending && <LoadingState />}
    <ErrorNotice error={users.error} onRetry={() => void users.refetch()} />
    <ErrorNotice error={action.error} />
    {users.data && <>
      {users.data.results.length === 0 && <EmptyState>{t('siteUsers.empty')}</EmptyState>}
      <div className="site-users-list" role="list">
        {users.data.results.map(row => <div key={row.id} role="listitem" className="site-users-row" data-theme-part="site-user-row">
          <span className="site-users-avatar" aria-hidden="true">{row.can_impersonate ? <UserRound size={20} /> : <ShieldCheck size={20} />}</span>
          <div className="site-users-identity">
            <strong>{row.username}</strong>
            {row.display_name && <span className="site-users-name">{row.display_name}</span>}
            <span className="site-users-email">{row.email}</span>
          </div>
          <Button size="sm" variant={row.can_impersonate ? 'secondary' : 'muted'} disabled={!row.can_impersonate || action.pending} onClick={() => void action.run(async () => {
            await authApi.startImpersonation(row.id)
            reloadForIdentityChange('/panel')
          })}><LogIn size={16} aria-hidden="true" />{t('siteUsers.enter', { username: row.username })}</Button>
        </div>)}
      </div>
      <nav className="site-users-pagination" aria-label={t('siteUsers.pagination')}>
        <Button disabled={page <= 1 || users.isFetching || action.pending} onClick={() => setPage(page - 1)}>{t('siteUsers.previous')}</Button>
        <span>{t('siteUsers.page', { page: formatNumber(page), count: formatNumber(users.data.count) })}</span>
        <Button disabled={page * 20 >= users.data.count || users.isFetching || action.pending} onClick={() => setPage(page + 1)}>{t('siteUsers.next')}</Button>
      </nav>
    </>}
  </Card>
}
