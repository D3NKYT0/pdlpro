import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { authApi, gamesApi, isApiError } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

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

  return (
    <div className="grid cols-2">
      <section className="card">
        <h1>Progresso</h1>
        <p className="stat">
          Nível {progress.data?.level ?? 1} · {progress.data?.xp ?? 0}/{progress.data?.xp_next ?? 100} XP
        </p>
        <h3>Conquistas</h3>
        {(progress.data?.achievements ?? []).map((row) => (
          <p key={row.code}>
            {row.name} — {row.description}
          </p>
        ))}
        {!progress.data?.achievements.length && <p className="muted">Nenhuma conquista ainda.</p>}
        <h3>Recompensas</h3>
        {(progress.data?.rewards ?? []).map((row) => (
          <p key={row.id}>
            {row.description} ({row.item_name} × {row.quantity}){' '}
            {row.claimed ? (
              <span className="muted">resgatada</span>
            ) : row.available ? (
              <button className="btn" type="button" onClick={() => void claimReward(row.id)}>
                Resgatar
              </button>
            ) : (
              <span className="muted">bloqueada</span>
            )}
          </p>
        ))}
        <h2>Segurança</h2>
        <p>2FA: {user?.is_2fa_enabled ? 'ativo' : 'desativado'}</p>
        {!user?.is_2fa_enabled ? (
          <p>
            <button className="btn" type="button" onClick={() => void setupTwoFactor()}>
              Gerar segredo
            </button>
          </p>
        ) : null}
        {setupSecret ? <p className="muted">Segredo: {setupSecret}</p> : null}
        <form onSubmit={confirmTwoFactor}>
          <label className="field">
            Código do autenticador
            <input value={code} onChange={(event) => setCode(event.target.value)} required inputMode="numeric" />
          </label>
          <button className="btn" type="submit">
            {user?.is_2fa_enabled ? 'Desativar 2FA' : 'Confirmar 2FA'}
          </button>
        </form>
      </section>
      <section className="card">
        <h2>Passe de batalha</h2>
        {battlePass.data?.season ? (
          <>
            <p>
              {battlePass.data.season.name} · XP {battlePass.data.xp} · nível {battlePass.data.current_level}
            </p>
            <p className="muted">
              {battlePass.data.has_premium
                ? 'Premium ativo'
                : `Premium R$ ${battlePass.data.season.premium_price}`}
            </p>
            {!battlePass.data.has_premium ? (
              <button className="btn" type="button" onClick={() => void buyPremium()}>
                Comprar premium
              </button>
            ) : null}
            {battlePass.data.levels.map((row) => (
              <div key={row.level}>
                <h3>
                  Nível {row.level} ({row.required_xp} XP) {row.unlocked ? '' : '· bloqueado'}
                </h3>
                {row.rewards.map((reward) => (
                  <p key={reward.id}>
                    {reward.is_premium ? 'Premium' : 'Livre'}: {reward.item_name} × {reward.quantity}{' '}
                    {reward.claimed ? (
                      <span className="muted">resgatado</span>
                    ) : reward.locked_premium || !row.unlocked ? (
                      <span className="muted">bloqueado</span>
                    ) : (
                      <button className="btn" type="button" onClick={() => void claimPass(reward.id)}>
                        Resgatar
                      </button>
                    )}
                  </p>
                ))}
              </div>
            ))}
          </>
        ) : (
          <p className="muted">Nenhuma temporada ativa.</p>
        )}
      </section>
    </div>
  )
}
