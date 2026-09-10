import { Card } from '../../components/ui/Card'
import { apiErrorMessage } from '../../lib/errors'
import { Button } from '../../components/ui/Button'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Link2Off, Search, ShieldAlert, Unlink } from 'lucide-react'
import toast from 'react-hot-toast'
import { staffApi, type ApiStaffGameAccount } from '../../services/api'
import { AdminHeader } from './AdminChrome'

export function AdminAccountsPage() {
  const { t } = useTranslation('admin')
  const [login, setLogin] = useState('')
  const [account, setAccount] = useState<ApiStaffGameAccount | null>(null)
  const [looking, setLooking] = useState(false)
  const [unlinking, setUnlinking] = useState(false)

  async function onInspect(event: FormEvent) {
    event.preventDefault()
    setLooking(true)
    try {
      setAccount(await staffApi.inspectAccount(login.trim()))
    } catch (error) {
      setAccount(null)
      toast.error(apiErrorMessage(error, t('accounts.toast.inspectError')))
    } finally {
      setLooking(false)
    }
  }

  async function onUnlink() {
    if (!account) return
    if (!window.confirm(t('accounts.confirmUnlink', { login: account.login }))) {
      return
    }
    setUnlinking(true)
    try {
      const updated = await staffApi.unlinkAccount(account.login)
      setAccount(updated)
      toast.success(t('accounts.toast.unlinked', { login: updated.login }))
    } catch (error) {
      toast.error(apiErrorMessage(error, t('accounts.toast.unlinkError')))
    } finally {
      setUnlinking(false)
    }
  }

  const panelOwner = account?.panel_username || account?.linked_user_id || '—'
  const ownerHint = account?.panel_username
    ? t('accounts.ownerPanelUser')
    : account?.linked_user_id
      ? t('accounts.ownerUuid')
      : t('accounts.ownerNone')

  return (
    <div className="account-page admin-accounts-page">
      <AdminHeader
        kicker={t('accounts.kicker')}
        title={t('accounts.title')}
        description={t('accounts.description')}
      />

      <Card className="admin-accounts-panel">
        <header className="admin-services-heading">
          <span><Search /></span>
          <div>
            <span className="panel-eyebrow">{t('accounts.eyebrow')}</span>
            <h2>{t('accounts.searchTitle')}</h2>
            <p>{t('accounts.searchText')}</p>
          </div>
        </header>
        <form className="admin-accounts-search" onSubmit={onInspect}>
          <label>
            {t('accounts.loginLabel')}
            <input
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              required
              minLength={3}
              maxLength={45}
              autoComplete="off"
              spellCheck={false}
              placeholder={t('accounts.loginPlaceholder')}
            />
          </label>
          <Button type="submit" disabled={looking || unlinking}>
            {looking ? t('accounts.inspecting') : t('accounts.inspect')}
          </Button>
        </form>
      </Card>

      {account ? (
        <section className={`card admin-accounts-result ${account.linked ? 'is-linked' : 'is-free'}`}>
          <header className="admin-accounts-result-head">
            <span className="admin-accounts-result-icon">
              {account.linked ? <ShieldAlert /> : <CheckCircle2 />}
            </span>
            <div>
              <span className="panel-eyebrow">{t('accounts.resultEyebrow')}</span>
              <h2>{account.login}</h2>
              <p>{account.linked ? t('accounts.linkedText') : t('accounts.freeText')}</p>
            </div>
            <b className={`account-status-pill ${account.linked ? 'is-conflict' : 'is-active'}`}>
              {account.linked ? <Unlink /> : <CheckCircle2 />}
              {account.linked ? t('accounts.linked') : t('accounts.free')}
            </b>
          </header>

          <div className="admin-accounts-facts">
            <article>
              <small>{t('accounts.login')}</small>
              <strong>{account.login}</strong>
            </article>
            <article>
              <small>{t('accounts.gameEmail')}</small>
              <strong title={account.email || undefined}>{account.email || '—'}</strong>
            </article>
            <article>
              <small>{t('accounts.link')}</small>
              <strong className={account.linked ? 'is-warn' : 'is-ok'}>
                {account.linked ? t('accounts.linkActive') : t('accounts.linkNone')}
              </strong>
            </article>
            <article>
              <small>{ownerHint}</small>
              <strong className={account.panel_username ? '' : 'is-mono'} title={panelOwner}>
                {panelOwner}
              </strong>
            </article>
          </div>

          {account.linked ? (
            <footer className="admin-accounts-footer">
              <div>
                <strong>{t('accounts.unlinkTitle')}</strong>
                <span>{t('accounts.unlinkText')}</span>
              </div>
              <button type="button" className="admin-accounts-danger" onClick={() => void onUnlink()} disabled={unlinking}>
                <Link2Off aria-hidden="true" />
                {unlinking ? t('accounts.unlinking') : t('accounts.unlink')}
              </button>
            </footer>
          ) : (
            <footer className="admin-accounts-footer is-ok">
              <CheckCircle2 aria-hidden="true" />
              <div>
                <strong>{t('accounts.nothingTitle')}</strong>
                <span>{t('accounts.nothingText')}</span>
              </div>
            </footer>
          )}
        </section>
      ) : null}
    </div>
  )
}
