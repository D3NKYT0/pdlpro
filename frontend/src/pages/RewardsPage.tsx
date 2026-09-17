import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight, BarChart3, Crown, Gift, Swords, Trophy, type LucideIcon } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Tabs } from '../components/ui/Tabs'
import { BattlePassSection } from '../components/rewards/BattlePassSection'
import { DailySection } from '../components/rewards/DailySection'
import { HuntSection } from '../components/rewards/HuntSection'
import { StatsSection } from '../components/rewards/StatsSection'
import { ResourceGate } from '../components/programs/ResourceGate'

type RewardTab = 'battle' | 'daily' | 'hunt' | 'statistics'

const REWARD_TABS: Array<{ id: RewardTab; icon: LucideIcon }> = [
  { id: 'battle', icon: Crown },
  { id: 'daily', icon: Gift },
  { id: 'hunt', icon: Swords },
  { id: 'statistics', icon: BarChart3 },
]

export function RewardsPage() {
  const { t } = useTranslation('panel')
  const [params, setParams] = useSearchParams()
  const requested = params.get('tab')
  const tab = REWARD_TABS.find((entry) => entry.id === requested)?.id ?? 'battle'
  if (requested === 'fishing') return <Navigate to="/panel/games?tab=fishing" replace />
  return (
    <div className="rewards-page">
      <PageHeader
        className="rewards-hero"
        eyebrow={t('rewards.eyebrow')}
        title={t('rewards.title')}
        description={t('rewards.description')}
        leading={<span className="rewards-hero-emblem"><Trophy aria-hidden="true" /></span>}
        actions={(
          <Link className="rewards-hero-jump" to="/panel/games">
            {t('rewards.gamesLink')}
            <ArrowUpRight aria-hidden="true" />
          </Link>
        )}
      />

      <Tabs
        id="rewards"
        label={t('rewards.tabsLabel')}
        className="game-tabs rewards-tabs"
        value={tab}
        onChange={(id) => setParams({ tab: id })}
        items={REWARD_TABS.map(({ id, icon: Icon }) => ({
          id,
          label: t(`rewards.tabs.${id}`),
          icon: <Icon aria-hidden="true" />,
        }))}
      />

      <div
        className="rewards-tab-content"
        id={`rewards-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`rewards-tab-${tab}`}
      >
        {tab === 'battle' ? (
          <ResourceGate code="battle-pass">
            <BattlePassSection />
          </ResourceGate>
        ) : tab === 'daily' ? (
          <ResourceGate code="daily-bonus">
            <DailySection />
          </ResourceGate>
        ) : tab === 'hunt' ? (
          <ResourceGate code="hunt">
            <HuntSection />
          </ResourceGate>
        ) : (
          <StatsSection />
        )}
      </div>
    </div>
  )
}
