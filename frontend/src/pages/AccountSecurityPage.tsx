import { Card } from '../components/ui/Card'
import { apiErrorMessage } from '../lib/errors'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { BadgeCheck, Fingerprint, KeyRound, Link2, LogOut, MailCheck, MonitorSmartphone, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { DiscordIcon, GoogleIcon } from '../components/BrandIcons'
import { useAuth } from '../contexts/AuthContext'
import { credentialJSON, creationOptions } from '../lib/webauthn'
import { authApi } from '../services/api'
import { beginOAuth } from '../lib/oauth'

function formatSessionWhen(value: string | null, unknownLabel: string) {
  if (!value) return unknownLabel
  return new Date(value).toLocaleString('pt-BR')
}

export function AccountSecurityPage() {
  const { t } = useTranslation('panel')
  const { user, refreshUser, logout } = useAuth()
  const queryClient = useQueryClient()
  const capabilities = useQuery({ queryKey: ['auth-capabilities'], queryFn: authApi.capabilities })
  const passkeys = useQuery({ queryKey: ['passkeys'], queryFn: authApi.passkeys })
  const sessions = useQuery({ queryKey: ['auth-sessions'], queryFn: authApi.sessions })
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [nickname, setNickname] = useState(() => t('security.defaultDeviceName'))
  const [busy, setBusy] = useState('')
  const googleConnected = capabilities.data?.connected_providers?.includes('google') ?? false
  const discordConnected = capabilities.data?.connected_providers?.includes('discord') ?? false
  const activeSessions = sessions.data ?? []
  const otherSessions = activeSessions.filter((row) => !row.current)

  async function requestVerification() {
    setBusy('email')
    try {
      const result = await authApi.requestEmailVerification()
      toast.success(result.already_verified ? t('security.emailAlreadyVerified') : t('security.emailSent'))
    } catch (error) {
      toast.error(apiErrorMessage(error, t('security.emailError')))
    } finally { setBusy('') }
  }

  async function setup2fa() {
    setBusy('2fa')
    try {
      const result = await authApi.setupTwoFactor()
      setSecret(result.secret)
      toast.success(t('security.twoFactorStarted'))
    } catch (error) {
      toast.error(apiErrorMessage(error, t('security.twoFactorStartError')))
    } finally { setBusy('') }
  }

  async function submit2fa(event: FormEvent) {
    event.preventDefault()
    setBusy('2fa')
    try {
      if (user?.is_2fa_enabled) await authApi.disableTwoFactor(code)
      else await authApi.confirmTwoFactor(code)
      setCode('')
      setSecret('')
      await refreshUser()
      toast.success(user?.is_2fa_enabled ? t('security.twoFactorDisabled') : t('security.twoFactorEnabled'))
    } catch (error) {
      toast.error(apiErrorMessage(error, t('security.invalidCode')))
    } finally { setBusy('') }
  }

  async function addPasskey() {
    if (!window.PublicKeyCredential) {
      toast.error(t('security.passkeyUnsupported'))
      return
    }
    setBusy('passkey')
    try {
      const begin = await authApi.beginPasskeyRegistration(nickname)
      const credential = await navigator.credentials.create({ publicKey: creationOptions(begin.options) }) as PublicKeyCredential | null
      if (!credential) throw new Error(t('security.passkeyCancelled'))
      await authApi.completePasskeyRegistration(begin.state, credentialJSON(credential), nickname)
      await queryClient.invalidateQueries({ queryKey: ['passkeys'] })
      toast.success(t('security.passkeyAdded'))
    } catch (error) {
      toast.error(apiErrorMessage(error, t('security.passkeyAddError')))
    } finally { setBusy('') }
  }

  async function removePasskey(id: string) {
    try {
      await authApi.deletePasskey(id)
      await queryClient.invalidateQueries({ queryKey: ['passkeys'] })
      toast.success(t('security.passkeyRemoved'))
    } catch (error) {
      toast.error(apiErrorMessage(error, t('security.passkeyRemoveError')))
    }
  }

  async function revokeSession(id: string, current: boolean) {
    setBusy(`session-${id}`)
    try {
      if (current) {
        await logout()
        toast.success(t('security.sessionEnded'))
        return
      }
      await authApi.revokeSession(id)
      await queryClient.invalidateQueries({ queryKey: ['auth-sessions'] })
      toast.success(t('security.sessionEnded'))
    } catch (error) {
      toast.error(apiErrorMessage(error, t('security.sessionEndError')))
    } finally { setBusy('') }
  }

  async function revokeOthers() {
    setBusy('sessions-others')
    try {
      const result = await authApi.revokeOtherSessions()
      await queryClient.invalidateQueries({ queryKey: ['auth-sessions'] })
      toast.success(result.revoked ? t('security.sessionsRevoked', { revoked: result.revoked }) : t('security.noOtherSessions'))
    } catch (error) {
      toast.error(apiErrorMessage(error, t('security.revokeOthersError')))
    } finally { setBusy('') }
  }

  return (
    <div className="security-page">
      <Card className="security-hero">
        <span><ShieldCheck aria-hidden="true" /></span>
        <div><span className="panel-eyebrow">{t('security.eyebrow')}</span><h1>{t('security.title')}</h1><p className="muted">{t('security.subtitle')}</p></div>
      </Card>

      <div className="security-grid">
        <Card className="security-card security-sessions" id="sessoes">
          <header>
            <span><MonitorSmartphone /></span>
            <div>
              <h2>{t('security.sessionsTitle')}</h2>
              <p>{t('security.sessionsSubtitle')}</p>
            </div>
            <b className={activeSessions.length ? 'is-on' : 'is-off'}>{activeSessions.length}</b>
          </header>
          <p className="muted">{t('security.sessionsHint')}</p>
          {otherSessions.length ? (
            <Button type="button" className="ghost" disabled={busy === 'sessions-others'} onClick={() => void revokeOthers()}>
              <LogOut /> {t('security.revokeOthers')}
            </Button>
          ) : null}
          <div className="security-passkey-list">
            {activeSessions.map((row) => (
              <article key={row.id}>
                <MonitorSmartphone />
                <span>
                  <strong>{row.current ? t('security.thisBrowser') : t('security.otherSession')}</strong>
                  <small>
                    {t('security.sessionWhen', {
                      created: formatSessionWhen(row.created_at, t('security.unknownDate')),
                      expires: formatSessionWhen(row.expires_at, t('security.unknownDate')),
                    })}
                  </small>
                </span>
                <button
                  type="button"
                  title={row.current ? t('security.leaveThisSession') : t('security.endSession')}
                  disabled={busy === `session-${row.id}`}
                  onClick={() => void revokeSession(row.id, row.current)}
                >
                  <Trash2 />
                </button>
              </article>
            ))}
            {sessions.isPending ? <p className="muted">{t('security.loadingSessions')}</p> : null}
            {!sessions.isPending && !activeSessions.length ? <p className="muted">{t('security.noSessions')}</p> : null}
          </div>
        </Card>

        <div className="security-side">
          <Card className="security-card security-email">
            <header><span><MailCheck /></span><div><h2>{t('security.emailTitle')}</h2><p>{user?.email}</p></div><b className={user?.is_email_verified ? 'is-on' : 'is-off'}>{user?.is_email_verified ? t('security.verified') : t('security.pending')}</b></header>
            <p className="muted">{t('security.emailHint')}</p>
            {!user?.is_email_verified ? <Button type="submit" disabled={busy === 'email'} onClick={() => void requestVerification()}><MailCheck /> {t('security.resendVerification')}</Button> : <div className="security-success"><BadgeCheck /> {t('security.emailConfirmed')}</div>}
          </Card>

          <Card className="security-card">
            <header><span><KeyRound /></span><div><h2>{t('security.twoFactorTitle')}</h2><p>{t('security.twoFactorSubtitle')}</p></div><b className={user?.is_2fa_enabled ? 'is-on' : 'is-off'}>{user?.is_2fa_enabled ? t('security.active') : t('security.inactive')}</b></header>
            {!user?.is_2fa_enabled && !secret ? <Button type="submit" className="security-2fa-start" disabled={busy === '2fa'} onClick={() => void setup2fa()}><Plus /> {t('security.enableTwoFactor')}</Button> : null}
            {secret ? <div className="security-secret"><span>{t('security.secretLabel')}</span><strong>{secret}</strong><small>{t('security.secretHint')}</small></div> : null}
            {(secret || user?.is_2fa_enabled) ? <form className="security-inline-form" onSubmit={submit2fa}><Field>{t('security.codeLabel')}<input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" required /></Field><Button type="submit" disabled={busy === '2fa'}>{user?.is_2fa_enabled ? t('security.disableTwoFactor') : t('security.confirmTwoFactor')}</Button></form> : null}
          </Card>

          <Card className="security-card security-passkeys">
            <header><span><Fingerprint /></span><div><h2>{t('security.passkeysTitle')}</h2><p>{t('security.passkeysSubtitle')}</p></div><b className={passkeys.data?.length ? 'is-on' : 'is-off'}>{passkeys.data?.length ?? 0}</b></header>
            <div className="security-add-passkey"><Field>{t('security.deviceName')}<input value={nickname} maxLength={64} onChange={(event) => setNickname(event.target.value)} /></Field><Button type="submit" disabled={busy === 'passkey'} onClick={() => void addPasskey()}><Fingerprint /> {t('security.addPasskey')}</Button></div>
            <div className="security-passkey-list">
              {(passkeys.data ?? []).map((row) => <article key={row.id}><Fingerprint /><span><strong>{row.nickname || t('security.passkeyFallbackName')}</strong><small>{t('security.passkeyCreatedAt', { date: new Date(row.created_at).toLocaleDateString('pt-BR') })}</small></span><button type="button" title={t('security.removePasskey')} onClick={() => void removePasskey(row.id)}><Trash2 /></button></article>)}
              {!passkeys.data?.length ? <p className="muted">{t('security.noPasskeys')}</p> : null}
            </div>
          </Card>

          <Card className="security-card security-connections">
            <header><span><Link2 /></span><div><h2>{t('security.connectionsTitle')}</h2><p>{t('security.connectionsSubtitle')}</p></div></header>
            <div className="security-provider"><GoogleIcon /><span><strong>Google</strong><small>{googleConnected ? t('security.providerConnected') : capabilities.data?.google ? t('security.providerAvailable') : t('security.providerUnavailable')}</small></span><Button type="submit" className="ghost" disabled={googleConnected || !capabilities.data?.google} onClick={() => void beginOAuth('google', 'link')}>{googleConnected ? t('security.connected') : t('security.connect')}</Button></div>
            <div className="security-provider"><DiscordIcon /><span><strong>Discord</strong><small>{discordConnected ? t('security.providerConnected') : capabilities.data?.discord ? t('security.providerAvailable') : t('security.providerUnavailable')}</small></span><Button type="submit" className="ghost" disabled={discordConnected || !capabilities.data?.discord} onClick={() => void beginOAuth('discord', 'link')}>{discordConnected ? t('security.connected') : t('security.connect')}</Button></div>
            <div className="security-provider"><ShieldCheck /><span><strong>{t('security.captchaTitle')}</strong><small>{capabilities.data?.captcha ? t('security.captchaOn') : t('security.captchaOff')}</small></span><b className={capabilities.data?.captcha ? 'is-on' : 'is-off'}>{capabilities.data?.captcha ? t('security.active') : t('security.captchaConfigure')}</b></div>
          </Card>
        </div>
      </div>
    </div>
  )
}
