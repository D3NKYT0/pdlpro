import { MicroResource } from '../programs/MicroResource'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { AlertTriangle, CheckCircle2, Crown, Eye, EyeOff, KeyRound, ShieldAlert, ShieldCheck, Trash2 } from 'lucide-react'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { Modal } from '../ui/Modal'
import { GamepadIcon } from '../icons'
import { apiErrorMessage } from '../../lib/errors'
import { lineageApi, type ApiAccessibleAccount } from '../../services/api'

export interface ManageAccountModalProps {
  open: boolean
  account: ApiAccessibleAccount | null
  isActive: boolean
  onClose: () => void
  onSelectActive?: (login: string) => void | Promise<void>
  onUnlinkSuccess?: () => void
  onPasswordChangeSuccess?: () => void
}

export function ManageAccountModal({
  open,
  account,
  isActive,
  onClose,
  onSelectActive,
  onUnlinkSuccess,
  onPasswordChangeSuccess,
}: ManageAccountModalProps) {
  const { t } = useTranslation('panel')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const [confirmUnlink, setConfirmUnlink] = useState(false)
  const [unlinking, setUnlinking] = useState(false)

  if (!account) return null

  function resetPasswordForm() {
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError(null)
    setShowPassword(false)
  }

  function handleClose() {
    resetPasswordForm()
    setConfirmUnlink(false)
    onClose()
  }

  async function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault()
    if (!account) return
    setPasswordError(null)

    if (newPassword.length < 8) {
      setPasswordError(
        t('accounts.manageModal.passwordTooShort', {
          defaultValue: 'A senha precisa ter pelo menos 8 caracteres.',
        }),
      )
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(
        t('accounts.manageModal.passwordMismatch', {
          defaultValue: 'A confirmação de senha não confere com a nova senha.',
        }),
      )
      return
    }

    setSavingPassword(true)
    try {
      await lineageApi.changePassword(account.login, newPassword)
      toast.success(
        t('accounts.manageModal.passwordSuccess', {
          login: account.login,
          defaultValue: `Senha da conta ${account.login} alterada com sucesso!`,
        }),
      )
      resetPasswordForm()
      onPasswordChangeSuccess?.()
    } catch (err) {
      const msg = apiErrorMessage(
        err,
        t('common.error', { defaultValue: 'Falha ao alterar senha.' }),
      )
      setPasswordError(msg)
      toast.error(msg)
    } finally {
      setSavingPassword(false)
    }
  }

  async function handleUnlink() {
    if (!account) return
    setUnlinking(true)
    try {
      await lineageApi.unlink(account.login)
      toast.success(
        t('accounts.manageModal.unlinkSuccess', {
          login: account.login,
          defaultValue: `Conta ${account.login} desvinculada com sucesso.`,
        }),
      )
      setConfirmUnlink(false)
      onUnlinkSuccess?.()
      handleClose()
    } catch (err) {
      toast.error(
        apiErrorMessage(
          err,
          t('common.error', { defaultValue: 'Falha ao desvincular conta.' }),
        ),
      )
    } finally {
      setUnlinking(false)
    }
  }

  return (
    <Modal
      className="manage-account-modal"
      open={open}
      title={t('accounts.manageModal.title', {
        login: account.login,
        defaultValue: `Gerenciar Conta: ${account.login}`,
      })}
      onClose={handleClose}
    >
      <div className="manage-account-content">
        {/* ========================================================
            CARD 1: RESUMO / STATUS DA CONTA
            ======================================================== */}
        <div className="manage-account-hero">
          <div className="manage-account-hero-left">
            <span className={`manage-account-icon-wrap ${isActive ? 'is-active' : ''}`} aria-hidden="true">
              {isActive ? <Crown /> : <GamepadIcon className="account-item-glyph" />}
            </span>
            <div className="manage-account-hero-meta">
              <strong className="manage-account-hero-login">{account.login}</strong>
              <div className="manage-account-badges">
                {account.is_primary ? (
                  <span className="manage-badge is-gold">
                    <Crown aria-hidden="true" />
                    {t('accounts.manageModal.primary', { defaultValue: 'Conta principal' })}
                  </span>
                ) : (
                  <span className="manage-badge is-blue">
                    <GamepadIcon className="account-item-glyph" aria-hidden="true" />
                    {t('accounts.manageModal.additional', { defaultValue: 'Conta adicional vinculada' })}
                  </span>
                )}
                {isActive ? (
                  <span className="manage-badge is-green">
                    <CheckCircle2 aria-hidden="true" />
                    {t('accounts.manageModal.active', { defaultValue: 'Conta ativa' })}
                  </span>
                ) : (
                  <span className="manage-badge is-muted">
                    {t('accounts.manageModal.inactive', { defaultValue: 'Inativa no painel' })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {!isActive && onSelectActive ? (
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => {
                void onSelectActive(account.login)
              }}
            >
              {t('accounts.manageModal.setActive', { defaultValue: 'Definir como ativa' })}
            </Button>
          ) : null}
        </div>

        {/* ========================================================
            CARD 2: ALTERAÇÃO DE SENHA DO JOGO
            ======================================================== */}
        <section className="manage-account-section">
          <div className="manage-account-section-header">
            <KeyRound aria-hidden="true" />
            <div>
              <h3>{t('accounts.manageModal.changePasswordTitle', { defaultValue: 'Alterar senha do jogo' })}</h3>
              <p className="muted">
                {t('accounts.manageModal.changePasswordDesc', {
                  defaultValue: 'Defina uma nova senha para entrar no servidor com esta conta. Esta senha é exclusiva para o jogo.',
                })}
              </p>
            </div>
          </div>

          <MicroResource code="accounts-password"><form className="manage-account-password-form" onSubmit={handlePasswordSubmit}>
            <Field
              label={t('accounts.manageModal.newPassword', { defaultValue: 'Nova senha' })}
              hint={t('accounts.manageModal.passwordHint', { defaultValue: 'A senha precisa ter no mínimo 8 caracteres.' })}
            >
              <div className="manage-password-input-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value)
                    if (passwordError) setPasswordError(null)
                  }}
                  placeholder={t('accounts.manageModal.newPasswordPlaceholder', { defaultValue: 'No mínimo 8 caracteres' })}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="manage-password-toggle-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </div>
            </Field>

            <Field
              label={t('accounts.manageModal.confirmPassword', { defaultValue: 'Confirmar nova senha' })}
            >
              <div className="manage-password-input-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    if (passwordError) setPasswordError(null)
                  }}
                  placeholder={t('accounts.manageModal.confirmPasswordPlaceholder', { defaultValue: 'Repita a nova senha' })}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
            </Field>

            {passwordError ? (
              <div className="manage-password-error" role="alert">
                <ShieldAlert aria-hidden="true" />
                <span>{passwordError}</span>
              </div>
            ) : null}

            <div className="manage-password-submit-wrap">
              <Button
                variant="primary"
                size="md"
                type="submit"
                busy={savingPassword}
                busyLabel={t('accounts.manageModal.savingPassword', { defaultValue: 'Salvando senha...' })}
                disabled={!newPassword || newPassword.length < 8 || newPassword !== confirmPassword}
              >
                <KeyRound aria-hidden="true" />
                <span>{t('accounts.manageModal.savePassword', { defaultValue: 'Salvar nova senha' })}</span>
              </Button>
            </div>
          </form></MicroResource>
        </section>

        {/* ========================================================
            CARD 3: DESVINCULAR CONTA / SEGURANÇA
            ======================================================== */}
        <section className="manage-account-section is-danger-zone">
          <div className="manage-account-section-header">
            <Trash2 aria-hidden="true" />
            <div>
              <h3>{t('accounts.manageModal.unlinkTitle', { defaultValue: 'Desvincular conta' })}</h3>
              <p className="muted">
                {account.is_primary
                  ? t('accounts.manageModal.primaryCannotUnlink', {
                      defaultValue: 'A conta principal está vinculada à sua conta mestre e não pode ser desvinculada.',
                    })
                  : t('accounts.manageModal.unlinkDesc', {
                      defaultValue: 'Remove o vínculo desta conta secundária do seu painel. A conta continuará existindo no jogo.',
                    })}
              </p>
            </div>
          </div>

          {account.is_primary ? (
            <div className="manage-unlink-notice is-primary-locked">
              <ShieldCheck aria-hidden="true" />
              <span>{t('accounts.manageModal.primaryCannotUnlink', { defaultValue: 'A conta principal está vinculada à sua conta mestre e não pode ser desvinculada.' })}</span>
            </div>
          ) : (
            <div className="manage-unlink-actions">
              {!confirmUnlink ? (
                <MicroResource code="accounts-unlink"><Button
                  variant="danger"
                  size="sm"
                  type="button"
                  onClick={() => setConfirmUnlink(true)}
                >
                  <Trash2 aria-hidden="true" />
                  <span>{t('accounts.manageModal.unlinkBtn', { defaultValue: 'Desvincular do painel' })}</span>
                </Button></MicroResource>
              ) : (
                <div className="manage-unlink-confirm-box">
                  <div className="manage-unlink-confirm-text">
                    <AlertTriangle aria-hidden="true" />
                    <span>
                      {t('accounts.manageModal.unlinkConfirm', {
                        login: account.login,
                        defaultValue: `Tem certeza que deseja desvincular a conta ${account.login}? Você precisará da senha do jogo para vinculá-la novamente.`,
                      })}
                    </span>
                  </div>
                  <div className="manage-unlink-confirm-btns">
                    <Button
                      variant="danger"
                      size="sm"
                      type="button"
                      busy={unlinking}
                      busyLabel={t('accounts.manageModal.unlinking', { defaultValue: 'Desvinculando...' })}
                      onClick={handleUnlink}
                    >
                      {t('accounts.manageModal.unlinkBtn', { defaultValue: 'Desvincular do painel' })}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      type="button"
                      disabled={unlinking}
                      onClick={() => setConfirmUnlink(false)}
                    >
                      {t('accounts.manageModal.cancel', { defaultValue: 'Cancelar' })}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </Modal>
  )
}
