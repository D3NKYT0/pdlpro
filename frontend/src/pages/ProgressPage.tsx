import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Award,
  Check,
  Crown,
  Gift,
  KeyRound,
  LockKeyhole,
  Medal,
  ShieldCheck,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi, gamesApi, isApiError } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { ItemIcon } from '../components/ItemIcon'

export function ProgressPage() {
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
      toast.success(`${result.item_name} enviado à bag`)
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível resgatar')
    }
  }

  async function claimPass(id: string) {
    try {
      const result = await gamesApi.claimBattlePass(id)
      toast.success(`${result.item_name} enviado à bag`)
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível resgatar o passe')
    }
  }

  async function buyPremium() {
    try {
      await gamesApi.buyBattlePassPremium()
      toast.success('Passe premium ativado')
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Falha ao comprar o passe')
    }
  }

  async function setupTwoFactor() {
    try {
      const result = await authApi.setupTwoFactor()
      setSetupSecret(result.secret)
      toast.success('Salve o segredo e confirme com o código')
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Falha ao iniciar 2FA')
    }
  }

  async function confirmTwoFactor(event: FormEvent) {
    event.preventDefault()
    try {
      if (user?.is_2fa_enabled) {
        await authApi.disableTwoFactor(code)
        toast.success('2FA desativado')
      } else {
        await authApi.confirmTwoFactor(code)
        toast.success('2FA ativado')
      }
      setCode('')
      setSetupSecret('')
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Código inválido')
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
      <section className="card profile-progress-hero">
        <div className="profile-progress-title">
          <span className="profile-progress-icon"><Trophy aria-hidden="true" /></span>
          <div>
            <span className="panel-eyebrow">Jornada do aventureiro</span>
            <h1>Seu progresso</h1>
            <p className="muted">Complete desafios, evolua sua conta e desbloqueie novas recompensas.</p>
          </div>
        </div>
        <div className="profile-level-badge">
          <span>Nível</span>
          <strong>{profileLevel}</strong>
        </div>
        <div className="profile-xp-progress">
          <div className="progress-labels">
            <span><Zap aria-hidden="true" /> {profileXp} XP</span>
            <span>{profileXpNext} XP para o próximo nível</span>
          </div>
          <div className="progress-bar"><i style={{ width: `${profilePercent}%` }} /></div>
        </div>
      </section>

      <div className="progress-layout">
        <div className="progress-side-column">
          <section className="card progress-module">
            <div className="progress-module-heading">
              <span><Medal aria-hidden="true" /></span>
              <div><span className="panel-eyebrow">Marcos da conta</span><h2>Conquistas</h2></div>
              <b>{progress.data?.achievements.length ?? 0}</b>
            </div>
            <div className="achievement-list">
              {(progress.data?.achievements ?? []).map((row) => (
                <article className="achievement-item" key={row.code}>
                  <Award aria-hidden="true" />
                  <span><strong>{row.name}</strong><small>{row.description}</small></span>
                  <Check aria-hidden="true" />
                </article>
              ))}
              {!progress.data?.achievements.length ? (
                <div className="progress-empty"><Medal aria-hidden="true" /> Continue jogando para desbloquear conquistas.</div>
              ) : null}
            </div>
          </section>

          <section className="card progress-module">
            <div className="progress-module-heading">
              <span><Gift aria-hidden="true" /></span>
              <div><span className="panel-eyebrow">Prêmios de evolução</span><h2>Recompensas</h2></div>
            </div>
            <div className="profile-reward-list">
              {(progress.data?.rewards ?? []).map((row) => (
                <article className={`profile-reward ${row.claimed ? 'claimed' : row.available ? 'available' : 'locked'}`} key={row.id}>
                  <ItemIcon itemId={row.item_id} name={row.item_name} size={28} />
                  <span><strong>{row.item_name} × {row.quantity}</strong><small>{row.description}</small></span>
                  {row.claimed ? (
                    <b><Check aria-hidden="true" /> Resgatada</b>
                  ) : row.available ? (
                    <button className="btn" type="button" onClick={() => void claimReward(row.id)}>Resgatar</button>
                  ) : (
                    <b><LockKeyhole aria-hidden="true" /> Bloqueada</b>
                  )}
                </article>
              ))}
              {!progress.data?.rewards.length ? <div className="progress-empty">Nenhuma recompensa disponível.</div> : null}
            </div>
          </section>

          <section className="card progress-module security-module">
            <div className="progress-module-heading">
              <span><ShieldCheck aria-hidden="true" /></span>
              <div><span className="panel-eyebrow">Proteção da conta</span><h2>Segurança</h2></div>
              <b className={user?.is_2fa_enabled ? 'security-on' : 'security-off'}>
                {user?.is_2fa_enabled ? 'Ativo' : 'Inativo'}
              </b>
            </div>
            <p className="muted">Use autenticação em duas etapas para proteger seus personagens e itens.</p>
            {!user?.is_2fa_enabled ? (
              <button className="btn ghost" type="button" onClick={() => void setupTwoFactor()}>
                <KeyRound aria-hidden="true" /> Gerar segredo
              </button>
            ) : null}
            {setupSecret ? <div className="setup-secret"><span>Segredo do autenticador</span><strong>{setupSecret}</strong></div> : null}
            <form className="security-form" onSubmit={confirmTwoFactor}>
              <label className="field">
                Código do autenticador
                <input value={code} onChange={(event) => setCode(event.target.value)} required inputMode="numeric" />
              </label>
              <button className="btn" type="submit">
                {user?.is_2fa_enabled ? 'Desativar 2FA' : 'Confirmar 2FA'}
              </button>
            </form>
          </section>
        </div>

        <section className="card battle-pass-card">
          {pass?.season ? (
            <>
              <header className="battle-pass-header">
                <div className="battle-pass-title">
                  <span className="battle-pass-emblem"><Crown aria-hidden="true" /></span>
                  <div>
                    <span className="panel-eyebrow">Temporada ativa</span>
                    <h2>Passe de batalha</h2>
                    <p>{pass.season.name}</p>
                  </div>
                </div>
                {pass.has_premium ? (
                  <span className="premium-active"><Sparkles aria-hidden="true" /> Premium ativo</span>
                ) : (
                  <button className="btn" type="button" onClick={() => void buyPremium()}>
                    <Crown aria-hidden="true" /> Premium · R$ {pass.season.premium_price}
                  </button>
                )}
              </header>

              <div className="battle-pass-overview">
                <div><span>Nível atual</span><strong>{pass.current_level}</strong></div>
                <div><span>XP da temporada</span><strong>{pass.xp}</strong></div>
                <div><span>Prêmios resgatados</span><strong>{claimedPassRewards}/{passRewardCount}</strong></div>
              </div>

              <div className="battle-pass-progress">
                <div className="progress-labels"><span>Progresso da temporada</span><span>{Math.round(passPercent)}%</span></div>
                <div className="progress-bar"><i style={{ width: `${passPercent}%` }} /></div>
              </div>

              <div className="pass-track-legend">
                <span>Nível</span><span><Gift aria-hidden="true" /> Trilha livre</span><span><Crown aria-hidden="true" /> Trilha premium</span>
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
                        <small>{level.required_xp} XP</small>
                      </div>
                      <div className="pass-tier-lane free-lane">
                        {freeRewards.map((reward) => (
                          <div className={`pass-reward ${reward.claimed ? 'claimed' : !level.unlocked ? 'locked' : 'available'}`} key={reward.id}>
                            <ItemIcon itemId={reward.item_id} name={reward.item_name} size={24} />
                            <span><strong>{reward.item_name} × {reward.quantity}</strong><small>{reward.description}</small></span>
                            {reward.claimed ? <b><Check aria-hidden="true" /> Resgatado</b> : !level.unlocked ? <b><LockKeyhole aria-hidden="true" /></b> : (
                              <button className="btn" type="button" onClick={() => void claimPass(reward.id)}>Resgatar</button>
                            )}
                          </div>
                        ))}
                        {!freeRewards.length ? <span className="no-pass-reward">Sem prêmio livre</span> : null}
                      </div>
                      <div className="pass-tier-lane premium-lane">
                        {premiumRewards.map((reward) => {
                          const locked = reward.locked_premium || !level.unlocked
                          return (
                            <div className={`pass-reward ${reward.claimed ? 'claimed' : locked ? 'locked' : 'available'}`} key={reward.id}>
                              <ItemIcon itemId={reward.item_id} name={reward.item_name} size={24} />
                              <span><strong>{reward.item_name} × {reward.quantity}</strong><small>{reward.description}</small></span>
                              {reward.claimed ? <b><Check aria-hidden="true" /> Resgatado</b> : locked ? <b><LockKeyhole aria-hidden="true" /></b> : (
                                <button className="btn" type="button" onClick={() => void claimPass(reward.id)}>Resgatar</button>
                              )}
                            </div>
                          )
                        })}
                        {!premiumRewards.length ? <span className="no-pass-reward">Sem prêmio premium</span> : null}
                      </div>
                    </article>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="progress-empty large"><Crown aria-hidden="true" /> Nenhuma temporada ativa.</div>
          )}
        </section>
      </div>
    </div>
  )
}
