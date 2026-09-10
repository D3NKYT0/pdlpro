import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Tab } from './rankingsMeta'
import { useRankingTabs } from './useRankingTabs'

export function RankingsNav({ activeTab }: { activeTab: Tab }) {
  const { t } = useTranslation('public')
  const items = useRankingTabs()

  return (
    <nav className="rankings-nav container" aria-label={t('rankings.navAria')}>
      {items.map((item) => {
        const TabIcon = item.icon
        const active = activeTab.id === item.id
        return (
          <Link
            key={item.id}
            to={`/rankings?tab=${item.id}`}
            className={active ? 'is-active' : undefined}
            aria-current={active ? 'page' : undefined}
          >
            <TabIcon aria-hidden="true" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
