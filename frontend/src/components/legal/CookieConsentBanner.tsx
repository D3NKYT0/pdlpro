import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import { useCookieConsent, type CookieConsent } from '../../contexts/CookieConsentContext'
import './legal.css'

const OPTIONAL: Array<keyof Omit<CookieConsent, 'essential'>> = ['functional', 'analytics', 'marketing']

export function CookieConsentBanner() {
  const { t } = useTranslation('public')
  const {
    hasDecided,
    consent,
    isSettingsOpen,
    openSettings,
    closeSettings,
    acceptAll,
    rejectOptional,
    savePreferences,
  } = useCookieConsent()

  const [draft, setDraft] = useState<Omit<CookieConsent, 'essential'>>({
    functional: consent?.functional ?? false,
    analytics: consent?.analytics ?? false,
    marketing: consent?.marketing ?? false,
  })

  useEffect(() => {
    if (isSettingsOpen) {
      setDraft({
        functional: consent?.functional ?? false,
        analytics: consent?.analytics ?? false,
        marketing: consent?.marketing ?? false,
      })
    }
  }, [isSettingsOpen, consent])

  const showBanner = !hasDecided
  if (!showBanner && !isSettingsOpen) return null

  return (
    <>
      {showBanner ? (
        <aside className="cookie-banner" role="dialog" aria-live="polite" aria-label={t('cookieConsent.bannerAria')}>
          <div className="cookie-banner-copy">
            <strong>{t('cookieConsent.bannerTitle')}</strong>
            <p>
              {t('cookieConsent.bannerBefore')}{' '}
              <Link to="/cookies">{t('cookieConsent.cookiesLink')}</Link>{' '}
              {t('cookieConsent.bannerMiddle')}{' '}
              <Link to="/privacy">{t('cookieConsent.privacyLink')}</Link>.
            </p>
          </div>
          <div className="cookie-banner-actions">
            <Button type="button" variant="ghost" size="sm" onClick={openSettings}>
              {t('cookieConsent.customize')}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={rejectOptional}>
              {t('cookieConsent.essentialOnly')}
            </Button>
            <Button type="button" size="sm" onClick={acceptAll}>
              {t('cookieConsent.acceptAll')}
            </Button>
          </div>
        </aside>
      ) : null}

      {isSettingsOpen ? (
        <div
          className="cookie-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={t('cookieConsent.modalAria')}
          onClick={(event) => {
            if (event.target === event.currentTarget && hasDecided) closeSettings()
          }}
        >
          <div className="cookie-modal">
            <header>
              <h2>{t('cookieConsent.modalTitle')}</h2>
              <p>{t('cookieConsent.modalLead')}</p>
            </header>
            <ul className="cookie-modal-categories">
              <li>
                <label>
                  <input type="checkbox" checked disabled readOnly />
                  <span>
                    <strong>{t('cookieConsent.essential')}</strong>
                    <small>{t('cookieConsent.essentialHint')}</small>
                  </span>
                </label>
              </li>
              {OPTIONAL.map((id) => (
                <li key={id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={draft[id]}
                      onChange={(event) => setDraft((prev) => ({ ...prev, [id]: event.target.checked }))}
                    />
                    <span>
                      <strong>{t(`cookieConsent.${id}`)}</strong>
                      <small>{t(`cookieConsent.${id}Hint`)}</small>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="cookie-modal-actions">
              {hasDecided ? (
                <Button type="button" variant="ghost" size="sm" onClick={closeSettings}>
                  {t('cookieConsent.cancel')}
                </Button>
              ) : null}
              <Button type="button" variant="secondary" size="sm" onClick={rejectOptional}>
                {t('cookieConsent.essentialOnly')}
              </Button>
              <Button type="button" size="sm" onClick={() => savePreferences(draft)}>
                {t('cookieConsent.save')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
