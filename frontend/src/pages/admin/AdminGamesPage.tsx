import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { isApiError, staffApi } from '../../services/api'
import { AdminHeader } from './AdminChrome'

export function AdminGamesPage() {
  const queryClient = useQueryClient()
  const games = useQuery({ queryKey: ['staff-games'], queryFn: staffApi.games })

  async function toggle(id: string, active: boolean) {
    try {
      await staffApi.saveGame({ id, active })
      toast.success(active ? 'Jogo ativado' : 'Jogo desativado')
      await queryClient.invalidateQueries({ queryKey: ['staff-games'] })
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível atualizar')
    }
  }

  return (
    <div className="account-page">
      <AdminHeader kicker="Jogos" title="Módulos de jogos" description="Ligue ou desligue os minigames do painel." />
      <section className="card">
        {(games.data ?? []).length ? (
          (games.data ?? []).map((game) => (
            <div className="admin-service-row" key={game.id}>
              <strong>{game.name}</strong>
              <span className="muted">{game.code}</span>
              <label className="admin-check">
                <input type="checkbox" checked={game.active} onChange={(event) => void toggle(game.id, event.target.checked)} />
                Ativo
              </label>
            </div>
          ))
        ) : (
          <div className="account-empty-state">
            <strong>Nenhum jogo cadastrado</strong>
            <span>Crie as configurações no Django Admin; depois elas aparecem aqui para ligar e desligar.</span>
          </div>
        )}
      </section>
    </div>
  )
}
