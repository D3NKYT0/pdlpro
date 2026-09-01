import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { disableBrowserPush, enableBrowserPush, isApiError, notificationApi, pushApi } from '../services/api'

export function NotificationsPage() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['notifications'], queryFn: notificationApi.list })
  const vapid = useQuery({ queryKey: ['push-vapid'], queryFn: pushApi.vapid })

  async function markOne(id: string) {
    try {
      await notificationApi.markRead(id)
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível marcar como lida')
    }
  }

  async function markAll() {
    try {
      await notificationApi.markAllRead()
      toast.success('Todas marcadas como lidas')
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível atualizar')
    }
  }

  return (
    <section className="card">
      <h1>Avisos</h1>
      <p className="muted">{query.data?.unread ?? 0} não lidos</p>
      {vapid.data?.enabled ? (
        <p>
          <button
            className="btn ghost"
            type="button"
            onClick={() =>
              void enableBrowserPush()
                .then(() => toast.success('Push ativado neste navegador'))
                .catch((error) => toast.error(isApiError(error) ? error.message : String(error)))
            }
          >
            Ativar push
          </button>{' '}
          <button
            className="btn ghost"
            type="button"
            onClick={() =>
              void disableBrowserPush()
                .then(() => toast.success('Push desativado'))
                .catch((error) => toast.error(isApiError(error) ? error.message : String(error)))
            }
          >
            Desativar
          </button>
        </p>
      ) : null}
      {query.data?.unread ? (
        <p>
          <button className="btn ghost" type="button" onClick={() => void markAll()}>
            Marcar todas
          </button>
        </p>
      ) : null}
      {(query.data?.results ?? []).map((item) => (
        <article className="card" key={item.id}>
          <h3>{item.title}</h3>
          <p>{item.body}</p>
          <p className="muted">
            {item.kind} — {item.is_read ? 'lida' : 'nova'}
          </p>
          {!item.is_read ? (
            <button className="btn" type="button" onClick={() => void markOne(item.id)}>
              Marcar como lida
            </button>
          ) : null}
        </article>
      ))}
      {!query.data?.results.length && <p className="muted">Nenhum aviso ainda.</p>}
    </section>
  )
}
