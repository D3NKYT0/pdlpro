import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BookOpen,
  Crown,
  Download,
  Rocket,
  Server,
  ShieldCheck,
  Sparkles,
  Swords,
  UserPlus,
  Activity,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { INFO_SECTION_IDS, InfoSections } from '../components/info/InfoSections'
import { serverApi } from '../services/api'

const SECTION_ICONS: Record<(typeof INFO_SECTION_IDS)[number], LucideIcon> = {
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

  const sections = INFO_SECTION_IDS.map((id) => ({
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
      let currentSection: (typeof INFO_SECTION_IDS)[number] = INFO_SECTION_IDS[0]

      INFO_SECTION_IDS.forEach((id) => {
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
        {info.isLoading || info.isError || !data ? (
          <InfoSections
            data={{
              name: '',
              slogan: '',
              description: '',
              chronicle: '',
              rates: {},
              enchant: {},
              max_level: 0,
              features: [],
              notes: {},
              coming_soon: false,
              coming_soon_show_info: false,
              coming_soon_show_champions: true,
              coming_soon_title: '',
              coming_soon_subtitle: '',
              coming_soon_at: null,
              staff_only_login: false,
              allow_registration: true,
              allow_l2_registration: true,
            }}
            statusLabel={statusLabel}
            statusClass={statusClass}
            loading={info.isLoading}
            error={info.isError}
          />
        ) : (
          <>
            <InfoSections data={data} statusLabel={statusLabel} statusClass={statusClass} />
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
