import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import { useAuth } from '../../contexts/AuthContext'
import { authApi } from '../../services/api'
import { apiErrorMessage } from '../../lib/errors'
import './legal.css'

export function TermsReacceptanceGate() {
  const { t } = useTranslation('public')
  const { user, loading, logout, refreshUser } = useAuth()
  const [accepted, setAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (loading || !user?.needs_terms_acceptance) return null

  const firstAcceptance = !user.terms_accepted_at
  const version = user.current_legal_docs_version || ''

  async function handleAccept() {
    if (!accepted) {
      setError(t('legalGate.required'))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await authApi.acceptTerms({ terms_accepted: true })
      await refreshUser()
    } catch (err) {
      setError(apiErrorMessage(err, t('legalGate.error')))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="terms-reacceptance-gate" role="dialog" aria-modal="true" aria-labelledby="terms-reacceptance-title">
      <div className="terms-reacceptance-panel">
        <h2 id="terms-reacceptance-title">
          {firstAcceptance ? t('legalGate.firstTitle') : t('legalGate.updateTitle')}
        </h2>
        <p>
          {firstAcceptance
            ? t('legalGate.firstLead')
            : t('legalGate.updateLead', { version })}
        </p>
        <ul className="terms-reacceptance-links">
          <li>
            <Link to="/terms" target="_blank" rel="noopener noreferrer">
              {t('legal.terms')}
            </Link>
          </li>
          <li>
            <Link to="/privacy" target="_blank" rel="noopener noreferrer">
              {t('legal.privacy')}
            </Link>
          </li>
          <li>
            <Link to="/agreement" target="_blank" rel="noopener noreferrer">
              {t('legal.agreement')}
            </Link>
          </li>
          <li>
            <Link to="/lgpd" target="_blank" rel="noopener noreferrer">
              {t('legal.lgpd')}
            </Link>
          </li>
        </ul>
        <label className="auth-check">
          <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
          {t('legalGate.checkbox')}
        </label>
        {error ? <p className="ui-error" role="alert">{error}</p> : null}
        <div className="terms-reacceptance-actions">
          <Button type="button" variant="ghost" onClick={() => void logout()}>
            {t('legalGate.logout')}
          </Button>
          <Button type="button" busy={submitting} onClick={() => void handleAccept()}>
            {t('legalGate.accept')}
          </Button>
        </div>
      </div>
    </div>
  )
}
