import { Card } from '../components/ui/Card'
import { apiErrorMessage } from '../lib/errors'
import { Field } from '../components/ui/Field'
import { Button } from '../components/ui/Button'
import { ErrorNotice } from '../components/ui/Feedback'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { CheckCircle2, ChevronRight, Crown, Link2, ShieldAlert, ShieldCheck, UserRoundPlus, UsersRound } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useActiveAccount } from '../contexts/ActiveAccountContext'
import { CharacterAvatar } from '../components/character/CharacterAvatar'
import { getClassName } from '../lib/lineage'
import { isApiError, lineageApi } from '../services/api'
import { useLaunchAccess } from '../hooks/useLaunchAccess'

export function AccountsPage() {
  const { t } = useTranslation('panel')
  const { user } = useAuth()
  const { activeLogin, setActiveAccount: selectActiveAccount } = useActiveAccount()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const accounts = useQuery({ queryKey: ['lineage-accounts'], queryFn: lineageApi.accounts })
  const launch = useLaunchAccess()
  const [params, setParams] = useSearchParams()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [registerLogin, setRegisterLogin] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [alternateLogin, setAlternateLogin] = useState('')
  const [useAlternateLogin, setUseAlternateLogin] = useState(false)
  const [linkEmail, setLinkEmail] = useState('')
  const [submitting, setSubmitting] = useState<'register' | 'email' | 'link' | null>(null)
  const linkedAccounts = accounts.data?.accounts ?? []
  const primaryAccount = linkedAccounts.find((item) => item.is_primary)
  const selectedLogin = activeLogin ?? primaryAccount?.login ?? linkedAccounts[0]?.login
  const preferredLogin = accounts.data?.primary?.login ?? user?.username ?? ''
  const primaryStatus = accounts.data?.primary?.status
  const primaryTaken = Boolean(!primaryAccount && (primaryStatus === 'taken' || useAlternateLogin))
  const primaryUnclaimed = Boolean(!primaryAccount && primaryStatus === 'unclaimed' && !useAlternateLogin)
  const isStaff = Boolean(user?.is_staff || user?.is_superuser || user?.is_staff_member)
  const l2RegistrationClosed = !launch.l2RegistrationOpen && !isStaff

  const canLinkMore = Boolean(accounts.data?.slots ? accounts.data.slots.can_link : true)

  const characters = useQuery({
    queryKey: ['characters', selectedLogin],
    queryFn: () => lineageApi.characters(selectedLogin),
    enabled: Boolean(selectedLogin),
  })

  async function onRegister(event: FormEvent) {
    event.preventDefault()
    setSubmitting('register')
    try {
      const chosenLogin = (registerLogin || alternateLogin).trim()
      await lineageApi.register(registerPassword, chosenLogin || undefined)
      toast.success(primaryUnclaimed ? t('accounts.accountClaimed') : t('accounts.accountCreated'))
      await queryClient.invalidateQueries({ queryKey: ['lineage-accounts'] })
      if (chosenLogin) {
        await selectActiveAccount(chosenLogin)
      }
      setRegisterPassword('')
      setRegisterLogin('')
      setAlternateLogin('')
      setUseAlternateLogin(false)
    } catch (error) {
      if (isApiError(error) && error.errorCode === 'ACCOUNT_ALREADY_LINKED') {
        setUseAlternateLogin(true)
      }
      toast.error(apiErrorMessage(error, t('accounts.registerError')))
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
        toast.success(t('accounts.linkedByEmail'))
        await queryClient.invalidateQueries({ queryKey: ['lineage-accounts'] })
      })
      .catch((error) => toast.error(apiErrorMessage(error, t('accounts.confirmLinkError'))))
      .finally(() => {
        params.delete('link_token')
        setParams(params, { replace: true })
      })
  }, [params, queryClient, setParams, t])

  async function onLinkByEmail(event: FormEvent) {
    event.preventDefault()
    setSubmitting('email')
    try {
      await lineageApi.requestLinkByEmail(linkEmail)
      toast.success(t('accounts.linkEmailSent'))
    } catch (error) {
      toast.error(apiErrorMessage(error, t('accounts.linkEmailError')))
    } finally {
      setSubmitting(null)
    }
  }

  async function onLink(event: FormEvent) {
    event.preventDefault()
    setSubmitting('link')
    try {
      await lineageApi.link(login, password)
      toast.success(t('accounts.accountLinked'))
      await queryClient.invalidateQueries({ queryKey: ['lineage-accounts'] })
      setLogin('')
      setPassword('')
    } catch (error) {
      toast.error(apiErrorMessage(error, t('accounts.linkError')))
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <div className="account-page">
      <Card as="header" className="account-hero" data-theme-part="page-header">
        <div>
          <span className="panel-eyebrow">{t('accounts.eyebrow')}</span>
          <h1>{t('accounts.title')}</h1>
          <p className="muted">{t('accounts.subtitle')}</p>
        </div>
        <div className="account-slot-summary" aria-label={t('accounts.slotsAria')}>
          <UsersRound aria-hidden="true" />
          <span>{t('accounts.slotsLabel')}</span>
          <strong>{accounts.data?.slots.used ?? 0}/{accounts.data?.slots.total ?? 0}</strong>
        </div>
      </Card>

      <div className="grid cols-2 account-content-grid">
        <Card className="account-management">
          <div className="account-section-heading">
            <div>
              <span className="panel-eyebrow">{t('accounts.serverAccess')}</span>
              <h2>{t('accounts.yourAccounts')}</h2>
            </div>
            <span className={`account-status-pill ${linkedAccounts.length > 0 ? 'is-active' : ''} ${primaryTaken ? 'is-conflict' : ''}`}>
              {linkedAccounts.length > 0 ? <CheckCircle2 aria-hidden="true" /> : primaryTaken ? <ShieldAlert aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
              {linkedAccounts.length > 0 ? t('accounts.statusPrimaryActive') : primaryTaken ? t('accounts.statusLoginTaken') : t('accounts.statusWaiting')}
            </span>
          </div>

          {accounts.isLoading ? <div className="account-empty-state">{t('accounts.loadingAccounts')}</div> : null}

          {!accounts.isLoading && linkedAccounts.length > 0 ? (
            <div className="account-list">
              {linkedAccounts.map((item) => {
                const isActive = item.login.toLowerCase() === selectedLogin?.toLowerCase()
                return (
                  <div className={`account-list-item ${isActive ? 'is-active-card' : ''}`} key={item.login}>
                    <span className="account-list-icon">
                      {isActive ? <Crown aria-hidden="true" /> : <Link2 aria-hidden="true" />}
                    </span>
                    <span className="account-list-meta">
                      <strong>{item.login}</strong>
                      <small>
                        {isActive
                          ? t('accounts.activeBadge', { defaultValue: 'Conta Ativa' })
                          : (item.is_primary ? t('accounts.primaryAccount') : t('accounts.additionalAccount'))}
                      </small>
                    </span>
                    <b>{characters.isError && item.login === selectedLogin ? t('accounts.invalid') : t('accounts.linked')}</b>
                    <div className="account-list-action">
                      {isActive ? (
                        <span className="account-active-badge">{t('accounts.active', { defaultValue: 'Ativa' })}</span>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          type="button"
                          onClick={() => void selectActiveAccount(item.login)}
                        >
                          {t('accounts.setActive', { defaultValue: 'Ativar' })}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}

          {!accounts.isLoading && !primaryAccount && primaryTaken ? (
            <div className="account-created-state is-conflict">
              <ShieldAlert aria-hidden="true" />
              <div>
                <strong>{t('accounts.conflictTitle', { login: preferredLogin })}</strong>
                <span>{t('accounts.conflictText')}</span>
              </div>
            </div>
          ) : null}

          {!accounts.isLoading && l2RegistrationClosed ? (
            <div className="account-created-state is-conflict">
              <ShieldAlert aria-hidden="true" />
              <div>
                <strong>{t('accounts.l2RegistrationClosedTitle')}</strong>
                <span>{t('accounts.l2RegistrationClosedText')}</span>
              </div>
            </div>
          ) : null}

          {!accounts.isLoading && !l2RegistrationClosed && canLinkMore ? (
            <form className="account-action-form" onSubmit={onRegister}>
              <div className="account-form-title">
                <UserRoundPlus aria-hidden="true" />
                <div>
                  <h3>
                    {linkedAccounts.length === 0
                      ? (primaryUnclaimed ? t('accounts.claimPrimary') : t('accounts.createFirstTitle', { defaultValue: 'Criar Conta de Jogo' }))
                      : t('accounts.createAdditionalTitle', { defaultValue: 'Criar Nova Conta de Jogo' })}
                  </h3>
                  <p>
                    {linkedAccounts.length === 0
                      ? (primaryUnclaimed
                          ? <Trans t={t} i18nKey="accounts.claimHint" values={{ login: preferredLogin }} components={{ strong: <strong /> }} />
                          : t('accounts.createFirstDescription', { defaultValue: 'Defina o login e a senha da sua conta Lineage 2.' }))
                      : t('accounts.createAdditionalDescription', { defaultValue: 'Cadastre uma nova conta Lineage 2 com login e senha próprios.' })}
                  </p>
                </div>
              </div>
              <div className="account-form-fields">
                <Field>
                  {t('accounts.gameLogin', { defaultValue: 'Login no jogo' })}
                  <input
                    value={registerLogin}
                    onChange={(e) => setRegisterLogin(e.target.value)}
                    required
                    minLength={3}
                    maxLength={16}
                    autoComplete="username"
                    placeholder={t('accounts.gameLoginPlaceholder', { defaultValue: 'ex: meuhero' })}
                  />
                </Field>
                <Field>
                  {t('accounts.gamePassword', { defaultValue: 'Senha do jogo' })}
                  <input
                    type="password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </Field>
              </div>
              <Button type="submit" disabled={submitting !== null}>
                {submitting === 'register'
                  ? t('accounts.creating')
                  : (linkedAccounts.length === 0
                      ? (primaryUnclaimed ? t('accounts.linkAccount') : t('accounts.createFirstBtn', { defaultValue: 'Criar Conta de Jogo' }))
                      : t('accounts.createAccountBtn', { defaultValue: 'Criar Conta L2' }))}
              </Button>
            </form>
          ) : null}

          {!accounts.isLoading && !canLinkMore && linkedAccounts.length > 0 ? (
            <div className="account-created-state">
              <ShieldCheck aria-hidden="true" />
              <div>
                <strong>{t('accounts.slotsFullTitle', { defaultValue: 'Limite de contas atingido' })}</strong>
                <span>{t('accounts.slotsFull', { defaultValue: 'Todos os slots de contas de jogo disponíveis estão ocupados.' })}</span>
              </div>
            </div>
          ) : null}

          {selectedLogin && !characters.isError ? (
            <div className="account-created-state">
              <CheckCircle2 aria-hidden="true" />
              <div>
                <strong>{t('accounts.readyTitle')}</strong>
                <span>{t('accounts.readyText', { login: selectedLogin })}</span>
              </div>
            </div>
          ) : null}

          {selectedLogin && characters.isError ? (
            <div className="account-created-state is-conflict">
              <ShieldAlert aria-hidden="true" />
              <div>
                <strong>{t('accounts.inconsistentTitle')}</strong>
                <span>{t('accounts.inconsistentText', { login: selectedLogin })}</span>
              </div>
            </div>
          ) : null}

          <form className="account-action-form" onSubmit={onLinkByEmail}>
            <h3>{t('accounts.linkByEmailTitle')}</h3>
            <p className="muted">{t('accounts.linkByEmailHint')}</p>
            <Field>
              {t('accounts.gameEmail')}
              <input type="email" value={linkEmail} onChange={(e) => setLinkEmail(e.target.value)} required />
            </Field>
            <Button type="submit" disabled={submitting !== null}>
              {submitting === 'email' ? t('accounts.sending') : t('accounts.sendLink')}
            </Button>
          </form>

          <form className="account-action-form" onSubmit={onLink}>
            <h3>{t('accounts.linkExistingTitle')}</h3>
            <p className="muted">{t('accounts.linkExistingHint')}</p>
            <div className="account-form-fields">
              <Field>
                {t('accounts.login')}
                <input value={login} onChange={(e) => setLogin(e.target.value)} required />
              </Field>
              <Field>
                {t('accounts.password')}
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </Field>
            </div>
            <Button type="submit" disabled={submitting !== null}>
              {submitting === 'link' ? t('accounts.linking') : t('accounts.linkAccount')}
            </Button>
          </form>
        </Card>

        <Card className="account-characters">
          <div className="account-section-heading">
            <div>
              <span className="panel-eyebrow">{t('accounts.gameWorld')}</span>
              <h2>{t('accounts.characters')}</h2>
            </div>
            {selectedLogin ? (
              <span className="account-login-chip">
                {t('accounts.activeLabel', { defaultValue: 'Conta ativa' })}: <strong>{selectedLogin}</strong>
              </span>
            ) : null}
          </div>
          {characters.isLoading ? <div className="account-empty-state">{t('accounts.loadingCharacters')}</div> : null}
          {characters.isError ? (
            <ErrorNotice error={characters.error} onRetry={() => void characters.refetch()} />
          ) : null}
          {!characters.isLoading && !characters.isError && selectedLogin ? (
            <table className="table">
              <thead>
                <tr>
                  <th>{t('accounts.columnName')}</th>
                  <th>{t('accounts.columnLevel')}</th>
                  <th>{t('accounts.columnClass')}</th>
                  <th>{t('accounts.columnStatus')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(characters.data ?? []).map((char) => (
                  <tr
                    key={char.char_id}
                    role="link"
                    tabIndex={0}
                    onClick={() => navigate(`/panel/accounts/${selectedLogin}/${char.char_id}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        navigate(`/panel/accounts/${selectedLogin}/${char.char_id}`)
                      }
                    }}
                  >
                    <td>
                      <Link
                        className="account-character-link"
                        to={`/panel/accounts/${selectedLogin}/${char.char_id}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <CharacterAvatar name={char.name} classId={char.class_id} sex={char.sex} size="sm" />
                        {char.name}
                      </Link>
                    </td>
                    <td>{char.level}</td>
                    <td>{getClassName(char.class_id)}</td>
                    <td><span className={`badge ${char.online ? '' : 'off'}`}>{char.online ? t('accounts.online') : t('accounts.offline')}</span></td>
                    <td>
                      <Link
                        className="account-character-open"
                        to={`/panel/accounts/${selectedLogin}/${char.char_id}`}
                        aria-label={t('accounts.openCharacter', { name: char.name })}
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
          {!characters.isLoading && !characters.isError && selectedLogin && !characters.data?.length ? (
            <div className="account-empty-state">
              <UsersRound aria-hidden="true" />
              <strong>{t('accounts.noCharactersTitle')}</strong>
              <span>{t('accounts.noCharactersText', { login: selectedLogin })}</span>
            </div>
          ) : null}
          {!characters.isLoading && !selectedLogin ? (
            <div className="account-empty-state">
              <UserRoundPlus aria-hidden="true" />
              <strong>{t('accounts.noAccountTitle')}</strong>
              <span>{t('accounts.noAccountText')}</span>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  )
}
