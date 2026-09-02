import { Card } from '../../components/ui/Card'
import { apiErrorMessage } from '../../lib/errors'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Boxes, CircleDollarSign, CircleDot, Dices, Fish, Gamepad2, Gift } from 'lucide-react'
import toast from 'react-hot-toast'
import { staffApi } from '../../services/api'
import { AdminHeader } from './AdminChrome'
import { Toggle } from '../../components/ui/Toggle'

const GAME_META = {
  daily_bonus: { Icon: Gift, description: 'Entrega uma recompensa diária aos jogadores.' },
  dice: { Icon: Dices, description: 'Partidas rápidas baseadas em lançamento de dados.' },
  economy: { Icon: CircleDollarSign, description: 'Ferramentas e desafios ligados à economia.' },
  fishing: { Icon: Fish, description: 'Atividade de pesca com itens e recompensas.' },
  roulette: { Icon: CircleDot, description: 'Roleta de prêmios consumindo fichas do painel.' },
  slots: { Icon: Boxes, description: 'Máquina de slots com recompensas configuráveis.' },
}

export function AdminGamesPage() {
  const queryClient = useQueryClient()
  const games = useQuery({ queryKey: ['staff-games'], queryFn: staffApi.games })
  const [updating, setUpdating] = useState<string | null>(null)

  async function toggle(id: string, active: boolean) {
    setUpdating(id)
    try {
      await staffApi.saveGame({ id, active })
      toast.success(active ? 'Jogo ativado' : 'Jogo desativado')
      await queryClient.invalidateQueries({ queryKey: ['staff-games'] })
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Não foi possível atualizar'))
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="account-page">
      <AdminHeader kicker="Jogos" title="Módulos de jogos" description="Ligue ou desligue os minigames do painel." />
      <Card className="admin-games-panel">
        <header className="admin-services-heading">
          <span><Gamepad2 /></span>
          <div><span className="panel-eyebrow">Disponibilidade</span><h2>Experiências do painel</h2><p>Os módulos ativos ficam acessíveis na central de jogos dos jogadores.</p></div>
          <div className="admin-services-summary"><strong>{(games.data ?? []).filter((game) => game.active).length}</strong><small>ativos de {(games.data ?? []).length}</small></div>
        </header>
        {(games.data ?? []).length ? (
          <div className="admin-game-grid">
            {(games.data ?? []).map((game) => {
              const meta = GAME_META[game.code as keyof typeof GAME_META] ?? { Icon: Gamepad2, description: 'Módulo de entretenimento configurável do painel.' }
              const Icon = meta.Icon
              return (
                <article className={`admin-game-card${game.active ? ' is-active' : ' is-inactive'}`} key={game.id}>
                  <span className="admin-game-icon"><Icon /></span>
                  <div><h3>{game.name}</h3><code>{game.code}</code><p>{meta.description}</p></div>
                  <Toggle className="admin-game-switch" busy={updating === game.id} label={updating === game.id ? 'Atualizando' : game.active ? 'Ativo' : 'Inativo'} checked={game.active} onChange={(event) => void toggle(game.id, event.target.checked)} />
                </article>
              )
            })}
          </div>
        ) : (
          <div className="account-empty-state">
            <strong>Nenhum jogo cadastrado</strong>
            <span>Crie as configurações no Django Admin; depois elas aparecem aqui para ligar e desligar.</span>
          </div>
        )}
      </Card>
    </div>
  )
}
