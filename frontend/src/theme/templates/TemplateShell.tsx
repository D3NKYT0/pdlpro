import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleUserRound } from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { LANDING_PATHS, useLandingPath } from '../../hooks/useLandingPath'
import { programsApi, type ThemePresentation } from '../../services/api'
import { themeAsset } from '../assets'
import { useTheme } from '../ThemeProvider'
import { extensionNavItems, isExtensionResourceEnabled } from '../../extensions'
import { LanguageSwitcher } from '../../components/i18n/LanguageSwitcher'
import { PdlSymbol } from '../../components/PdlSymbol'
import { PUBLIC_TEMPLATES } from './catalog'
import type { ThemeCatalogId } from '../../services/api'

function activeRoute(pathname: string, target: string) {
  if (LANDING_PATHS.includes(target)) return LANDING_PATHS.includes(pathname)
  return pathname === target || pathname.startsWith(`${target}/`)
}

export function TemplateShell({
  presentation,
  templateId,
}: {
  presentation: ThemePresentation
  templateId: ThemeCatalogId
}) {
  const { t } = useTranslation('public')
  const { user } = useAuth()
  const { pathname } = useLocation()
  const landingPath = useLandingPath()
  const template = PUBLIC_TEMPLATES[templateId]
  const theme = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const resources = useQuery({
    queryKey: ['resources'],
    queryFn: programsApi.resources,
    staleTime: 15000,
  })
  const navigation = [
    ...presentation.navigation.map((item) =>
      item.to === '/' ? { ...item, to: landingPath } : item,
    ),
    ...extensionNavItems('public')
      .filter((item) => isExtensionResourceEnabled(resources.data, item.resource))
      .map((item) => ({
        label: t(item.labelKey, { ns: item.ns }),
        to: item.to,
      })),
  ]
  const downloadsEnabled = !resources.data?.some((item) => item.code === 'downloads' && !item.enabled)
  const packedWordmark = theme.assets['images/logo-text.png']
  const markSrc =
    template.mark === 'symbol'
      ? themeAsset('images/pdl-symbol.svg')
      : template.mark === 'wordmark' && packedWordmark
        ? packedWordmark
        : themeAsset('images/logo.png')

  useEffect(() => setMenuOpen(false), [pathname])
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const links = navigation.map((item) => (
    <Link className={activeRoute(pathname, item.to) ? 'is-active' : undefined} key={`${item.to}-${item.label}`} to={item.to}>
      {item.label}
    </Link>
  ))

  return (
    <div
      className={`tpl-shell tpl-shell--${template.shell}`}
      data-theme-surface="public"
      data-theme-renderer={presentation.renderer}
      data-theme-template={templateId}
    >
      <header className="tpl-header">
        <div className="tpl-header__inner tpl-wrap">
          <Link to={landingPath} className="tpl-brand" aria-label={t('portal.homeAria')}>
            {template.shell === 'court' ? <PdlSymbol className="tpl-brand__mark" /> : null}
            <img src={markSrc} alt="" />
          </Link>
          {template.shell !== 'banner' && template.shell !== 'minimal' ? (
            <nav className="tpl-nav" aria-label={t('nav.main')}>{links}</nav>
          ) : null}
          <div className="tpl-header__actions site-nav-actions">
            <LanguageSwitcher className="language-switcher site-nav-language" id={`tpl-language-${templateId}`} />
            <Link className="user" to={user ? '/panel' : '/login'}>
              <CircleUserRound aria-hidden="true" />
              <span>{user ? t('nav.myAccount') : t('nav.signIn')}</span>
            </Link>
            {downloadsEnabled ? <Link className="download" to="/downloads">{t('nav.download')}</Link> : null}
            <button className="tpl-hamburger" type="button" aria-label={t('nav.openMenu')} aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>

      <div className={`tpl-mobile${menuOpen ? ' is-open' : ''}`} hidden={!menuOpen}>
        <button className="tpl-mobile__close" type="button" aria-label={t('nav.closeMenu')} onClick={() => setMenuOpen(false)}>×</button>
        <nav aria-label={t('portal.mobileNav')}>
          {navigation.map((item) => <Link key={`${item.to}-${item.label}`} to={item.to}>{item.label}</Link>)}
          <Link to={user ? '/panel' : '/login'}>{user ? t('nav.myAccount') : t('nav.signIn')}</Link>
          {downloadsEnabled ? <Link to="/downloads">{t('nav.download')}</Link> : null}
          {!user ? <Link to="/register">{t('portal.createAccount')}</Link> : null}
        </nav>
      </div>

      <main className="tpl-main"><Outlet /></main>

      <footer className="tpl-footer">
        <div className="tpl-wrap tpl-footer__inner">
          <div className="tpl-footer__brand">
            <Link to={landingPath} className="tpl-brand tpl-brand--footer" aria-label={t('portal.homeAria')}>
              <img src={markSrc} alt="" />
            </Link>
            <p className="tpl-footer__tagline">{presentation.footer.tagline}</p>
          </div>
          <nav className="tpl-footer__nav" aria-label={t('portal.footerNav')}>
            {navigation.slice(0, 5).map((item) => <Link key={`${item.to}-${item.label}`} to={item.to}>{item.label}</Link>)}
          </nav>
          <div className="tpl-footer__base">
            <p className="tpl-footer__copy">{presentation.footer.copyright}</p>
            <p className="tpl-footer__legal">
              <Link to="/terms">{t('footer.terms')}</Link> · <Link to="/privacy">{t('footer.privacy')}</Link> · <Link to="/agreement">{t('footer.agreement')}</Link> · <Link to="/cookies">{t('footer.cookies')}</Link> · <Link to="/lgpd">{t('footer.lgpd')}</Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
