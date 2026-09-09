import { Navigate, useSearchParams } from 'react-router-dom'
import { BattlePassSection } from '../components/rewards/BattlePassSection'
import { DailySection } from '../components/rewards/DailySection'
import { StatsSection } from '../components/rewards/StatsSection'
import { ResourceGate } from '../components/programs/ResourceGate'
import { ProgramHeader } from '../components/programs/ProgramHeader'

export function RewardsPage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'battle'
  if (tab === 'fishing') return <Navigate to="/painel/games?tab=fishing" replace />
  return (
    <div className="program-page">
      <ProgramHeader
        eyebrow="Cada conquista importa"
        title="Jornada e recompensas"
        description="Cumpra missões, descubra novos prêmios e acompanhe sua evolução no servidor."
      />
      <div className="program-tabs">
        {[
          ['battle', 'Passe de batalha'],
          ['daily', 'Bônus diário'],
          ['statistics', 'Rankings e estatísticas'],
        ].map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? 'active' : ''}
            onClick={() => setParams({ tab: id })}
          >
            {label}
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
