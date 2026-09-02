import { useState, type FormEvent } from 'react'
import { Link2Off, Search, Unlink } from 'lucide-react'
import toast from 'react-hot-toast'
import { isApiError, staffApi, type ApiStaffGameAccount } from '../../services/api'
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
      toast.error(isApiError(error) ? error.message : 'Não foi possível consultar a conta')
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
      toast.error(isApiError(error) ? error.message : 'Não foi possível desvincular')
    } finally {
      setUnlinking(false)
    }
  }

  return (
    <div className="account-page">
      <AdminHeader
        kicker="Servidor"
        title="Contas Lineage"
        description="Consulte um login do jogo e remova o vínculo com o painel."
      />

      <section className="card admin-config-section">
        <header>
          <span><Search /></span>
          <div>
            <span className="panel-eyebrow">Consulta</span>
            <h2>Buscar pelo login</h2>
            <p>O login é o mesmo usado para entrar no jogo.</p>
          </div>
        </header>
        <form className="admin-account-search" onSubmit={onInspect}>
          <label className="field">
            Login da conta L2
            <input value={login} onChange={(event) => setLogin(event.target.value)} required minLength={3} maxLength={45} autoComplete="off" />
          </label>
          <button className="btn" type="submit" disabled={looking || unlinking}>
            {looking ? 'Consultando...' : 'Consultar'}
          </button>
        </form>
      </section>

      {account ? (
        <section className="card admin-config-section">
          <header>
            <span><Unlink /></span>
            <div>
              <span className="panel-eyebrow">Resultado</span>
              <h2>{account.login}</h2>
              <p>{account.linked ? 'Esta conta está vinculada a um painel.' : 'Esta conta não tem vínculo no momento.'}</p>
            </div>
          </header>
          <dl className="admin-account-meta">
            <div>
              <dt>Login</dt>
              <dd>{account.login}</dd>
            </div>
            <div>
              <dt>E-mail no jogo</dt>
              <dd>{account.email || '—'}</dd>
            </div>
            <div>
              <dt>Vínculo</dt>
              <dd>{account.linked ? 'Vinculada' : 'Livre'}</dd>
            </div>
            <div>
              <dt>Usuário do painel</dt>
              <dd>{account.panel_username || '—'}</dd>
            </div>
          </dl>
          {account.linked ? (
            <div className="admin-account-unlink">
              <p className="muted">A conta volta a ficar disponível para criação ou vínculo no painel do jogador.</p>
              <button className="btn is-danger" type="button" onClick={() => void onUnlink()} disabled={unlinking}>
                <Link2Off aria-hidden="true" />
                {unlinking ? 'Desvinculando...' : 'Remover vínculo'}
              </button>
            </div>
          ) : (
            <div className="account-created-state">
              <Link2Off aria-hidden="true" />
              <div>
                <strong>Sem vínculo</strong>
                <span>Não há linked_uuid nesta conta Lineage.</span>
              </div>
            </div>
          )}
        </section>
      ) : null}
    </div>
  )
}
