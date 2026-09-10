import { Card } from '../../components/ui/Card'
import { apiErrorMessage } from '../../lib/errors'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Boxes, CircleDollarSign, CircleDot, Dices, Fish, Gamepad2, Gift } from 'lucide-react'
import toast from 'react-hot-toast'
import { staffApi } from '../../services/api'
import { AdminHeader } from './AdminChrome'
import { Toggle } from '../../components/ui/Toggle'

const GAME_ICONS = {
  daily_bonus: Gift,
  dice: Dices,
  economy: CircleDollarSign,
  fishing: Fish,
  roulette: CircleDot,
  slots: Boxes,
}

export function AdminGamesPage() {
  const { t } = useTranslation('admin')
  const queryClient = useQueryClient()
  const games = useQuery({ queryKey: ['staff-games'], queryFn: staffApi.games })
  const [updating, setUpdating] = useState<string | null>(null)

  async function toggle(id: string, active: boolean) {
    setUpdating(id)
    try {
      await staffApi.saveGame({ id, active })
      toast.success(active ? t('games.toast.enabled') : t('games.toast.disabled'))
      await queryClient.invalidateQueries({ queryKey: ['staff-games'] })
    } catch (error) {
      toast.error(apiErrorMessage(error, t('games.toast.error')))
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="account-page">
      <AdminHeader kicker={t('games.kicker')} title={t('games.title')} description={t('games.description')} />
      <Card className="admin-games-panel">
        <header className="admin-services-heading">
          <span><Gamepad2 /></span>
          <div><span className="panel-eyebrow">{t('games.eyebrow')}</span><h2>{t('games.panelTitle')}</h2><p>{t('games.panelText')}</p></div>
          <div className="admin-services-summary"><strong>{(games.data ?? []).filter((game) => game.active).length}</strong><small>{t('games.activeCount', { total: (games.data ?? []).length })}</small></div>
        </header>
        {(games.data ?? []).length ? (
          <div className="admin-game-grid">
            {(games.data ?? []).map((game) => {
              const Icon = GAME_ICONS[game.code as keyof typeof GAME_ICONS] ?? Gamepad2
              const description = t(`games.descriptions.${game.code}`, { defaultValue: t('games.descriptions.fallback') })
              return (
                <article className={`admin-game-card${game.active ? ' is-active' : ' is-inactive'}`} key={game.id}>
                  <span className="admin-game-icon"><Icon /></span>
                  <div><h3>{game.name}</h3><code>{game.code}</code><p>{description}</p></div>
                  <Toggle className="admin-game-switch" busy={updating === game.id} label={updating === game.id ? t('games.updating') : game.active ? t('games.active') : t('games.inactive')} checked={game.active} onChange={(event) => void toggle(game.id, event.target.checked)} />
                </article>
              )
            })}
          </div>
        ) : (
          <div className="account-empty-state">
            <strong>{t('games.emptyTitle')}</strong>
            <span>{t('games.emptyText')}</span>
          </div>
        )}
      </Card>
    </div>
  )
}
