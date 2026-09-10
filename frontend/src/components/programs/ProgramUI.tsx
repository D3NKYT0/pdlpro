import { useTranslation } from 'react-i18next'
import { CheckCircle2, CircleDashed, Gift } from 'lucide-react'
import type { Reward, RewardHistory } from '../../services/api'
import { formatDateTime } from '../../lib/formatters'
import { ItemIcon } from '../ItemIcon'
import './programs.css'

/** @deprecated Prefer Status with i18n; kept for callers that only need the PT map. */
export const labels: Record<string, string> = {
  pending: 'Em análise',
  approved: 'Aprovado',
  rejected: 'Recusado',
  paid: 'Creditado',
  available: 'Disponível',
  completed: 'Concluído',
  planned: 'Planejado',
  progress: 'Em andamento',
  daily: 'Diária',
  weekly: 'Semanal',
  season: 'Temporada',
}

export function Status({ value, label }: { value: string; label?: string }) {
  const { t } = useTranslation('panel')
  return (
    <span className={`program-status status-${value}`}>
      <CircleDashed size={13} />
      {label ?? t(`programs.status.${value}`, { defaultValue: labels[value] ?? value })}
    </span>
  )
}

// Compatibilidade dos imports existentes; implementação visual única em ui/.
export { EmptyState as Empty, ErrorNotice, LoadingState as Loading } from '../ui/Feedback'
import { EmptyState as Empty } from '../ui/Feedback'

export function RewardList({ rewards }: { rewards: Reward[] }) {
  const { t } = useTranslation('panel')
  return (
    <div className="program-rewards">
      {rewards.map((reward, i) => (
        <span key={i} className="program-reward">
          {reward.kind === 'item' ? (
            <ItemIcon itemId={reward.item_id || 0} size={28} />
          ) : (
            <Gift size={20} />
          )}
          <span>
            <strong>
              {reward.name ||
                t(`programs.rewardKinds.${reward.kind}`, {
                  defaultValue: t('programs.rewardKinds.item'),
                })}
            </strong>
            <small>
              × {reward.quantity}
              {reward.enchant ? ` · +${reward.enchant}` : ''}
            </small>
          </span>
        </span>
      ))}
    </div>
  )
}

export function RewardHistoryList({ history }: { history: RewardHistory[] }) {
  const { t } = useTranslation('panel')
  return history.length ? (
    <div className="program-timeline">
      {history.map((row) => (
        <article key={row.id}>
          <CheckCircle2 size={18} />
          <div>
            <strong>{row.label}</strong>
            <small>{formatDateTime(row.created_at)}</small>
            <RewardList rewards={row.rewards} />
          </div>
        </article>
      ))}
    </div>
  ) : (
    <Empty>{t('programs.historyEmpty')}</Empty>
  )
}

export function Meter({ value, max }: { value: number; max: number }) {
  return (
    <div
      className="program-meter"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={Math.max(max, value)}
    >
      <span
        style={{
          width: `${Math.min(100, Math.max(0, (value / Math.max(1, max)) * 100))}%`,
        }}
      />
    </div>
  )
}
