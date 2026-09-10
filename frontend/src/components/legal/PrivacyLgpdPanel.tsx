import { Cookie, FileJson, Mail, Send, Settings2, ShieldCheck, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { Card } from '../ui/Card'
import { useCookieConsent } from '../../contexts/CookieConsentContext'
import { COOKIE_POLICY_VERSION } from '../../contexts/CookieConsentContext'
import { formatDateTime } from '../../lib/formatters'

type PrivacyLgpdPanelProps = {
  message: string | null
  error: string | null
  exporting: boolean
  deleting: boolean
  requestingCode: boolean
  deleteCode: string
  onDeleteCodeChange: (value: string) => void
  onExportData: () => void
  onRequestDeleteCode: () => void
  onDeleteAccount: () => void
}

export function CookieConsentSummary() {
  const { t } = useTranslation('panel')
  const { consent, hasDecided, decidedAt, openSettings, reset } = useCookieConsent()

  return (
    <div className="security-cookie-summary">
      <div className="security-cookie-summary__head">
        <Cookie aria-hidden="true" />
        <strong>{t('security.cookiePreferences')}</strong>
        {hasDecided ? (
          <span className="muted">
            {t('security.cookieUpdatedAt', {
              date: decidedAt ? formatDateTime(decidedAt) : '—',
            })}
          </span>
        ) : (
          <span className="security-cookie-summary__warn">{t('security.cookieNotSet')}</span>
        )}
      </div>
      {hasDecided && consent ? (
        <ul className="security-cookie-chips">
          {(
            [
              [t('security.cookieEssential'), true],
              [t('security.cookieFunctional'), consent.functional],
              [t('security.cookieAnalytics'), consent.analytics],
              [t('security.cookieMarketing'), consent.marketing],
            ] as const
          ).map(([label, on]) => (
            <li key={label} className={on ? 'is-on' : 'is-off'}>
              {label}: {on ? t('security.cookieOn') : t('security.cookieOff')}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="security-cookie-actions">
        <Button type="button" size="sm" onClick={openSettings}>
          <Settings2 /> {t('security.manageCookies')}
        </Button>
        {hasDecided ? (
          <Button type="button" size="sm" variant="ghost" onClick={reset}>
            {t('security.resetConsent')}
          </Button>
        ) : null}
        <Link to="/cookies" className="security-legal-inline-link">
          {t('security.cookiesPolicy')}
        </Link>
      </div>
      <p className="muted security-cookie-version">
        {t('security.cookiePolicyVersion', { version: COOKIE_POLICY_VERSION })}
      </p>
    </div>
  )
}

const LEGAL_LINKS = [
  { to: '/terms', titleKey: 'security.legalTermsTitle', summaryKey: 'security.legalTermsSummary' },
  { to: '/privacy', titleKey: 'security.legalPrivacyTitle', summaryKey: 'security.legalPrivacySummary' },
  { to: '/agreement', titleKey: 'security.legalAgreementTitle', summaryKey: 'security.legalAgreementSummary' },
  { to: '/lgpd', titleKey: 'security.legalLgpdTitle', summaryKey: 'security.legalLgpdSummary' },
  { to: '/cookies', titleKey: 'security.legalCookiesTitle', summaryKey: 'security.legalCookiesSummary' },
  { to: '/legal/history', titleKey: 'security.legalHistoryTitle', summaryKey: 'security.legalHistorySummary' },
] as const

export function PrivacyLgpdPanel({
  message,
  error,
  exporting,
  deleting,
  requestingCode,
  deleteCode,
  onDeleteCodeChange,
  onExportData,
  onRequestDeleteCode,
  onDeleteAccount,
}: PrivacyLgpdPanelProps) {
  const { t } = useTranslation('panel')

  return (
    <Card className="security-card security-privacy" id="privacidade">
      <header>
        <span>
          <ShieldCheck />
        </span>
        <div>
          <h2>{t('security.privacyTitle')}</h2>
          <p>{t('security.privacySubtitle')}</p>
        </div>
      </header>

      <p className="muted">{t('security.privacyHint')}</p>

      <div className="security-legal-grid">
        {LEGAL_LINKS.map((item) => (
          <Link key={item.to} className="security-legal-card" to={item.to} target="_blank" rel="noopener noreferrer">
            <strong>{t(item.titleKey)}</strong>
            <small>{t(item.summaryKey)}</small>
          </Link>
        ))}
      </div>

      <div className="security-lgpd-box">
        <div className="security-lgpd-box__head">
          <FileJson aria-hidden="true" />
          <div>
            <strong>{t('security.lgpdRights')}</strong>
            <p className="muted">{t('security.lgpdRightsDescription')}</p>
          </div>
        </div>

        {message ? <p className="security-lgpd-msg is-ok" role="status">{message}</p> : null}
        {error ? (
          <p className="security-lgpd-msg is-err" role="alert">
            {error}
          </p>
        ) : null}

        <div className="security-lgpd-actions">
          <Button type="button" size="sm" disabled={exporting || deleting} onClick={onExportData}>
            <Send /> {exporting ? t('security.requestingExport') : t('security.sendDataByEmail')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={requestingCode || deleting || exporting}
            onClick={onRequestDeleteCode}
          >
            <Mail /> {requestingCode ? t('security.sendingDeleteCode') : t('security.sendDeleteCode')}
          </Button>
        </div>

        <div className="security-lgpd-delete-row">
          <Field>
            {t('security.deleteCodeLabel')}
            <input
              type="text"
              value={deleteCode}
              onChange={(event) => onDeleteCodeChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder={t('security.deleteCodePlaceholder')}
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label={t('security.deleteCodeAria')}
            />
          </Field>
          <Button
            type="button"
            size="sm"
            variant="danger"
            disabled={deleting || exporting || deleteCode.trim().length < 6}
            onClick={onDeleteAccount}
          >
            <Trash2 /> {deleting ? t('security.deletingAccount') : t('security.deleteMyAccount')}
          </Button>
        </div>
      </div>

      <CookieConsentSummary />
    </Card>
  )
}
