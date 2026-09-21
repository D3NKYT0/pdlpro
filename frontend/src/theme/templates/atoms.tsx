import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { TFunction } from 'i18next'
import { formatDate, formatNumber } from '../../lib/formatters'
import { themeAsset } from '../assets'
import { CharacterAvatar } from '../../components/character/CharacterAvatar'
import { rankingPortrait } from '../../components/rankings/rankingsFormat'
import { ButtonLink } from '../../components/ui/Button'
import { ErrorNotice, LoadingState } from '../../components/ui/Feedback'
import type { ApiNews, ApiRankingEntry, ThemeFeatureItem, ThemeRankingTab, ThemeStatItem } from '../../services/api'
import type { CountdownValue } from './useTemplateHome'
import type { UseQueryResult } from '@tanstack/react-query'

type StatusRow = { players_online: number; game_online: boolean }
type InfoRow = { chronicle?: string; rates?: Record<string, string> }

export function statLabel(
  item: ThemeStatItem,
  status: StatusRow | undefined,
  info: InfoRow | undefined,
  t: TFunction,
) {
  if (item.kind === 'online') return formatNumber(status?.players_online ?? 0)
  if (item.kind === 'chronicle') return item.value || info?.chronicle || '—'
  if (item.kind === 'rates') return item.value || info?.rates?.xp || '—'
  if (item.kind === 'status') return status?.game_online ? t('club.live') : t('club.offline')
  return item.value || '—'
}

export function CountdownGrid({
  label,
  value,
  t,
}: {
  label: string
  value: CountdownValue
  t: TFunction
}) {
  return (
    <div className="tpl-countdown" aria-label={label}>
      <p className="tpl-countdown__label">{label}</p>
      <div className="tpl-countdown__grid">
        {([
          ['days', 'portal.unitDays'],
          ['hours', 'portal.unitHours'],
          ['mins', 'portal.unitMins'],
          ['secs', 'portal.unitSecs'],
        ] as const).map(([key, unit]) => (
          <div className="tpl-countdown__item" key={key}>
            <strong>{value[key]}</strong>
            <span>{t(unit)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function StatsRow({
  items,
  status,
  info,
  t,
  loading,
  error,
}: {
  items: ThemeStatItem[]
  status?: StatusRow
  info?: InfoRow
  t: TFunction
  loading?: boolean
  error?: unknown
}) {
  if (loading) return <LoadingState>{t('club.statsLoading')}</LoadingState>
  if (error) return <ErrorNotice error={error} fallback={t('club.statsError')} />
  return (
    <div className="tpl-stats" aria-label={t('club.statsAria')}>
      {items.map((item) => (
        <article className="tpl-stat" key={item.id}>
          <strong>{statLabel(item, status, info, t)}</strong>
          <span>{item.label}</span>
        </article>
      ))}
    </div>
  )
}

export function FeatureCards({
  items,
  variant = 'cards',
}: {
  items: ThemeFeatureItem[]
  variant?: 'cards' | 'stalls' | 'regions' | 'paths' | 'chapters'
}) {
  return (
    <div className={`tpl-features tpl-features--${variant}`}>
      {items.map((item, index) => (
        <article className="tpl-feature" key={item.title}>
          <div
            className="tpl-feature__art"
            style={{ backgroundImage: `url(${JSON.stringify(themeAsset(item.asset))})` }}
          />
          {variant === 'chapters' ? (
            <span className="tpl-feature__index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
          ) : null}
          <h3>{item.title}</h3>
          <p>{item.description}</p>
        </article>
      ))}
    </div>
  )
}

export function RankingBoard({
  title,
  tabs,
  selectedId,
  onSelect,
  query,
  t,
  variant = 'table',
}: {
  title: string
  tabs: ThemeRankingTab[]
  selectedId?: string
  onSelect: (id: string) => void
  query: UseQueryResult<ApiRankingEntry[]>
  t: TFunction
  variant?: 'table' | 'podium' | 'bracket'
}) {
  const rows = query.data ?? []
  const podium = rows.slice(0, 3)
  return (
    <div className={`tpl-ranking tpl-ranking--${variant}`}>
      <div className="tpl-ranking__tabs" role="tablist" aria-label={title}>
        {tabs.map((tab) => (
          <button
            className={`tpl-ranking__tab${tab.id === selectedId ? ' is-active' : ''}`}
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === selectedId}
            onClick={() => onSelect(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {variant === 'podium' && podium.length ? (
        <ol className="tpl-podium">
          {podium.map((row) => (
            <li key={`${row.position}-${row.name}`}>
              <span>{String(row.position).padStart(2, '0')}</span>
              <strong>{row.name}</strong>
              <em>{formatNumber(row.value)}</em>
            </li>
          ))}
        </ol>
      ) : null}
      {query.isLoading ? <LoadingState>{t('portal.ratingLoading')}</LoadingState> : query.isError ? (
        <ErrorNotice error={query.error} fallback={t('portal.ratingError')} />
      ) : (
        <table className="tpl-ranking__table">
          <thead>
            <tr>
              <th>{t('portal.colPosition')}</th>
              <th>{t('portal.colCharacterClan')}</th>
              <th>{t('portal.colScore')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const portrait = rankingPortrait(row)
              return (
                <tr key={`${row.position}-${row.name}`}>
                  <td>{String(row.position).padStart(2, '0')}</td>
                  <td>
                    {portrait ? (
                      <span className="tpl-ranking__name">
                        <CharacterAvatar name={row.name} classId={portrait.classId} sex={portrait.sex} size="sm" />
                        {row.name}
                      </span>
                    ) : row.name}
                  </td>
                  <td>{formatNumber(row.value)}</td>
                </tr>
              )
            })}
            {!rows.length ? <tr><td colSpan={3}>{t('portal.ratingEmpty')}</td></tr> : null}
          </tbody>
        </table>
      )}
    </div>
  )
}

export function NewsFeed({
  title,
  items,
  query,
  t,
  variant = 'list',
}: {
  title: string
  items?: ApiNews[]
  query: UseQueryResult<ApiNews[]>
  t: TFunction
  variant?: 'list' | 'featured' | 'ticker'
}) {
  const rows = items ?? query.data ?? []
  if (query.isLoading) return <LoadingState>{t('club.newsLoading')}</LoadingState>
  if (query.isError) return <ErrorNotice error={query.error} fallback={t('club.newsError')} />
  if (!rows.length) return <p className="tpl-empty">{t('club.newsEmpty')}</p>
  const [lead, ...rest] = rows
  return (
    <div className={`tpl-news tpl-news--${variant}`}>
      <header className="tpl-news__head">
        <h2>{title}</h2>
        <ButtonLink variant="secondary" size="sm" to="/news">{t('club.viewAllNews')}</ButtonLink>
      </header>
      {variant === 'featured' && lead ? (
        <Link className="tpl-news__lead" to={`/news/${lead.slug}`}>
          <strong>{lead.title}</strong>
          <span>{formatDate(lead.published_at)}</span>
          <p>{lead.excerpt || lead.title}</p>
        </Link>
      ) : null}
      <ul className="tpl-news__list">
        {(variant === 'featured' ? rest : rows).slice(0, variant === 'ticker' ? 6 : 4).map((item) => (
          <li key={item.id}>
            <Link to={`/news/${item.slug}`}>
              <strong>{item.title}</strong>
              <span>{formatDate(item.published_at)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function CtaPanel({
  title,
  description,
  actionLabel,
  actionTo,
}: {
  title: string
  description: string
  actionLabel: string
  actionTo: string
}) {
  return (
    <section className="tpl-cta" style={{ backgroundImage: `url(${themeAsset('images/cta-banner.jpg')})` }}>
      <div className="tpl-cta__content">
        <h2>{title}</h2>
        <p>{description}</p>
        <ButtonLink to={actionTo}>{actionLabel}</ButtonLink>
      </div>
    </section>
  )
}

export function SectionHead({ kicker, title, action }: { kicker?: string; title: string; action?: ReactNode }) {
  return (
    <header className="tpl-head">
      <div>
        {kicker ? <p className="tpl-kicker">{kicker}</p> : null}
        <h2>{title}</h2>
      </div>
      {action}
    </header>
  )
}
