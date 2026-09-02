import { Card } from '../components/ui/Card'
import { apiErrorMessage } from '../lib/errors'
import { Field } from '../components/ui/Field'
import { Button } from '../components/ui/Button'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CheckCircle2, ChevronRight, Crown, Link2, ShieldAlert, ShieldCheck, UserRoundPlus, UsersRound } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getClassName } from '../lib/lineage'
import { isApiError, lineageApi } from '../services/api'

export function AccountsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const accounts = useQuery({ queryKey: ['lineage-accounts'], queryFn: lineageApi.accounts })
  const [params, setParams] = useSearchParams()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [alternateLogin, setAlternateLogin] = useState('')
  const [useAlternateLogin, setUseAlternateLogin] = useState(false)
  const [linkEmail, setLinkEmail] = useState('')
  const [submitting, setSubmitting] = useState<'register' | 'email' | 'link' | null>(null)
  const linkedAccounts = accounts.data?.accounts ?? []
  const primaryAccount = linkedAccounts.find((item) => item.is_primary)
  const selectedLogin = primaryAccount?.login ?? linkedAccounts[0]?.login
  const preferredLogin = accounts.data?.primary?.login ?? user?.username ?? ''
  const primaryStatus = accounts.data?.primary?.status
  const primaryTaken = Boolean(!primaryAccount && (primaryStatus === 'taken' || useAlternateLogin))
  const primaryUnclaimed = Boolean(!primaryAccount && primaryStatus === 'unclaimed' && !useAlternateLogin)

  const characters = useQuery({
    queryKey: ['characters', selectedLogin],
    queryFn: () => lineageApi.characters(selectedLogin),
    enabled: Boolean(selectedLogin),
  })

  async function onRegister(event: FormEvent) {
    event.preventDefault()
    setSubmitting('register')
    try {
      await lineageApi.register(registerPassword, primaryTaken ? alternateLogin : undefined)
      toast.success(primaryUnclaimed ? 'Conta Lineage vinculada' : 'Conta Lineage criada e vinculada')
      await queryClient.invalidateQueries({ queryKey: ['lineage-accounts'] })
      setRegisterPassword('')
      setAlternateLogin('')
      setUseAlternateLogin(false)
    } catch (error) {
      if (isApiError(error) && error.errorCode === 'ACCOUNT_ALREADY_LINKED') {
        setUseAlternateLogin(true)
      }
      toast.error(apiErrorMessage(error, 'Falha ao registrar'))
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
      .catch((error) => toast.error(apiErrorMessage(error, 'Falha ao confirmar vínculo')))
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
      toast.error(apiErrorMessage(error, 'Falha ao solicitar vínculo'))
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
      toast.error(apiErrorMessage(error, 'Falha ao vincular'))
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <div className="account-page">
      <Card as="header" className="account-hero">
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
      </Card>

      <div className="grid cols-2 account-content-grid">
        <Card className="account-management">
          <div className="account-section-heading">
            <div>
              <span className="panel-eyebrow">Acesso ao servidor</span>
              <h2>Suas contas</h2>
            </div>
            <span className={`account-status-pill ${primaryAccount ? 'is-active' : ''} ${primaryTaken ? 'is-conflict' : ''}`}>
              {primaryAccount ? <CheckCircle2 aria-hidden="true" /> : primaryTaken ? <ShieldAlert aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
              {primaryAccount ? 'Principal ativa' : primaryTaken ? 'Login ocupado' : 'Aguardando criação'}
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

          {!accounts.isLoading && !primaryAccount && primaryTaken ? (
            <div className="account-created-state is-conflict">
              <ShieldAlert aria-hidden="true" />
              <div>
                <strong>O login {preferredLogin} já está vinculado</strong>
                <span>
                  Essa conta Lineage pertence a outro painel. Crie a principal com outro login ou vincule abaixo uma conta que já seja sua.
                </span>
              </div>
            </div>
          ) : null}

          {!accounts.isLoading && !primaryAccount ? (
            <form className="account-action-form" onSubmit={onRegister}>
              <div className="account-form-title">
                <UserRoundPlus aria-hidden="true" />
                <div>
                  <h3>{primaryTaken ? 'Criar com outro login' : primaryUnclaimed ? 'Reivindicar conta principal' : 'Criar conta principal'}</h3>
                  <p>
                    {primaryTaken
                      ? 'Escolha um login livre para o jogo. Ele fica vinculado a este painel.'
                      : primaryUnclaimed
                        ? <>Já existe uma conta <strong>{preferredLogin}</strong> no servidor. Informe a senha do jogo para vinculá-la.</>
                        : <>O login do jogo será <strong>{preferredLogin}</strong>.</>}
                  </p>
                </div>
              </div>
              {primaryTaken ? (
                <Field>
                  Novo login do jogo
                  <input
                    value={alternateLogin}
                    onChange={(e) => setAlternateLogin(e.target.value)}
                    required
                    minLength={3}
                    maxLength={16}
                    autoComplete="username"
                  />
                </Field>
              ) : null}
              <Field>
                Senha do jogo
                <input type="password" value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} required minLength={6} />
              </Field>
              <Button type="submit" disabled={submitting !== null}>
                {submitting === 'register'
                  ? (primaryUnclaimed ? 'Vinculando...' : 'Criando...')
                  : (primaryTaken ? 'Criar conta principal' : primaryUnclaimed ? 'Vincular conta' : 'Criar e vincular')}
              </Button>
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
            <Field>
              E-mail no jogo
              <input type="email" value={linkEmail} onChange={(e) => setLinkEmail(e.target.value)} required />
            </Field>
            <Button type="submit" disabled={submitting !== null}>
              {submitting === 'email' ? 'Enviando...' : 'Enviar link'}
            </Button>
          </form>

          <form className="account-action-form" onSubmit={onLink}>
            <h3>Vincular conta existente</h3>
            <p className="muted">Use o login e a senha de uma conta adicional já existente.</p>
            <div className="account-form-fields">
              <Field>
                Login
                <input value={login} onChange={(e) => setLogin(e.target.value)} required />
              </Field>
              <Field>
                Senha
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </Field>
            </div>
            <Button type="submit" disabled={submitting !== null}>
              {submitting === 'link' ? 'Vinculando...' : 'Vincular conta'}
            </Button>
          </form>
        </Card>

        <Card className="account-characters">
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
                  <th>Classe</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(characters.data ?? []).map((char) => (
                  <tr
                    key={char.char_id}
                    role="link"
                    tabIndex={0}
                    onClick={() => navigate(`/painel/accounts/${selectedLogin}/${char.char_id}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        navigate(`/painel/accounts/${selectedLogin}/${char.char_id}`)
                      }
                    }}
                  >
                    <td>
                      <Link
                        className="account-character-link"
                        to={`/painel/accounts/${selectedLogin}/${char.char_id}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {char.name}
                      </Link>
                    </td>
                    <td>{char.level}</td>
                    <td>{getClassName(char.class_id)}</td>
                    <td><span className={`badge ${char.online ? '' : 'off'}`}>{char.online ? 'Online' : 'Offline'}</span></td>
                    <td>
                      <Link
                        className="account-character-open"
                        to={`/painel/accounts/${selectedLogin}/${char.char_id}`}
                        aria-label={`Abrir ${char.name}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <ChevronRight aria-hidden="true" />
                      </Link>
                    </td>
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
        </Card>
      </div>
    </div>
  )
}
