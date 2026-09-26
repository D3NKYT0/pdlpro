import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check, ChevronDown, Gamepad2, Plus, UserRoundCog } from 'lucide-react'
import { useActiveAccount } from '../../contexts/ActiveAccountContext'
import './active-account-switcher.css'

export function ActiveAccountSwitcher() {
  const { t } = useTranslation('panel')
  const navigate = useNavigate()
  const { activeLogin, accounts, setActiveAccount, isLoading } = useActiveAccount()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  if (isLoading) {
    return (
      <div className="active-account-skeleton" aria-hidden="true">
        <Gamepad2 className="account-switcher-icon" />
        <span className="account-switcher-label">...</span>
      </div>
    )
  }

  if (!accounts.length) {
    return (
      <Link
        to="/panel/accounts"
        className="active-account-trigger is-empty"
        title={t('activeAccount.createFirst', { defaultValue: 'Criar conta de jogo L2' })}
      >
        <Gamepad2 className="account-switcher-icon" aria-hidden="true" />
        <span className="account-switcher-label">{t('activeAccount.createFirst', { defaultValue: 'Criar conta L2' })}</span>
        <Plus className="account-switcher-add-icon" aria-hidden="true" />
      </Link>
    )
  }

  return (
    <div className="active-account-switcher" ref={containerRef}>
      <button
        type="button"
        className={`active-account-trigger ${open ? 'is-open' : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={t('activeAccount.ariaLabel', { defaultValue: 'Seletor de conta de jogo ativa' })}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="active-account-status-dot" aria-hidden="true" />
        <Gamepad2 className="account-switcher-icon" aria-hidden="true" />
        <div className="active-account-trigger-info">
          <span className="active-account-caption">{t('activeAccount.title', { defaultValue: 'Conta Ativa' })}</span>
          <strong className="account-switcher-label">{activeLogin || accounts[0]?.login}</strong>
        </div>
        <ChevronDown className={`account-switcher-chevron ${open ? 'is-rotated' : ''}`} aria-hidden="true" />
      </button>

      {open ? (
        <div className="active-account-dropdown" role="menu">
          <div className="active-account-dropdown-header">
            <span>{t('activeAccount.title', { defaultValue: 'Conta de Jogo Ativa' })}</span>
            <small>{accounts.length} {accounts.length === 1 ? 'conta' : 'contas'}</small>
          </div>

          <div className="active-account-list">
            {accounts.map((acc) => {
              const isCurrent = acc.login.toLowerCase() === activeLogin?.toLowerCase()
              return (
                <button
                  key={acc.login}
                  type="button"
                  role="menuitem"
                  className={`active-account-item ${isCurrent ? 'is-active' : ''}`}
                  onClick={() => {
                    void setActiveAccount(acc.login)
                    setOpen(false)
                  }}
                >
                  <span className="active-account-item-icon">
                    <Gamepad2 aria-hidden="true" />
                  </span>
                  <div className="active-account-item-details">
                    <strong>{acc.login}</strong>
                    {isCurrent ? (
                      <span className="active-badge">{t('activeAccount.activeBadge', { defaultValue: 'Ativa' })}</span>
                    ) : null}
                  </div>
                  {isCurrent ? <Check className="active-account-check" aria-hidden="true" /> : null}
                </button>
              )
            })}
          </div>

          <div className="active-account-dropdown-footer">
            <button
              type="button"
              className="active-account-manage-btn"
              onClick={() => {
                setOpen(false)
                navigate('/panel/accounts')
              }}
            >
              <UserRoundCog aria-hidden="true" />
              <span>{t('activeAccount.manageAccounts', { defaultValue: 'Gerenciar contas L2' })}</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
