import {
  Activity,
  BookOpen,
  Check,
  Coins,
  Crown,
  Gem,
  PackageOpen,
  Rocket,
  Server,
  ShieldCheck,
  Sparkles,
  Swords,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ApiServerInfo } from '../../services/types'

const RATE_IDS = ['xp', 'sp', 'adena', 'drop', 'spoil'] as const
const RATE_ICONS: Record<(typeof RATE_IDS)[number], LucideIcon> = {
  xp: Zap,
  sp: Sparkles,
  adena: Coins,
  drop: PackageOpen,
  spoil: Gem,
}

export const INFO_SECTION_IDS = ['geral', 'rates', 'enchant', 'features', 'pvp', 'comecar'] as const

type InfoSectionsProps = {
  data: ApiServerInfo
  statusLabel: string
  statusClass: string
  loading?: boolean
  error?: boolean
  /** Prefixo de id para evitar colisão com âncoras da /info na mesma SPA. */
  idPrefix?: string
}

/** Seções públicas de Informações (Visão geral → Começar), reutilizadas na /info e na Coming Soon. */
export function InfoSections({
  data,
  statusLabel,
  statusClass,
  loading = false,
  error = false,
  idPrefix = '',
}: InfoSectionsProps) {
  const { t } = useTranslation('public')
  const sectionId = (id: string) => `${idPrefix}${id}`

  const rateCards = RATE_IDS.map((key) => ({
    key,
    label: t(`info.rate.${key}.label`),
    detail: t(`info.rate.${key}.detail`),
    icon: RATE_ICONS[key],
  }))

  if (loading) {
    return (
      <div className="info-empty">
        <span className="info-diamond" aria-hidden="true" />
        <p>{t('info.loading')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="info-empty">
        <span className="info-diamond" aria-hidden="true" />
        <p>{t('info.error')}</p>
      </div>
    )
  }

  return (
    <>
      <section className="info-section info-overview" id={sectionId('geral')}>
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
            <h3>{data.name || 'PDL PRO'}</h3>
            <p>{data.description || t('info.descriptionFallback')}</p>
            <div className="info-story-line">
              <span />
              {t('info.chronicleLine', { chronicle: data.chronicle || '—' })}
            </div>
          </article>

          <div className="info-plaque">
            <div>
              <Server aria-hidden="true" />
              <span>{t('info.server')}</span>
              <strong>{data.name || '—'}</strong>
            </div>
            <div>
              <BookOpen aria-hidden="true" />
              <span>{t('info.chronicle')}</span>
              <strong>{data.chronicle || '—'}</strong>
            </div>
            <div>
              <Crown aria-hidden="true" />
              <span>{t('info.maxLevel')}</span>
              <strong>{data.max_level ?? '—'}</strong>
            </div>
            <div>
              <Activity aria-hidden="true" />
              <span>{t('info.status')}</span>
              <strong className={statusClass}>{statusLabel}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="info-section" id={sectionId('rates')}>
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
              <strong>{data.rates[key] ?? '—'}</strong>
              <small>{detail}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="info-section" id={sectionId('enchant')}>
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
            <strong>{data.enchant.safe ?? '—'}</strong>
          </article>
          <article>
            <div className="info-enchant-icon">
              <Sparkles aria-hidden="true" />
            </div>
            <div>
              <span>{t('info.enchantMax')}</span>
              <p>{t('info.enchantMaxBlurb')}</p>
            </div>
            <strong>{data.enchant.max ?? '—'}</strong>
          </article>
        </div>
      </section>

      <section className="info-section" id={sectionId('features')}>
        <div className="info-section-heading">
          <span>04</span>
          <div>
            <small>{t('info.featuresKicker')}</small>
            <h2>{t('info.featuresTitle')}</h2>
          </div>
        </div>
        {(data.features ?? []).length ? (
          <ul className="info-features">
            {(data.features ?? []).map((item, index) => (
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
        <section className="info-panel" id={sectionId('pvp')}>
          <div className="info-panel-icon">
            <Swords aria-hidden="true" />
          </div>
          <small>{t('info.pvpKicker')}</small>
          <h2>{t('info.pvpTitle')}</h2>
          <p>{data.notes.pvp || t('info.pvpFallback')}</p>
          <span className="info-panel-number">05</span>
        </section>
        <section className="info-panel" id={sectionId('comecar')}>
          <div className="info-panel-icon">
            <Rocket aria-hidden="true" />
          </div>
          <small>{t('info.startKicker')}</small>
          <h2>{t('info.startTitle')}</h2>
          <p>{data.notes.start || t('info.startFallback')}</p>
          <span className="info-panel-number">06</span>
        </section>
      </div>
    </>
  )
}
