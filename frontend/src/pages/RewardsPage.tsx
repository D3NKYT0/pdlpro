import { Navigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BattlePassSection } from '../components/rewards/BattlePassSection'
import { DailySection } from '../components/rewards/DailySection'
import { StatsSection } from '../components/rewards/StatsSection'
import { ResourceGate } from '../components/programs/ResourceGate'
import { ProgramHeader } from '../components/programs/ProgramHeader'

const REWARD_TABS = ['battle', 'daily', 'statistics'] as const

export function RewardsPage() {
  const { t } = useTranslation('panel')
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'battle'
  if (tab === 'fishing') return <Navigate to="/panel/games?tab=fishing" replace />
  return (
    <div className="program-page">
      <ProgramHeader
        eyebrow={t('rewards.eyebrow')}
        title={t('rewards.title')}
        description={t('rewards.description')}
      />
      <div className="program-tabs">
        {REWARD_TABS.map((id) => (
          <button
            key={id}
            className={tab === id ? 'active' : ''}
            onClick={() => setParams({ tab: id })}
          >
            {t(`rewards.tabs.${id}`)}
          </button>
        ))}
      </div>
      {tab === 'battle' ? (
        <ResourceGate code="battle-pass">
          <BattlePassSection />
        </ResourceGate>
      ) : tab === 'daily' ? (
        <ResourceGate code="daily-bonus">
          <DailySection />
        </ResourceGate>
      ) : (
        <StatsSection />
      )}
    </div>
  )
}
