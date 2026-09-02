import { Card } from '../../components/ui/Card'
import { apiErrorMessage } from '../../lib/errors'
import { Button } from '../../components/ui/Button'
import { useState, type FormEvent } from 'react'
import { CheckCircle2, Link2Off, Search, ShieldAlert, Unlink } from 'lucide-react'
import toast from 'react-hot-toast'
import { staffApi, type ApiStaffGameAccount } from '../../services/api'
import { AdminHeader } from './AdminChrome'

export function AdminAccountsPage() {
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
      toast.error(apiErrorMessage(error, 'Não foi possível consultar a conta'))
    } finally {
      setLooking(false)
    }
  }

  async function onUnlink() {
    if (!account) return
    if (!window.confirm(`Desvincular a conta ${account.login} do painel? Ela fica livre para ser reivindicada.`)) {
      return
    }
    setUnlinking(true)
    try {
      const updated = await staffApi.unlinkAccount(account.login)
      setAccount(updated)
      toast.success(`O vínculo de ${updated.login} foi removido`)
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Não foi possível desvincular'))
    } finally {
      setUnlinking(false)
    }
  }

  const panelOwner = account?.panel_username || account?.linked_user_id || '—'
  const ownerHint = account?.panel_username
    ? 'Usuário do painel'
    : account?.linked_user_id
      ? 'UUID sem usuário no painel'
      : 'Sem dono no painel'

  return (
    <div className="account-page admin-accounts-page">
      <AdminHeader
        kicker="Servidor"
        title="Contas Lineage"
        description="Consulte um login do jogo e remova o vínculo com o painel."
      />

      <Card className="admin-accounts-panel">
        <header className="admin-services-heading">
          <span><Search /></span>
          <div>
            <span className="panel-eyebrow">Consulta</span>
            <h2>Buscar pelo login</h2>
            <p>Use o mesmo login com que o jogador entra no Lineage.</p>
          </div>
        </header>
        <form className="admin-accounts-search" onSubmit={onInspect}>
          <label>
            Login da conta L2
            <input
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              required
              minLength={3}
              maxLength={45}
              autoComplete="off"
              spellCheck={false}
              placeholder="admin"
            />
          </label>
          <Button type="submit" disabled={looking || unlinking}>
            {looking ? 'Consultando...' : 'Consultar'}
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
              <span className="panel-eyebrow">Resultado</span>
              <h2>{account.login}</h2>
              <p>
                {account.linked
                  ? 'Esta conta Lineage está presa a um painel.'
                  : 'Esta conta está livre para ser criada ou vinculada.'}
              </p>
            </div>
            <b className={`account-status-pill ${account.linked ? 'is-conflict' : 'is-active'}`}>
              {account.linked ? <Unlink /> : <CheckCircle2 />}
              {account.linked ? 'Vinculada' : 'Livre'}
            </b>
          </header>

          <div className="admin-accounts-facts">
            <article>
              <small>Login</small>
              <strong>{account.login}</strong>
            </article>
            <article>
              <small>E-mail no jogo</small>
              <strong title={account.email || undefined}>{account.email || '—'}</strong>
            </article>
            <article>
              <small>Vínculo</small>
              <strong className={account.linked ? 'is-warn' : 'is-ok'}>
                {account.linked ? 'Ativo no servidor' : 'Sem linked_uuid'}
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
                <strong>Remover o vínculo</strong>
                <span>A conta volta a ficar disponível para criação ou vínculo no painel do jogador.</span>
              </div>
              <button type="button" className="admin-accounts-danger" onClick={() => void onUnlink()} disabled={unlinking}>
                <Link2Off aria-hidden="true" />
                {unlinking ? 'Desvinculando...' : 'Remover vínculo'}
              </button>
            </footer>
          ) : (
            <footer className="admin-accounts-footer is-ok">
              <CheckCircle2 aria-hidden="true" />
              <div>
                <strong>Nada a remover</strong>
                <span>Não há linked_uuid nesta conta Lineage.</span>
              </div>
            </footer>
          )}
        </section>
      ) : null}
    </div>
  )
}
