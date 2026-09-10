import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  BookOpen,
  Check,
  Coins,
  Crown,
  Download,
  Gem,
  PackageOpen,
  Rocket,
  Server,
  ShieldCheck,
  Sparkles,
  Swords,
  UserPlus,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { serverApi } from '../services/api'

const RATE_IDS = ['xp', 'sp', 'adena', 'drop', 'spoil'] as const
const RATE_ICONS: Record<(typeof RATE_IDS)[number], LucideIcon> = {
  xp: Zap,
  sp: Sparkles,
  adena: Coins,
  drop: PackageOpen,
  spoil: Gem,
}

const SECTION_IDS = ['geral', 'rates', 'enchant', 'features', 'pvp', 'comecar'] as const
const SECTION_ICONS: Record<(typeof SECTION_IDS)[number], LucideIcon> = {
  geral: Server,
  rates: Activity,
  enchant: ShieldCheck,
  features: Sparkles,
  pvp: Swords,
  comecar: Rocket,
}

export function InfoPage() {
  const { t } = useTranslation('public')
  const { hash } = useLocation()
  const info = useQuery({ queryKey: ['server-info'], queryFn: serverApi.info })
  const status = useQuery({ queryKey: ['server-status'], queryFn: serverApi.status })
  const data = info.data
  const [activeSection, setActiveSection] = useState(hash.replace('#', '') || 'geral')
  const statusLabel = status.isLoading
    ? t('info.statusChecking')
    : status.data?.game_online
      ? t('info.statusOnline')
      : t('info.statusOffline')
  const statusClass = status.isLoading ? 'is-checking' : status.data?.game_online ? 'is-online' : 'is-offline'

  const rateCards = RATE_IDS.map((key) => ({
    key,
    label: t(`info.rate.${key}.label`),
    detail: t(`info.rate.${key}.detail`),
    icon: RATE_ICONS[key],
  }))

  const sections = SECTION_IDS.map((id) => ({
    id,
    label: t(`info.nav.${id}`),
    icon: SECTION_ICONS[id],
  }))

  useEffect(() => {
    const id = hash.replace('#', '')
    if (!id || !data) return
    setActiveSection(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash, data])

  useEffect(() => {
    if (!data) return

    let animationFrame = 0

    const updateActiveSection = () => {
      const marker = window.scrollY + Math.min(window.innerHeight * 0.32, 280)
      let currentSection: (typeof SECTION_IDS)[number] = SECTION_IDS[0]

      SECTION_IDS.forEach((id) => {
        const element = document.getElementById(id)
        if (!element) return

        const elementTop = element.getBoundingClientRect().top + window.scrollY
        if (elementTop <= marker) currentSection = id
      })

      setActiveSection((current) => (current === currentSection ? current : currentSection))
    }

    const handleScroll = () => {
      window.cancelAnimationFrame(animationFrame)
      animationFrame = window.requestAnimationFrame(updateActiveSection)
    }

    updateActiveSection()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [data])

  return (
    <div className="info-page">
      <header className="info-hero">
        <div className="info-hero-glow" aria-hidden="true" />
        <div className="container info-hero-inner">
          <div className="info-hero-copy">
            <span className="info-eyebrow">
              <Crown aria-hidden="true" />
              {t('info.eyebrow')}
            </span>
            <h1>
              {t('info.titleBefore')} <em>{t('info.titleEm')}</em>
            </h1>
            <p>{t('info.lead')}</p>
            <div className="info-hero-actions">
              <Link className="info-action info-action-primary" to="/downloads">
                <Download aria-hidden="true" />
                {t('info.downloadGame')}
              </Link>
              <Link className="info-action info-action-secondary" to="/register">
                <UserPlus aria-hidden="true" />
                {t('info.createAccount')}
              </Link>
            </div>
          </div>

          <aside className="info-hero-card" aria-label={t('info.serverSummaryAria')}>
            <div className="info-server-mark">
              <Server aria-hidden="true" />
            </div>
            <div className="info-server-heading">
              <span>{t('info.mainServer')}</span>
              <strong>{data?.name ?? 'PDL PRO'}</strong>
            </div>
            <div className={`info-live-status ${statusClass}`}>
              <i aria-hidden="true" />
              {statusLabel}
            </div>
            <dl className="info-hero-metrics">
              <div>
                <dt>{t('info.chronicle')}</dt>
                <dd>{data?.chronicle ?? '—'}</dd>
              </div>
              <div>
                <dt>{t('info.maxLevel')}</dt>
                <dd>{data?.max_level ?? '—'}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </header>

      <nav className="info-nav container" aria-label={t('info.sectionsAria')}>
        {sections.map(({ id, label, icon: Icon }) => (
          <a
            key={id}
            href={`#${id}`}
            className={activeSection === id ? 'is-active' : undefined}
            aria-current={activeSection === id ? 'location' : undefined}
          >
            <Icon aria-hidden="true" />
            {label}
          </a>
        ))}
      </nav>

      <main className="container info-content">
        {info.isLoading ? (
          <div className="info-empty">
            <span className="info-diamond" aria-hidden="true" />
            <p>{t('info.loading')}</p>
          </div>
        ) : info.isError ? (
          <div className="info-empty">
            <span className="info-diamond" aria-hidden="true" />
            <p>{t('info.error')}</p>
          </div>
        ) : (
          <>
            <section className="info-section info-overview" id="geral">
              <div className="info-section-heading">
                <span>01</span>
                <div>
                  <small>{t('info.overviewKicker')}</small>
                  <h2>{t('info.overviewTitle')}</h2>
                </div>
              </div>
              <div className="info-overview-grid">
                <article className="info-story-card">
                  <span className="info-card-kicker">{t('info.storyKicker')}</span>
                  <h3>{data?.name ?? 'PDL PRO'}</h3>
                  <p>{data?.description || t('info.descriptionFallback')}</p>
                  <div className="info-story-line">
                    <span />
                    {t('info.chronicleLine', { chronicle: data?.chronicle ?? '—' })}
                  </div>
                </article>

                <div className="info-plaque">
                  <div>
                    <Server aria-hidden="true" />
                    <span>{t('info.server')}</span>
                    <strong>{data?.name ?? '—'}</strong>
                  </div>
                  <div>
                    <BookOpen aria-hidden="true" />
                    <span>{t('info.chronicle')}</span>
                    <strong>{data?.chronicle ?? '—'}</strong>
                  </div>
                  <div>
                    <Crown aria-hidden="true" />
                    <span>{t('info.maxLevel')}</span>
                    <strong>{data?.max_level ?? '—'}</strong>
                  </div>
                  <div>
                    <Activity aria-hidden="true" />
                    <span>{t('info.status')}</span>
                    <strong className={statusClass}>{statusLabel}</strong>
                  </div>
                </div>
              </div>
            </section>

            <section className="info-section" id="rates">
              <div className="info-section-heading">
                <span>02</span>
                <div>
                  <small>{t('info.ratesKicker')}</small>
                  <h2>{t('info.ratesTitle')}</h2>
                </div>
              </div>
              <div className="info-rate-grid">
                {rateCards.map(({ key, label, detail, icon: Icon }) => (
                  <article className="info-rate-card" key={key}>
                    <div className="info-card-icon">
                      <Icon aria-hidden="true" />
                    </div>
                    <span>{label}</span>
                    <strong>{data?.rates[key] ?? '—'}</strong>
                    <small>{detail}</small>
                  </article>
                ))}
              </div>
            </section>

            <section className="info-section" id="enchant">
              <div className="info-section-heading">
                <span>03</span>
                <div>
                  <small>{t('info.enchantKicker')}</small>
                  <h2>{t('info.enchantTitle')}</h2>
                </div>
              </div>
              <div className="info-enchant">
                <article>
                  <div className="info-enchant-icon">
                    <ShieldCheck aria-hidden="true" />
                  </div>
                  <div>
                    <span>{t('info.enchantSafe')}</span>
                    <p>{t('info.enchantSafeBlurb')}</p>
                  </div>
                  <strong>{data?.enchant.safe ?? '—'}</strong>
                </article>
                <article>
                  <div className="info-enchant-icon">
                    <Sparkles aria-hidden="true" />
                  </div>
                  <div>
                    <span>{t('info.enchantMax')}</span>
                    <p>{t('info.enchantMaxBlurb')}</p>
                  </div>
                  <strong>{data?.enchant.max ?? '—'}</strong>
                </article>
              </div>
            </section>

            <section className="info-section" id="features">
              <div className="info-section-heading">
                <span>04</span>
                <div>
                  <small>{t('info.featuresKicker')}</small>
                  <h2>{t('info.featuresTitle')}</h2>
                </div>
              </div>
              {(data?.features ?? []).length ? (
                <ul className="info-features">
                  {(data?.features ?? []).map((item, index) => (
                    <li key={item}>
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <Check aria-hidden="true" />
                      <strong>{item}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="info-lead">{t('info.featuresEmpty')}</p>
              )}
            </section>

            <div className="info-split">
              <section className="info-panel" id="pvp">
                <div className="info-panel-icon">
                  <Swords aria-hidden="true" />
                </div>
                <small>{t('info.pvpKicker')}</small>
                <h2>{t('info.pvpTitle')}</h2>
                <p>{data?.notes.pvp || t('info.pvpFallback')}</p>
                <span className="info-panel-number">05</span>
              </section>
              <section className="info-panel" id="comecar">
                <div className="info-panel-icon">
                  <Rocket aria-hidden="true" />
                </div>
                <small>{t('info.startKicker')}</small>
                <h2>{t('info.startTitle')}</h2>
                <p>{data?.notes.start || t('info.startFallback')}</p>
                <span className="info-panel-number">06</span>
              </section>
            </div>

            <section className="info-cta">
              <div>
                <span className="info-eyebrow">
                  <Crown aria-hidden="true" />
                  {t('info.ctaEyebrow')}
                </span>
                <h2>{t('info.ctaTitle')}</h2>
                <p>{t('info.ctaLead')}</p>
              </div>
              <div className="info-cta-actions">
                <Link className="info-action info-action-primary" to="/register">
                  <UserPlus aria-hidden="true" />
                  {t('info.createAccount')}
                </Link>
                <Link className="info-action info-action-secondary" to="/downloads">
                  <Download aria-hidden="true" />
                  {t('info.downloadShort')}
                </Link>
                <Link className="info-wiki-link" to="/wiki">
                  <BookOpen aria-hidden="true" />
                  {t('info.openWiki')}
                </Link>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
