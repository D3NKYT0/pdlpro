import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CheckCircle2, Crown, Link2, ShieldCheck, UserRoundPlus, UsersRound } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { isApiError, lineageApi } from '../services/api'

export function AccountsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const accounts = useQuery({ queryKey: ['lineage-accounts'], queryFn: lineageApi.accounts })
  const [params, setParams] = useSearchParams()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [linkEmail, setLinkEmail] = useState('')
  const [submitting, setSubmitting] = useState<'register' | 'email' | 'link' | null>(null)
  const linkedAccounts = accounts.data?.accounts ?? []
  const primaryAccount = linkedAccounts.find((item) => item.is_primary)
  const selectedLogin = primaryAccount?.login ?? linkedAccounts[0]?.login

  const characters = useQuery({
    queryKey: ['characters', selectedLogin],
    queryFn: () => lineageApi.characters(selectedLogin),
    enabled: Boolean(selectedLogin),
  })

  async function onRegister(event: FormEvent) {
    event.preventDefault()
    setSubmitting('register')
    try {
      await lineageApi.register(registerPassword)
      toast.success('Conta Lineage criada e vinculada')
      await queryClient.invalidateQueries({ queryKey: ['lineage-accounts'] })
      setRegisterPassword('')
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Falha ao registrar')
    } finally {
      setSubmitting(null)
    }
  }

  useEffect(() => {
    const token = params.get('link_token')
    if (!token) return
    lineageApi
      .confirmLinkByEmail(token)
      .then(async () => {
        toast.success('Conta Lineage vinculada pelo e-mail')
        await queryClient.invalidateQueries({ queryKey: ['lineage-accounts'] })
      })
      .catch((error) => toast.error(isApiError(error) ? error.message : 'Falha ao confirmar vínculo'))
      .finally(() => {
        params.delete('link_token')
        setParams(params, { replace: true })
      })
  }, [params, queryClient, setParams])

  async function onLinkByEmail(event: FormEvent) {
    event.preventDefault()
    setSubmitting('email')
    try {
      await lineageApi.requestLinkByEmail(linkEmail)
      toast.success('Enviamos o link para o e-mail da conta Lineage')
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Falha ao solicitar vínculo')
    } finally {
      setSubmitting(null)
    }
  }

  async function onLink(event: FormEvent) {
    event.preventDefault()
    setSubmitting('link')
    try {
      await lineageApi.link(login, password)
      toast.success('Conta vinculada')
      await queryClient.invalidateQueries({ queryKey: ['lineage-accounts'] })
      setLogin('')
      setPassword('')
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Falha ao vincular')
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <div className="account-page">
      <header className="card account-hero">
        <div>
          <span className="panel-eyebrow">Central de personagens</span>
          <h1>Conta Lineage</h1>
          <p className="muted">Gerencie o acesso ao jogo e as contas vinculadas ao seu painel.</p>
        </div>
        <div className="account-slot-summary" aria-label="Slots para contas adicionais">
          <UsersRound aria-hidden="true" />
          <span>Contas adicionais</span>
          <strong>{accounts.data?.slots.used ?? 0}/{accounts.data?.slots.total ?? 0}</strong>
        </div>
      </header>

      <div className="grid cols-2 account-content-grid">
        <section className="card account-management">
          <div className="account-section-heading">
            <div>
              <span className="panel-eyebrow">Acesso ao servidor</span>
              <h2>Suas contas</h2>
            </div>
            <span className={`account-status-pill ${primaryAccount ? 'is-active' : ''}`}>
              {primaryAccount ? <CheckCircle2 aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
              {primaryAccount ? 'Principal ativa' : 'Aguardando criação'}
            </span>
          </div>

          {accounts.isLoading ? <div className="account-empty-state">Carregando contas...</div> : null}

          {!accounts.isLoading && linkedAccounts.length > 0 ? (
            <div className="account-list">
              {linkedAccounts.map((item) => (
                <div className="account-list-item" key={item.login}>
                  <span className="account-list-icon">
                    {item.is_primary ? <Crown aria-hidden="true" /> : <Link2 aria-hidden="true" />}
                  </span>
                  <span>
                    <strong>{item.login}</strong>
                    <small>{item.is_primary ? 'Conta principal do jogo' : 'Conta adicional vinculada'}</small>
                  </span>
                  <b>Vinculada</b>
                </div>
              ))}
            </div>
          ) : null}

          {!accounts.isLoading && !primaryAccount ? (
            <form className="account-action-form" onSubmit={onRegister}>
              <div className="account-form-title">
                <UserRoundPlus aria-hidden="true" />
                <div>
                  <h3>Criar conta principal</h3>
                  <p>O login do jogo será <strong>{user?.username}</strong>.</p>
                </div>
              </div>
              <label className="field">
                Senha do jogo
                <input type="password" value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} required minLength={6} />
              </label>
              <button className="btn" type="submit" disabled={submitting !== null}>
                {submitting === 'register' ? 'Criando...' : 'Criar e vincular'}
              </button>
            </form>
          ) : null}

          {primaryAccount ? (
            <div className="account-created-state">
              <CheckCircle2 aria-hidden="true" />
              <div>
                <strong>Conta pronta para jogar</strong>
                <span>A conta {primaryAccount.login} está criada no servidor e vinculada a este painel.</span>
              </div>
            </div>
          ) : null}

          <form className="account-action-form" onSubmit={onLinkByEmail}>
            <h3>Vincular pelo e-mail da conta L2</h3>
            <p className="muted">Receba um link de confirmação no endereço cadastrado no jogo.</p>
            <label className="field">
              E-mail no jogo
              <input type="email" value={linkEmail} onChange={(e) => setLinkEmail(e.target.value)} required />
            </label>
            <button className="btn" type="submit" disabled={submitting !== null}>
              {submitting === 'email' ? 'Enviando...' : 'Enviar link'}
            </button>
          </form>

          <form className="account-action-form" onSubmit={onLink}>
            <h3>Vincular conta existente</h3>
            <p className="muted">Use o login e a senha de uma conta adicional já existente.</p>
            <div className="account-form-fields">
              <label className="field">
                Login
                <input value={login} onChange={(e) => setLogin(e.target.value)} required />
              </label>
              <label className="field">
                Senha
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </label>
            </div>
            <button className="btn" type="submit" disabled={submitting !== null}>
              {submitting === 'link' ? 'Vinculando...' : 'Vincular conta'}
            </button>
          </form>
        </section>

        <section className="card account-characters">
          <div className="account-section-heading">
            <div>
              <span className="panel-eyebrow">Mundo do jogo</span>
              <h2>Personagens</h2>
            </div>
            {selectedLogin ? <span className="account-login-chip">{selectedLogin}</span> : null}
          </div>
          {characters.isLoading ? <div className="account-empty-state">Carregando personagens...</div> : null}
          {!characters.isLoading && selectedLogin ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Lv</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(characters.data ?? []).map((char) => (
                  <tr key={char.char_id}>
                    <td>{char.name}</td>
                    <td>{char.level}</td>
                    <td><span className={`badge ${char.online ? '' : 'off'}`}>{char.online ? 'Online' : 'Offline'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          {!characters.isLoading && selectedLogin && !characters.data?.length ? (
            <div className="account-empty-state">
              <UsersRound aria-hidden="true" />
              <strong>Nenhum personagem criado</strong>
              <span>Entre no jogo com a conta {selectedLogin} para criar seu primeiro personagem.</span>
            </div>
          ) : null}
          {!characters.isLoading && !selectedLogin ? (
            <div className="account-empty-state">
              <UserRoundPlus aria-hidden="true" />
              <strong>Nenhuma conta vinculada</strong>
              <span>Crie sua conta principal ou vincule uma conta existente para ver os personagens.</span>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
