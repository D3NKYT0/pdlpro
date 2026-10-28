import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BookOpen,
  ChevronDown,
  Coins,
  Compass,
  Crown,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { ButtonLink } from '../ui/Button'
import { Tabs } from '../ui/Tabs'
import type { ApiServerInfo, ThemeInfoGuideIcon } from '../../services/api'
import { guideRates, INFO_GUIDE_ANCHORS, resolveInfoGuideHash, type InfoGuideStyle } from '../../lib/pageStyles'
import { themeAsset } from '../../theme/assets'

const GUIDE_ICONS: Record<ThemeInfoGuideIcon, LucideIcon> = {
  compass: Compass,
  sparkles: Sparkles,
  swords: Swords,
  trophy: Trophy,
  coins: Coins,
  shield: Shield,
  book: BookOpen,
  crown: Crown,
}

type InfoGuideProps = {
  style: InfoGuideStyle
  data: ApiServerInfo | undefined
  loading?: boolean
  error?: boolean
  /** Prefixo das âncoras quando o guia aparece dentro de outra página (Coming Soon). */
  idPrefix?: string
  /** Dentro de outra página: sem `<h1>` e sem os botões finais repetidos. */
  embedded?: boolean
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/**
 * Estilo `guide` da /info: rates em faixa, uma categoria por vez e linhas expansíveis.
 * Estrutura (ids, ícones, ordem) vem do `theme.json`; textos do locale do tema,
 * com rates/enchant interpolados da configuração do servidor.
 */
export function InfoGuide({ style, data, loading = false, error = false, idPrefix = '', embedded = false }: InfoGuideProps) {
  const { t } = useTranslation('public')
  const { hash } = useLocation()
  const { categories, heroImage } = style
  const anchor = (id: string) => `${idPrefix}${id}`
  const [active, setActive] = useState(() => {
    const fromHash = embedded ? null : resolveInfoGuideHash(hash, categories).category
    return fromHash ?? categories[0].id
  })
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set())

  const vars = useMemo(
    () => ({
      name: data?.name?.trim() || 'PDL PRO',
      chronicle: data?.chronicle || '—',
      maxLevel: data?.max_level || '—',
      rates: data?.rates ?? {},
      enchant: data?.enchant ?? {},
      notes: data?.notes ?? {},
    }),
    [data],
  )

  const selectCategory = (id: string) => {
    if (id === activeRef.current) return
    activeRef.current = id
    setActive(id)
    setOpen(new Set())
  }
  const activeRef = useRef(active)
  const loaded = Boolean(data)

  useEffect(() => {
    if (embedded || !loaded) return
    const target = resolveInfoGuideHash(hash, categories)
    if (target.category && target.category !== activeRef.current) {
      activeRef.current = target.category
      setActive(target.category)
      setOpen(new Set())
    }
    if (target.anchor) {
      document
        .getElementById(`${idPrefix}${target.anchor}`)
        ?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
    }
  }, [hash, loaded, categories, embedded, idPrefix])

  const toggleRow = (rowId: string) => {
    setOpen((current) => {
      const next = new Set(current)
      if (next.has(rowId)) next.delete(rowId)
      else next.add(rowId)
      return next
    })
  }

  const category = categories.find((item) => item.id === active) ?? categories[0]
  const categoryKey = (id: string) => `infoGuide.categories.${id}`
  const rates = guideRates(data?.rates)
  const TitleTag = embedded ? 'h2' : 'h1'
  const menuId = anchor('info-guide')

  return (
    <div className={`info-guide${embedded ? ' is-embedded' : ''}`} id={anchor(INFO_GUIDE_ANCHORS.root)} data-theme-part="info-guide">
      <header className="info-guide__hero">
        {heroImage && !embedded ? (
          <img className="info-guide__hero-art" src={themeAsset(heroImage)} alt="" aria-hidden="true" width={1600} height={900} decoding="async" />
        ) : null}
        <div className="container info-guide__hero-inner">
          <span className="info-guide__eyebrow">{t('infoGuide.eyebrow')}</span>
          <TitleTag className="info-guide__title">
            {t('infoGuide.titleBefore')} <em>{t('infoGuide.titleEm')}</em>
          </TitleTag>
          <p className="info-guide__subtitle">{t('infoGuide.subtitle', vars)}</p>
        </div>
      </header>

      <div className="container info-guide__body">
        {loading || error || !data ? (
          <div className="info-empty" role={error ? 'alert' : 'status'}>
            <span className="info-diamond" aria-hidden="true" />
            <p>{error ? t('info.error') : t('info.loading')}</p>
          </div>
        ) : (
          <>
            {rates.length ? (
              <dl className="info-guide__rates" id={anchor(INFO_GUIDE_ANCHORS.rates)} aria-label={t('infoGuide.ratesLabel')}>
                {rates.map((rate) => (
                  <div key={rate.id} className="info-guide__rate">
                    <dt>{t(`infoGuide.rates.${rate.id}`)}</dt>
                    <dd>{rate.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            <div className="info-guide__layout" id={anchor(INFO_GUIDE_ANCHORS.menu)}>
              <div className="info-guide__menu">
                <span className="info-guide__menu-title" aria-hidden="true">{t('infoGuide.menuTitle')}</span>
                <Tabs
                  id={menuId}
                  label={t('infoGuide.menuLabel')}
                  className="info-guide__tabs"
                  value={category.id}
                  onChange={selectCategory}
                  items={categories.map((item) => {
                    const Icon = GUIDE_ICONS[item.icon] ?? Compass
                    return {
                      id: item.id,
                      label: t(`${categoryKey(item.id)}.label`, { ...vars, defaultValue: item.id }),
                      icon: <Icon aria-hidden="true" />,
                    }
                  })}
                />
              </div>

              <section
                className="info-guide__panel"
                id={`${menuId}-panel-${category.id}`}
                role="tabpanel"
                aria-labelledby={`${menuId}-tab-${category.id}`}
              >
                <div className="info-guide__panel-head" id={anchor(INFO_GUIDE_ANCHORS.content)}>
                  <h2>{t(`${categoryKey(category.id)}.title`, { ...vars, defaultValue: category.id })}</h2>
                  <span className="info-guide__panel-index" aria-hidden="true">
                    {String(categories.indexOf(category) + 1).padStart(2, '0')}
                  </span>
                </div>
                <ul className="info-guide__rows">
                  {category.items.map((itemId) => {
                    const rowId = `${category.id}.${itemId}`
                    const key = `${categoryKey(category.id)}.items.${itemId}`
                    const expanded = open.has(rowId)
                    const detailId = anchor(`info-guide-detail-${category.id}-${itemId}`)
                    const detail = t(`${key}.detail`, { ...vars, defaultValue: '' })
                    return (
                      <li key={rowId} className={`info-guide__row${expanded ? ' is-open' : ''}`}>
                        <button
                          type="button"
                          className="info-guide__row-toggle"
                          aria-expanded={detail ? expanded : undefined}
                          aria-controls={detail ? detailId : undefined}
                          disabled={!detail}
                          onClick={() => toggleRow(rowId)}
                        >
                          <span className="info-guide__row-label">{t(`${key}.label`, { ...vars, defaultValue: itemId })}</span>
                          <span className="info-guide__row-summary">{t(`${key}.summary`, { ...vars, defaultValue: '' })}</span>
                          {detail ? <ChevronDown className="info-guide__row-chevron" aria-hidden="true" /> : null}
                        </button>
                        {detail ? (
                          <div className="info-guide__row-detail" id={detailId} hidden={!expanded}>
                            <p>{detail}</p>
                          </div>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              </section>
            </div>

            {embedded ? null : (
              <section className="info-guide__cta" id={anchor(INFO_GUIDE_ANCHORS.start)}>
                <h2>{t('infoGuide.ctaTitle')}</h2>
                <div className="info-guide__cta-actions">
                  <ButtonLink to="/register" variant="secondary">{t('info.createAccount')}</ButtonLink>
                  <ButtonLink to="/downloads">{t('info.downloadGame')}</ButtonLink>
                </div>
                <Link className="info-guide__wiki" to="/wiki">
                  <BookOpen aria-hidden="true" />
                  {t('info.openWiki')}
                </Link>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
