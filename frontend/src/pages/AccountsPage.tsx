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
import { CheckCircle2, ChevronRight, Crown, KeyRound, Link2, Mail, Plus, ShieldAlert, ShieldCheck, UserRoundPlus, UsersRound } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useActiveAccount } from '../contexts/ActiveAccountContext'
import { CharacterAvatar } from '../components/character/CharacterAvatar'
import { BuySlotsModal } from '../components/character/BuySlotsModal'
import { CreateCharacterModal } from '../components/character/CreateCharacterModal'
import { GamepadIcon } from '../components/icons'
import { getClassName } from '../lib/lineage'
import { isApiError, lineageApi, serviceAvailable, walletApi } from '../services/api'
import { useLaunchAccess } from '../hooks/useLaunchAccess'

export function AccountsPage() {
  const { t } = useTranslation('panel')
  const { user } = useAuth()
  const { activeLogin, setActiveAccount: selectActiveAccount } = useActiveAccount()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const accounts = useQuery({ queryKey: ['lineage-accounts'], queryFn: lineageApi.accounts })
  const servicePrices = useQuery({ queryKey: ['service-prices'], queryFn: lineageApi.servicePrices })
  const wallet = useQuery({ queryKey: ['wallet'], queryFn: walletApi.me })
  const launch = useLaunchAccess()
  const [params, setParams] = useSearchParams()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [registerLogin, setRegisterLogin] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [alternateLogin, setAlternateLogin] = useState('')
  const [useAlternateLogin, setUseAlternateLogin] = useState(false)
  const [linkEmail, setLinkEmail] = useState('')
  const [linkMode, setLinkMode] = useState<'credentials' | 'email'>('credentials')
  const [submitting, setSubmitting] = useState<'register' | 'email' | 'link' | null>(null)
  const [buySlotsOpen, setBuySlotsOpen] = useState(false)
  const [buyingSlots, setBuyingSlots] = useState(false)
  const [createCharacterOpen, setCreateCharacterOpen] = useState(false)
  const [creatingCharacter, setCreatingCharacter] = useState(false)

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
  const rawSlotPrice = servicePrices.data?.LINK_SLOT
  const unitSlotPrice = rawSlotPrice ? Number(rawSlotPrice) || 10 : 10
  const isSlotServiceAvailable = servicePrices.data ? serviceAvailable(servicePrices.data, 'LINK_SLOT') : true
  const walletCoins = wallet.data ? Number(wallet.data.balance) || 0 : 0

  async function handlePurchaseSlots(qty: number) {
    setBuyingSlots(true)
    try {
      await lineageApi.purchaseSlots(qty)
      toast.success(
        t('accounts.buySlotsModal.successToast', {
          quantity: qty,
          defaultValue: `${qty} slot(s) adicionado(s) com sucesso!`,
        }),
      )
      setBuySlotsOpen(false)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['lineage-accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['wallet'] }),
      ])
    } catch (err) {
      toast.error(apiErrorMessage(err, t('common.error', { defaultValue: 'Falha ao processar compra' })))
    } finally {
      setBuyingSlots(false)
    }
  }

  async function handleCreateCharacter(payload: {
    login: string
    name: string
    race: number
    class_id: number
    sex: number
    hair_style: number
    hair_color: number
    face: number
  }) {
    setCreatingCharacter(true)
    try {
      await lineageApi.createCharacter(payload)
      toast.success(
        t('accounts.characterCreated', {
          name: payload.name,
          defaultValue: `Personagem ${payload.name} criado com sucesso!`,
        }),
      )
      setCreateCharacterOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['characters', payload.login] })
    } catch (err) {
      toast.error(apiErrorMessage(err, t('accounts.createCharError', { defaultValue: 'Falha ao criar personagem' })))
    } finally {
      setCreatingCharacter(false)
    }
  }

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
          <div className="account-slot-icon-wrap" aria-hidden="true">
            <UsersRound />
          </div>
          <div className="account-slot-info">
            <span className="account-slot-label">{t('accounts.slotsLabel')}</span>
            <strong className="account-slot-value">
              {accounts.data?.slots.used ?? 0}/{accounts.data?.slots.total ?? 0}
            </strong>
          </div>
          <Button
            variant="secondary"
            size="sm"
            type="button"
            className="account-buy-slot-btn"
            onClick={() => setBuySlotsOpen(true)}
            aria-label={t('accounts.buySlotsBtn')}
          >
            <Plus aria-hidden="true" />
            <span>{t('accounts.expandSlots')}</span>
          </Button>
        </div>
      </Card>

      <div className="grid cols-2 account-content-grid">
        <div className="account-management account-management-column">
          {/* ========================================================
              CARD 1: SUAS CONTAS (Lista e Seleção de Conta Ativa)
              ======================================================== */}
          <Card className="account-section-card account-card-list">
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

            <p className="account-section-description">
              {t('accounts.yourAccountsHint')}
            </p>

            {accounts.isLoading ? <div className="account-empty-state">{t('accounts.loadingAccounts')}</div> : null}

            {!accounts.isLoading && linkedAccounts.length > 0 ? (
              <div className="account-list">
                {linkedAccounts.map((item) => {
                  const isActive = item.login.toLowerCase() === selectedLogin?.toLowerCase()
                  return (
                    <div className={`account-list-item ${isActive ? 'is-active-card' : ''}`} key={item.login}>
                      <span className="account-list-icon">
                        {isActive ? <Crown aria-hidden="true" /> : <GamepadIcon className="account-item-glyph" aria-hidden="true" />}
                      </span>
                      <span className="account-list-meta">
                        <strong>{item.login}</strong>
                        <small>
                          {isActive
                            ? t('accounts.activeBadge', { defaultValue: 'Conta Ativa' })
                            : (item.is_primary ? t('accounts.primaryAccount') : t('accounts.additionalAccount'))}
                        </small>
                      </span>
                      <div className="account-list-action">
                        <b className={characters.isError && item.login === selectedLogin ? 'is-invalid' : ''}>
                          {characters.isError && item.login === selectedLogin ? t('accounts.invalid') : t('accounts.linked')}
                        </b>
                        {isActive ? (
                          <span className="account-status-active">{t('accounts.active', { defaultValue: 'Ativa' })}</span>
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

            {!accounts.isLoading && linkedAccounts.length === 0 ? (
              <div className="account-empty-notice">
                <UsersRound aria-hidden="true" />
                <span>{t('accounts.noAccountsYet')}</span>
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
          </Card>

          {/* ========================================================
              CARD 2: CRIAÇÃO DE CONTA (Criar Nova Conta no Jogo)
              ======================================================== */}
          <Card className="account-section-card account-card-create">
            <div className="account-section-heading">
              <div>
                <span className="panel-eyebrow">{t('accounts.createAccountEyebrow')}</span>
                <h2>
                  {linkedAccounts.length === 0
                    ? (primaryUnclaimed ? t('accounts.claimPrimary') : t('accounts.createFirstTitle', { defaultValue: 'Criar conta de jogo' }))
                    : t('accounts.createAdditionalTitle', { defaultValue: 'Criar nova conta de jogo' })}
                </h2>
              </div>
              <span className="account-type-tag">
                <UserRoundPlus aria-hidden="true" />
                {t('accounts.gameWorld')}
              </span>
            </div>

            <p className="account-section-description">
              {linkedAccounts.length === 0
                ? (primaryUnclaimed
                    ? <Trans t={t} i18nKey="accounts.claimHint" values={{ login: preferredLogin }} components={{ strong: <strong /> }} />
                    : t('accounts.createFirstDescription', { defaultValue: 'Defina o login e a senha da sua conta Lineage 2.' }))
                : t('accounts.createAdditionalDescription', { defaultValue: 'Cadastre uma nova conta Lineage 2 com login e senha próprios.' })}
            </p>

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

            {!accounts.isLoading && !canLinkMore && linkedAccounts.length > 0 ? (
              <div className="account-created-state is-slots-full">
                <ShieldCheck aria-hidden="true" />
                <div className="account-slots-full-content">
                  <strong>{t('accounts.slotsFullTitle', { defaultValue: 'Limite de contas atingido' })}</strong>
                  <span>{t('accounts.slotsFull', { defaultValue: 'Todos os slots de contas de jogo disponíveis estão ocupados.' })}</span>
                  {rawSlotPrice ? (
                    <span className="account-slot-price-hint">
                      {t('accounts.slotPriceHint', {
                        price: rawSlotPrice,
                        defaultValue: `Custo por slot adicional: ${rawSlotPrice} moedas`,
                      })}
                    </span>
                  ) : null}
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  type="button"
                  onClick={() => setBuySlotsOpen(true)}
                >
                  <Plus aria-hidden="true" />
                  {t('accounts.buySlotsBtn', { defaultValue: 'Comprar slots adicionais' })}
                </Button>
              </div>
            ) : null}

            {!accounts.isLoading && !l2RegistrationClosed && canLinkMore ? (
              <form className="account-form-body" onSubmit={onRegister}>
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
                      placeholder="••••••••"
                    />
                  </Field>
                </div>
                <Button type="submit" disabled={submitting !== null}>
                  {submitting === 'register'
                    ? t('accounts.creating')
                    : (linkedAccounts.length === 0
                        ? (primaryUnclaimed ? t('accounts.linkAccount') : t('accounts.createFirstBtn', { defaultValue: 'Criar conta de jogo' }))
                        : t('accounts.createAccountBtn', { defaultValue: 'Criar conta L2' }))}
                </Button>
              </form>
            ) : null}
          </Card>

          {/* ========================================================
              CARD 3: VINCULAÇÃO DE CONTA (Já possui conta no servidor?)
              ======================================================== */}
          <Card className="account-section-card account-card-link">
            <div className="account-section-heading">
              <div>
                <span className="panel-eyebrow">{t('accounts.linkAccountEyebrow')}</span>
                <h2>{t('accounts.linkExistingTitle')}</h2>
              </div>
              <span className="account-type-tag">
                <Link2 aria-hidden="true" />
                {t('accounts.linkAccountEyebrow')}
              </span>
            </div>

            <p className="account-section-description">
              {t('accounts.linkExplanation')}
            </p>

            <div className="account-link-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={linkMode === 'credentials'}
                className={`account-link-tab ${linkMode === 'credentials' ? 'is-active' : ''}`}
                onClick={() => setLinkMode('credentials')}
              >
                <KeyRound aria-hidden="true" />
                <span>{t('accounts.linkMethodCredentials')}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={linkMode === 'email'}
                className={`account-link-tab ${linkMode === 'email' ? 'is-active' : ''}`}
                onClick={() => setLinkMode('email')}
              >
                <Mail aria-hidden="true" />
                <span>{t('accounts.linkMethodEmail')}</span>
              </button>
            </div>

            {linkMode === 'credentials' ? (
              <form className="account-form-body" onSubmit={onLink}>
                <p className="account-tab-hint">{t('accounts.linkCredentialsHint')}</p>
                <div className="account-form-fields">
                  <Field>
                    {t('accounts.login')}
                    <input
                      value={login}
                      onChange={(e) => setLogin(e.target.value)}
                      required
                      placeholder={t('accounts.login')}
                    />
                  </Field>
                  <Field>
                    {t('accounts.password')}
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                    />
                  </Field>
                </div>
                <Button type="submit" disabled={submitting !== null}>
                  {submitting === 'link' ? t('accounts.linking') : t('accounts.linkAccount')}
                </Button>
              </form>
            ) : (
              <form className="account-form-body" onSubmit={onLinkByEmail}>
                <p className="account-tab-hint">{t('accounts.linkByEmailHint')}</p>
                <Field>
                  {t('accounts.gameEmail')}
                  <input
                    type="email"
                    value={linkEmail}
                    onChange={(e) => setLinkEmail(e.target.value)}
                    required
                    placeholder="email@servidor.com"
                  />
                </Field>
                <Button type="submit" disabled={submitting !== null}>
                  {submitting === 'email' ? t('accounts.sending') : t('accounts.sendLink')}
                </Button>
              </form>
            )}
          </Card>
        </div>

        {/* ========================================================
            COLUNA DIREITA: PERSONAGENS DA CONTA ATIVA
            ======================================================== */}
        <Card className="account-characters">
          <div className="account-section-heading">
            <div>
              <span className="panel-eyebrow">{t('accounts.gameWorld')}</span>
              <h2>{t('accounts.characters')}</h2>
            </div>
            <div className="account-characters-header-actions">
              {selectedLogin ? (
                <span className="account-login-chip">
                  {t('accounts.activeLabel', { defaultValue: 'Conta ativa' })}: <strong>{selectedLogin}</strong>
                </span>
              ) : null}
              {selectedLogin ? (
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  className="account-create-character-btn"
                  onClick={() => setCreateCharacterOpen(true)}
                  aria-label={t('accounts.createCharacterBtn', { defaultValue: 'Criar personagem' })}
                >
                  <Plus aria-hidden="true" />
                  <span>{t('accounts.createCharacterBtn', { defaultValue: 'Criar personagem' })}</span>
                </Button>
              ) : null}
            </div>
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
                  <th aria-label={t('common.actions')} />
                </tr>
              </thead>
              <tbody>
                {characters.data?.map((character) => (
                  <tr
                    key={character.char_id}
                    role="link"
                    tabIndex={0}
                    onClick={() => navigate(`/panel/accounts/${encodeURIComponent(selectedLogin)}/${character.char_id}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        navigate(`/panel/accounts/${encodeURIComponent(selectedLogin)}/${character.char_id}`)
                      }
                    }}
                  >
                    <td>
                      <Link
                        className="account-character-link"
                        to={`/panel/accounts/${encodeURIComponent(selectedLogin)}/${character.char_id}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <CharacterAvatar
                          classId={character.class_id}
                          className="character-avatar"
                          name={character.name}
                          sex={character.sex}
                          size="sm"
                        />
                        <span>{character.name}</span>
                      </Link>
                    </td>
                    <td>{character.level}</td>
                    <td>{getClassName(character.class_id)}</td>
                    <td>
                      <span className={`badge ${character.online ? '' : 'off'}`}>
                        {character.online ? t('accounts.online') : t('accounts.offline')}
                      </span>
                    </td>
                    <td className="account-character-action">
                      <span className="account-character-open">
                        <ChevronRight aria-hidden="true" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          {!characters.isLoading && !characters.isError && selectedLogin && characters.data?.length === 0 ? (
            <div className="account-empty-state">
              <UsersRound aria-hidden="true" />
              <strong>{t('accounts.noCharactersTitle')}</strong>
              <p className="muted">{t('accounts.noCharactersText', { login: selectedLogin })}</p>
              <Button
                variant="primary"
                size="sm"
                type="button"
                className="account-create-character-empty-btn"
                onClick={() => setCreateCharacterOpen(true)}
              >
                <Plus aria-hidden="true" />
                <span>{t('accounts.createCharacterBtn', { defaultValue: 'Criar personagem' })}</span>
              </Button>
            </div>
          ) : null}
          {!selectedLogin ? (
            <div className="account-empty-state">
              <UsersRound aria-hidden="true" />
              <strong>{t('accounts.noAccountTitle')}</strong>
              <p className="muted">{t('accounts.noAccountText')}</p>
            </div>
          ) : null}
        </Card>
      </div>

      <BuySlotsModal
        open={buySlotsOpen}
        unitPrice={unitSlotPrice}
        walletBalance={walletCoins}
        currentSlots={{
          used: accounts.data?.slots.used ?? 0,
          total: accounts.data?.slots.total ?? 0,
        }}
        pending={buyingSlots}
        isAvailable={isSlotServiceAvailable}
        onClose={() => setBuySlotsOpen(false)}
        onConfirm={handlePurchaseSlots}
      />

      <CreateCharacterModal
        open={createCharacterOpen}
        accountLogin={selectedLogin ?? ''}
        pending={creatingCharacter}
        onClose={() => setCreateCharacterOpen(false)}
        onConfirm={handleCreateCharacter}
      />
    </div>
  )
}
