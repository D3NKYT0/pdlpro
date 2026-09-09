import { Card } from '../components/ui/Card'
import { apiErrorMessage } from '../lib/errors'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Check,
  Crown,
  Gift,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { AchievementGrid } from '../components/AchievementGrid'
import { authApi, gamesApi } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { ItemIcon } from '../components/ItemIcon'

export function ProgressPage() {
  const { t } = useTranslation('panel')
  const { user, refreshUser } = useAuth()
  const queryClient = useQueryClient()
  const progress = useQuery({ queryKey: ['progress'], queryFn: authApi.progress })
  const battlePass = useQuery({ queryKey: ['battle-pass'], queryFn: gamesApi.battlePass })
  const [setupSecret, setSetupSecret] = useState('')
  const [code, setCode] = useState('')

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['progress'] })
    await queryClient.invalidateQueries({ queryKey: ['battle-pass'] })
    await queryClient.invalidateQueries({ queryKey: ['bag'] })
    await queryClient.invalidateQueries({ queryKey: ['wallet'] })
    await refreshUser()
  }

  async function claimReward(id: string) {
    try {
      const result = await authApi.claimReward(id)
      toast.success(t('progress.toast.rewardSent', { item: result.item_name }))
      await refresh()
    } catch (error) {
      toast.error(apiErrorMessage(error, t('progress.toast.claimError')))
    }
  }

  async function claimPass(id: string) {
    try {
      const result = await gamesApi.claimBattlePass(id)
      toast.success(t('progress.toast.rewardSent', { item: result.item_name }))
      await refresh()
    } catch (error) {
      toast.error(apiErrorMessage(error, t('progress.toast.passClaimError')))
    }
  }

  async function buyPremium() {
    try {
      await gamesApi.buyBattlePassPremium()
      toast.success(t('progress.toast.premiumActivated'))
      await refresh()
    } catch (error) {
      toast.error(apiErrorMessage(error, t('progress.toast.premiumError')))
    }
  }

  async function setupTwoFactor() {
    try {
      const result = await authApi.setupTwoFactor()
      setSetupSecret(result.secret)
      toast.success(t('progress.toast.secretGenerated'))
    } catch (error) {
      toast.error(apiErrorMessage(error, t('progress.toast.setupError')))
    }
  }

  async function confirmTwoFactor(event: FormEvent) {
    event.preventDefault()
    try {
      if (user?.is_2fa_enabled) {
        await authApi.disableTwoFactor(code)
        toast.success(t('progress.toast.twoFactorDisabled'))
      } else {
        await authApi.confirmTwoFactor(code)
        toast.success(t('progress.toast.twoFactorEnabled'))
      }
      setCode('')
      setSetupSecret('')
      await refresh()
    } catch (error) {
      toast.error(apiErrorMessage(error, t('progress.toast.invalidCode')))
    }
  }

  const profileLevel = progress.data?.level ?? 1
  const profileXp = progress.data?.xp ?? 0
  const profileXpNext = progress.data?.xp_next ?? 100
  const profilePercent = Math.min(100, (profileXp / Math.max(1, profileXpNext)) * 100)
  const pass = battlePass.data
  const passLevels = pass?.levels ?? []
  const lastPassRequirement = passLevels.length ? passLevels[passLevels.length - 1].required_xp : 100
  const passPercent = Math.min(100, ((pass?.xp ?? 0) / Math.max(1, lastPassRequirement)) * 100)
  const passRewardCount = passLevels.reduce((total, level) => total + level.rewards.length, 0)
  const claimedPassRewards = passLevels.reduce(
    (total, level) => total + level.rewards.filter((reward) => reward.claimed).length,
    0,
  )

  return (
    <div className="progress-page">
      <Card className="profile-progress-hero">
        <div className="profile-progress-title">
          <span className="profile-progress-icon"><Trophy aria-hidden="true" /></span>
          <div>
            <span className="panel-eyebrow">{t('progress.eyebrow')}</span>
            <h1>{t('progress.title')}</h1>
            <p className="muted">{t('progress.description')}</p>
          </div>
        </div>
        <div className="profile-level-badge">
          <span>{t('progress.level')}</span>
          <strong>{profileLevel}</strong>
        </div>
        <div className="profile-xp-progress">
          <div className="progress-labels">
            <span><Zap aria-hidden="true" /> {t('progress.xp', { xp: profileXp })}</span>
            <span>{t('progress.xpNext', { xp: profileXpNext })}</span>
          </div>
          <div className="progress-bar"><i style={{ width: `${profilePercent}%` }} /></div>
        </div>
      </Card>

      <AchievementGrid achievements={progress.data?.achievements ?? []} showRewardsLink={false} />

      <div className="progress-layout">
        <div className="progress-side-column">

          <Card className="progress-module">
            <div className="progress-module-heading">
              <span><Gift aria-hidden="true" /></span>
              <div><span className="panel-eyebrow">{t('progress.rewards.eyebrow')}</span><h2>{t('progress.rewards.title')}</h2></div>
            </div>
            <div className="profile-reward-list">
              {(progress.data?.rewards ?? []).map((row) => (
                <article className={`profile-reward ${row.claimed ? 'claimed' : row.available ? 'available' : 'locked'}`} key={row.id}>
                  <ItemIcon itemId={row.item_id} name={row.item_name} size={28} />
                  <span><strong>{t('progress.rewardQuantity', { name: row.item_name, quantity: row.quantity })}</strong><small>{row.description}</small></span>
                  {row.claimed ? (
                    <b><Check aria-hidden="true" /> {t('progress.rewards.claimed')}</b>
                  ) : row.available ? (
                    <Button type="button" onClick={() => void claimReward(row.id)}>{t('progress.rewards.claim')}</Button>
                  ) : (
                    <b><LockKeyhole aria-hidden="true" /> {t('progress.rewards.locked')}</b>
                  )}
                </article>
              ))}
              {!progress.data?.rewards.length ? <div className="progress-empty">{t('progress.rewards.empty')}</div> : null}
            </div>
          </Card>

          <Card className="progress-module security-module">
            <div className="progress-module-heading">
              <span><ShieldCheck aria-hidden="true" /></span>
              <div><span className="panel-eyebrow">{t('progress.security.eyebrow')}</span><h2>{t('progress.security.title')}</h2></div>
              <b className={user?.is_2fa_enabled ? 'security-on' : 'security-off'}>
                {user?.is_2fa_enabled ? t('progress.security.on') : t('progress.security.off')}
              </b>
            </div>
            <p className="muted">{t('progress.security.description')}</p>
            {!user?.is_2fa_enabled ? (
              <Button className="ghost" type="button" onClick={() => void setupTwoFactor()}>
                <KeyRound aria-hidden="true" /> {t('progress.security.generateSecret')}
              </Button>
            ) : null}
            {setupSecret ? <div className="setup-secret"><span>{t('progress.security.secretLabel')}</span><strong>{setupSecret}</strong></div> : null}
            <form className="security-form" onSubmit={confirmTwoFactor}>
              <Field>
                {t('progress.security.codeLabel')}
                <input value={code} onChange={(event) => setCode(event.target.value)} required inputMode="numeric" />
              </Field>
              <Button type="submit">
                {user?.is_2fa_enabled ? t('progress.security.disable') : t('progress.security.confirm')}
              </Button>
            </form>
          </Card>
        </div>

        <Card className="battle-pass-card">
          {pass?.season ? (
            <>
              <header className="battle-pass-header">
                <div className="battle-pass-title">
                  <span className="battle-pass-emblem"><Crown aria-hidden="true" /></span>
                  <div>
                    <span className="panel-eyebrow">{t('progress.pass.eyebrow')}</span>
                    <h2>{t('progress.pass.title')}</h2>
                    <p>{pass.season.name}</p>
                  </div>
                </div>
                {pass.has_premium ? (
                  <span className="premium-active"><Sparkles aria-hidden="true" /> {t('progress.pass.premiumActive')}</span>
                ) : (
                  <Button type="button" onClick={() => void buyPremium()}>
                    <Crown aria-hidden="true" /> {t('progress.pass.premiumBuy', { price: pass.season.premium_price })}
                  </Button>
                )}
              </header>

              <div className="battle-pass-overview">
                <div><span>{t('progress.pass.currentLevel')}</span><strong>{pass.current_level}</strong></div>
                <div><span>{t('progress.pass.seasonXp')}</span><strong>{pass.xp}</strong></div>
                <div><span>{t('progress.pass.claimedRewards')}</span><strong>{claimedPassRewards}/{passRewardCount}</strong></div>
              </div>

              <div className="battle-pass-progress">
                <div className="progress-labels"><span>{t('progress.pass.seasonProgress')}</span><span>{Math.round(passPercent)}%</span></div>
                <div className="progress-bar"><i style={{ width: `${passPercent}%` }} /></div>
              </div>

              <div className="pass-track-legend">
                <span>{t('progress.pass.levelLegend')}</span><span><Gift aria-hidden="true" /> {t('progress.pass.freeTrack')}</span><span><Crown aria-hidden="true" /> {t('progress.pass.premiumTrack')}</span>
              </div>

              <div className="pass-reward-track">
                {passLevels.map((level) => {
                  const freeRewards = level.rewards.filter((reward) => !reward.is_premium)
                  const premiumRewards = level.rewards.filter((reward) => reward.is_premium)
                  return (
                    <article className={`pass-tier ${level.unlocked ? 'unlocked' : 'locked'}`} key={level.level}>
                      <div className="pass-tier-level">
                        <span>{level.unlocked ? <Check aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}</span>
                        <strong>{level.level}</strong>
                        <small>{t('progress.pass.xpRequired', { xp: level.required_xp })}</small>
                      </div>
                      <div className="pass-tier-lane free-lane">
                        {freeRewards.map((reward) => (
                          <div className={`pass-reward ${reward.claimed ? 'claimed' : !level.unlocked ? 'locked' : 'available'}`} key={reward.id}>
                            <ItemIcon itemId={reward.item_id} name={reward.item_name} size={24} />
                            <span><strong>{t('progress.rewardQuantity', { name: reward.item_name, quantity: reward.quantity })}</strong><small>{reward.description}</small></span>
                            {reward.claimed ? <b><Check aria-hidden="true" /> {t('progress.pass.rewardClaimed')}</b> : !level.unlocked ? <b><LockKeyhole aria-hidden="true" /></b> : (
                              <Button type="button" onClick={() => void claimPass(reward.id)}>{t('progress.pass.claim')}</Button>
                            )}
                          </div>
                        ))}
                        {!freeRewards.length ? <span className="no-pass-reward">{t('progress.pass.noFreeReward')}</span> : null}
                      </div>
                      <div className="pass-tier-lane premium-lane">
                        {premiumRewards.map((reward) => {
                          const locked = reward.locked_premium || !level.unlocked
                          return (
                            <div className={`pass-reward ${reward.claimed ? 'claimed' : locked ? 'locked' : 'available'}`} key={reward.id}>
                              <ItemIcon itemId={reward.item_id} name={reward.item_name} size={24} />
                              <span><strong>{t('progress.rewardQuantity', { name: reward.item_name, quantity: reward.quantity })}</strong><small>{reward.description}</small></span>
                              {reward.claimed ? <b><Check aria-hidden="true" /> {t('progress.pass.rewardClaimed')}</b> : locked ? <b><LockKeyhole aria-hidden="true" /></b> : (
                                <Button type="button" onClick={() => void claimPass(reward.id)}>{t('progress.pass.claim')}</Button>
                              )}
                            </div>
                          )
                        })}
                        {!premiumRewards.length ? <span className="no-pass-reward">{t('progress.pass.noPremiumReward')}</span> : null}
                      </div>
                    </article>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="progress-empty large"><Crown aria-hidden="true" /> {t('progress.pass.empty')}</div>
          )}
        </Card>
      </div>
    </div>
  )
}
