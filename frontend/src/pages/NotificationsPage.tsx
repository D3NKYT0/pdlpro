import { Card } from '../components/ui/Card'
import { apiErrorMessage } from '../lib/errors'
import { Button } from '../components/ui/Button'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { disableBrowserPush, enableBrowserPush, isApiError, notificationApi, pushApi } from '../services/api'

export function NotificationsPage() {
  const { t } = useTranslation('panel')
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['notifications'], queryFn: notificationApi.list })
  const vapid = useQuery({ queryKey: ['push-vapid'], queryFn: pushApi.vapid })

  async function markOne(id: string) {
    try {
      await notificationApi.markRead(id)
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
    } catch (error) {
      toast.error(apiErrorMessage(error, t('notifications.markOneError')))
    }
  }

  async function markAll() {
    try {
      await notificationApi.markAllRead()
      toast.success(t('notifications.markAllSuccess'))
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
    } catch (error) {
      toast.error(apiErrorMessage(error, t('notifications.markAllError')))
    }
  }

  return (
    <Card>
      <h1>{t('notifications.title')}</h1>
      <p className="muted">{t('notifications.unreadCount', { unread: query.data?.unread ?? 0 })}</p>
      {vapid.data?.enabled ? (
        <p>
          <Button
            className="ghost"
            type="button"
            onClick={() =>
              void enableBrowserPush()
                .then(() => toast.success(t('notifications.pushEnabled')))
                .catch((error) => toast.error(isApiError(error) ? error.message : String(error)))
            }
          >
            {t('notifications.enablePush')}
          </Button>{' '}
          <Button
            className="ghost"
            type="button"
            onClick={() =>
              void disableBrowserPush()
                .then(() => toast.success(t('notifications.pushDisabled')))
                .catch((error) => toast.error(isApiError(error) ? error.message : String(error)))
            }
          >
            {t('notifications.disablePush')}
          </Button>
        </p>
      ) : null}
      {query.data?.unread ? (
        <p>
          <Button className="ghost" type="button" onClick={() => void markAll()}>
            {t('notifications.markAll')}
          </Button>
        </p>
      ) : null}
      {(query.data?.results ?? []).map((item) => (
        <Card as="article"  key={item.id}>
          <h3>{item.title}</h3>
          <p>{item.body}</p>
          <p className="muted">
            {item.kind} — {item.is_read ? t('notifications.read') : t('notifications.new')}
          </p>
          {!item.is_read ? (
            <Button type="button" onClick={() => void markOne(item.id)}>
              {t('notifications.markOne')}
            </Button>
          ) : null}
        </Card>
      ))}
      {!query.data?.results.length && <p className="muted">{t('notifications.empty')}</p>}
    </Card>
  )
}
