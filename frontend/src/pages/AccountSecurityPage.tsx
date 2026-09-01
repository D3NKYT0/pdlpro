import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, Fingerprint, KeyRound, Link2, MailCheck, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { credentialJSON, creationOptions } from '../lib/webauthn'
import { authApi, isApiError } from '../services/api'
import { beginOAuth } from '../lib/oauth'

export function AccountSecurityPage() {
  const { user, refreshUser } = useAuth()
  const queryClient = useQueryClient()
  const capabilities = useQuery({ queryKey: ['auth-capabilities'], queryFn: authApi.capabilities })
  const passkeys = useQuery({ queryKey: ['passkeys'], queryFn: authApi.passkeys })
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [nickname, setNickname] = useState('Meu dispositivo')
  const [busy, setBusy] = useState('')
  const googleConnected = capabilities.data?.connected_providers?.includes('google') ?? false
  const discordConnected = capabilities.data?.connected_providers?.includes('discord') ?? false

  async function requestVerification() {
    setBusy('email')
    try {
      const result = await authApi.requestEmailVerification()
      toast.success(result.already_verified ? 'Seu e-mail já está verificado.' : 'Enviamos um novo link de verificação.')
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível enviar o e-mail.')
    } finally { setBusy('') }
  }

  async function setup2fa() {
    setBusy('2fa')
    try {
      const result = await authApi.setupTwoFactor()
      setSecret(result.secret)
      toast.success('Adicione a chave ao autenticador e confirme o código.')
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível iniciar o 2FA.')
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
      toast.success(user?.is_2fa_enabled ? '2FA desativado.' : '2FA ativado.')
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Código inválido.')
    } finally { setBusy('') }
  }

  async function addPasskey() {
    if (!window.PublicKeyCredential) {
      toast.error('Este navegador não oferece suporte a passkeys.')
      return
    }
    setBusy('passkey')
    try {
      const begin = await authApi.beginPasskeyRegistration(nickname)
      const credential = await navigator.credentials.create({ publicKey: creationOptions(begin.options) }) as PublicKeyCredential | null
      if (!credential) throw new Error('Operação cancelada')
      await authApi.completePasskeyRegistration(begin.state, credentialJSON(credential), nickname)
      await queryClient.invalidateQueries({ queryKey: ['passkeys'] })
      toast.success('Chave de acesso adicionada.')
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível adicionar a chave.')
    } finally { setBusy('') }
  }

  async function removePasskey(id: string) {
    try {
      await authApi.deletePasskey(id)
      await queryClient.invalidateQueries({ queryKey: ['passkeys'] })
      toast.success('Chave removida.')
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível remover a chave.')
    }
  }

  return (
    <div className="security-page">
      <section className="card security-hero">
        <span><ShieldCheck aria-hidden="true" /></span>
        <div><span className="panel-eyebrow">Central da conta</span><h1>Conta e segurança</h1><p className="muted">Gerencie como você entra, confirma sua identidade e protege seus personagens.</p></div>
      </section>

      <div className="security-grid">
        <section className="card security-card">
          <header><span><MailCheck /></span><div><h2>Verificação de e-mail</h2><p>{user?.email}</p></div><b className={user?.is_email_verified ? 'is-on' : 'is-off'}>{user?.is_email_verified ? 'Verificado' : 'Pendente'}</b></header>
          <p className="muted">Necessária para recuperar a conta e confirmar ações sensíveis.</p>
          {!user?.is_email_verified ? <button className="btn" disabled={busy === 'email'} onClick={() => void requestVerification()}><MailCheck /> Reenviar verificação</button> : <div className="security-success"><BadgeCheck /> Identidade de e-mail confirmada</div>}
        </section>

        <section className="card security-card">
          <header><span><KeyRound /></span><div><h2>Autenticação em duas etapas</h2><p>Aplicativo autenticador (TOTP)</p></div><b className={user?.is_2fa_enabled ? 'is-on' : 'is-off'}>{user?.is_2fa_enabled ? 'Ativo' : 'Inativo'}</b></header>
          {!user?.is_2fa_enabled && !secret ? <button className="btn security-2fa-start" disabled={busy === '2fa'} onClick={() => void setup2fa()}><Plus /> Ativar 2FA</button> : null}
          {secret ? <div className="security-secret"><span>Chave do autenticador</span><strong>{secret}</strong><small>Guarde em local seguro e adicione ao Google Authenticator, Authy ou similar.</small></div> : null}
          {(secret || user?.is_2fa_enabled) ? <form className="security-inline-form" onSubmit={submit2fa}><label className="field">Código de 6 dígitos<input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" required /></label><button className="btn" disabled={busy === '2fa'}>{user?.is_2fa_enabled ? 'Desativar 2FA' : 'Confirmar ativação'}</button></form> : null}
        </section>

        <section className="card security-card security-passkeys">
          <header><span><Fingerprint /></span><div><h2>Chaves de acesso</h2><p>Passkey, biometria ou PIN do dispositivo</p></div><b className={passkeys.data?.length ? 'is-on' : 'is-off'}>{passkeys.data?.length ?? 0}</b></header>
          <div className="security-add-passkey"><label className="field">Nome do dispositivo<input value={nickname} maxLength={64} onChange={(event) => setNickname(event.target.value)} /></label><button className="btn" disabled={busy === 'passkey'} onClick={() => void addPasskey()}><Fingerprint /> Adicionar passkey</button></div>
          <div className="security-passkey-list">
            {(passkeys.data ?? []).map((row) => <article key={row.id}><Fingerprint /><span><strong>{row.nickname || 'Chave de acesso'}</strong><small>Criada em {new Date(row.created_at).toLocaleDateString('pt-BR')}</small></span><button type="button" title="Remover chave" onClick={() => void removePasskey(row.id)}><Trash2 /></button></article>)}
            {!passkeys.data?.length ? <p className="muted">Nenhuma chave cadastrada. Depois de adicionar, você poderá entrar sem senha.</p> : null}
          </div>
        </section>

        <section className="card security-card security-connections">
          <header><span><Link2 /></span><div><h2>Contas conectadas</h2><p>Outras formas de entrar</p></div></header>
          <div className="security-provider"><b className="auth-provider-google">G</b><span><strong>Google</strong><small>{googleConnected ? 'Conta conectada' : capabilities.data?.google ? 'Disponível para conexão' : 'Aguardando credenciais do servidor'}</small></span><button className="btn ghost" disabled={googleConnected || !capabilities.data?.google} onClick={() => void beginOAuth('google', 'link')}>{googleConnected ? 'Conectado' : 'Conectar'}</button></div>
          <div className="security-provider"><i className="fa-brands fa-discord" /><span><strong>Discord</strong><small>{discordConnected ? 'Conta conectada' : capabilities.data?.discord ? 'Disponível para conexão' : 'Aguardando credenciais do servidor'}</small></span><button className="btn ghost" disabled={discordConnected || !capabilities.data?.discord} onClick={() => void beginOAuth('discord', 'link')}>{discordConnected ? 'Conectado' : 'Conectar'}</button></div>
          <div className="security-provider"><ShieldCheck /><span><strong>CAPTCHA adaptativo</strong><small>{capabilities.data?.captcha ? 'Proteção ativa após tentativas suspeitas' : 'Configure as chaves hCaptcha no ambiente'}</small></span><b className={capabilities.data?.captcha ? 'is-on' : 'is-off'}>{capabilities.data?.captcha ? 'Ativo' : 'Configurar'}</b></div>
        </section>
      </div>
    </div>
  )
}
