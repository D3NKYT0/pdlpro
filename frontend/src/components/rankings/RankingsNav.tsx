import { Link } from 'react-router-dom'
import { tabs, type Tab } from './rankingsMeta'

export function RankingsNav({ activeTab }: { activeTab: Tab }) {
  return (
    <nav className="rankings-nav container" aria-label="Rankings">
      {tabs.map((item) => {
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
