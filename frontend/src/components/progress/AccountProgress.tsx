import { Check, Gift, LockKeyhole, Trophy, Zap } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { ItemIcon } from '../ItemIcon'
import { apiErrorMessage } from '../../lib/errors'
import { useAsyncAction } from '../../hooks/useAsyncAction'
import { useAuth } from '../../contexts/AuthContext'
import { authApi } from '../../services/api'
import type { ApiGamerProfile } from '../../services/types'

export function AccountProgress({ profile }: { profile?: ApiGamerProfile }) {
  const { t } = useTranslation('panel')
  const { refreshUser } = useAuth()
  const queryClient = useQueryClient()
  const claim = useAsyncAction()
  const level = profile?.level ?? 1
  const xp = profile?.xp ?? 0
  const xpNext = profile?.xp_next ?? 100
  const percent = Math.min(100, (xp / Math.max(1, xpNext)) * 100)
  const rewards = profile?.rewards ?? []

  async function claimReward(id: string) {
    const result = await claim.run(async () => {
      const sent = await authApi.claimReward(id)
      toast.success(t('progress.toast.rewardSent', { item: sent.item_name }))
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['progress'] }),
        queryClient.invalidateQueries({ queryKey: ['bag'] }),
        queryClient.invalidateQueries({ queryKey: ['wallet'] }),
        refreshUser(),
      ])
    })
    if (!result.ok && !result.skipped) {
      toast.error(apiErrorMessage(result.error, t('progress.toast.claimError')))
    }
  }

  return (
    <div className="grid cols-2 dashboard-progress">
      <Card className="profile-progress-hero">
        <div className="profile-progress-title">
          <span className="profile-progress-icon"><Trophy aria-hidden="true" /></span>
          <div>
            <span className="panel-eyebrow">{t('progress.eyebrow')}</span>
            <h2>{t('progress.title')}</h2>
            <p className="muted">{t('progress.description')}</p>
          </div>
        </div>
        <div className="profile-level-badge">
          <span>{t('progress.level')}</span>
          <strong>{level}</strong>
        </div>
        <div className="profile-xp-progress">
          <div className="progress-labels">
            <span><Zap aria-hidden="true" /> {t('progress.xp', { xp })}</span>
            <span>{t('progress.xpNext', { xp: xpNext })}</span>
          </div>
          <div className="progress-bar"><i style={{ width: `${percent}%` }} /></div>
        </div>
      </Card>

      <Card className="progress-module" id="dashboard-rewards">
        <div className="progress-module-heading">
          <span><Gift aria-hidden="true" /></span>
          <div>
            <span className="panel-eyebrow">{t('progress.rewards.eyebrow')}</span>
            <h2>{t('progress.rewards.title')}</h2>
          </div>
        </div>
        <div className="profile-reward-list">
          {rewards.map((row) => (
            <article className={`profile-reward ${row.claimed ? 'claimed' : row.available ? 'available' : 'locked'}`} key={row.id}>
              <ItemIcon itemId={row.item_id} name={row.item_name} size={28} />
              <span>
                <strong>{t('progress.rewardQuantity', { name: row.item_name, quantity: row.quantity })}</strong>
                <small>{row.description}</small>
              </span>
              {row.claimed ? (
                <b><Check aria-hidden="true" /> {t('progress.rewards.claimed')}</b>
              ) : row.available ? (
                <Button type="button" disabled={claim.pending} onClick={() => void claimReward(row.id)}>
                  {t('progress.rewards.claim')}
                </Button>
              ) : (
                <b><LockKeyhole aria-hidden="true" /> {t('progress.rewards.locked')}</b>
              )}
            </article>
          ))}
          {!rewards.length ? <div className="progress-empty">{t('progress.rewards.empty')}</div> : null}
        </div>
      </Card>
    </div>
  )
}
