import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { Bell, X } from 'lucide-react'
import { Card } from '../ui/Card'
import { Button, ButtonLink, IconButton } from '../ui/Button'
import { EmptyState, ErrorNotice, LoadingState } from '../ui/Feedback'
import { apiErrorMessage } from '../../lib/errors'
import { formatDateTime } from '../../lib/formatters'
import { useAsyncAction } from '../../hooks/useAsyncAction'
import {
  disableBrowserPush,
  enableBrowserPush,
  isApiError,
  notificationApi,
  pushApi,
  type ApiNotification,
} from '../../services/api'
import './notification-center.css'

function notificationPath(link: string) {
  if (!link.startsWith('/') || link.startsWith('//')) return ''
  return link
}

export function NotificationCenter() {
  const { t } = useTranslation('panel')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const action = useAsyncAction()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, right: 12 })
  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationApi.list,
    refetchInterval: 30_000,
  })
  const vapid = useQuery({ queryKey: ['push-vapid'], queryFn: pushApi.vapid })
  const unread = query.data?.unread ?? 0
  const items = query.data?.results ?? []
  const openLabel = unread ? t('notifications.openUnread', { unread }) : t('notifications.open')

  function placePanel() {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    setCoords({
      top: rect.bottom + 8,
      right: Math.max(12, window.innerWidth - rect.right),
    })
  }

  useLayoutEffect(() => {
    if (!open) return
    placePanel()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onReposition = () => placePanel()
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const focusable = document.getElementById(panelId)?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    focusable?.focus()
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previous?.focus?.()
    }
  }, [open, panelId])

  async function refreshList() {
    await queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  async function markOne(id: string) {
    const result = await action.run(async () => {
      await notificationApi.markRead(id)
      await refreshList()
    })
    if (!result.ok && !result.skipped) {
      toast.error(apiErrorMessage(result.error, t('notifications.markOneError')))
    }
  }

  async function markAll() {
    const result = await action.run(async () => {
      await notificationApi.markAllRead()
      await refreshList()
    })
    if (result.ok) toast.success(t('notifications.markAllSuccess'))
    else if (!result.skipped) toast.error(apiErrorMessage(result.error, t('notifications.markAllError')))
  }

  async function markAndClose(item: ApiNotification) {
    if (!item.is_read) await markOne(item.id)
    setOpen(false)
  }

  async function openLinked(item: ApiNotification, href: string) {
    await markAndClose(item)
    navigate(href)
  }

  return (
    <div className="notification-center" data-theme-part="notification-center">
      <IconButton
        ref={triggerRef}
        className="notification-center-trigger"
        size="sm"
        variant="secondary"
        label={openLabel}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
      >
        <Bell aria-hidden="true" />
        {unread ? <b className="notification-center-badge">{unread > 99 ? '99+' : unread}</b> : null}
      </IconButton>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <>
              <button
                type="button"
                className="notification-center-backdrop"
                aria-label={t('notifications.close')}
                onClick={() => setOpen(false)}
              />
              <Card
                as="aside"
                id={panelId}
                className="notification-center-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                style={{ top: coords.top, right: coords.right }}
              >
                <header className="notification-center-head">
                  <div>
                    <p className="panel-eyebrow">{t('notifications.eyebrow')}</p>
                    <h2 id={titleId}>{t('notifications.title')}</h2>
                    <p className="muted">{t('notifications.unreadCount', { unread })}</p>
                  </div>
                  <IconButton label={t('notifications.close')} size="sm" variant="danger" onClick={() => setOpen(false)}>
                    <X aria-hidden="true" />
                  </IconButton>
                </header>
                {vapid.data?.enabled ? (
                  <p className="notification-center-toolbar">
                    <Button
                      className="ghost"
                      size="sm"
                      type="button"
                      onClick={() =>
                        void enableBrowserPush()
                          .then(() => toast.success(t('notifications.pushEnabled')))
                          .catch((error) => toast.error(isApiError(error) ? error.message : String(error)))
                      }
                    >
                      {t('notifications.enablePush')}
                    </Button>
                    <Button
                      className="ghost"
                      size="sm"
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
                {unread ? (
                  <p className="notification-center-toolbar">
                    <Button className="ghost" size="sm" type="button" busy={action.pending} onClick={() => void markAll()}>
                      {t('notifications.markAll')}
                    </Button>
                  </p>
                ) : null}
                {query.isPending && !query.data ? <LoadingState /> : null}
                {query.error ? (
                  <ErrorNotice error={query.error} fallback={t('notifications.loadError')} onRetry={() => void query.refetch()} />
                ) : null}
                <div className="notification-center-list">
                  {items.map((item) => {
                    const href = notificationPath(item.link)
                    return (
                      <article
                        key={item.id}
                        className={`notification-center-item${item.is_read ? '' : ' is-unread'}`}
                      >
                        <h3>
                          {href ? (
                            <button type="button" className="notification-center-link" onClick={() => void openLinked(item, href)}>
                              {item.title}
                            </button>
                          ) : (
                            item.title
                          )}
                        </h3>
                        {item.body ? <p>{item.body}</p> : null}
                        <p className="muted">
                          {t(`notifications.kind.${item.kind}`, { defaultValue: item.kind })} — {item.is_read ? t('notifications.read') : t('notifications.new')}
                          {item.created_at ? ` · ${formatDateTime(item.created_at, 'short')}` : ''}
                        </p>
                        <p className="notification-center-item-actions">
                          {href ? (
                            <ButtonLink to={href} size="sm" variant="secondary" onClick={() => void markAndClose(item)}>
                              {t('notifications.openItem')}
                            </ButtonLink>
                          ) : null}
                          {!item.is_read ? (
                            <Button size="sm" type="button" busy={action.pending} onClick={() => void markOne(item.id)}>
                              {t('notifications.markOne')}
                            </Button>
                          ) : null}
                        </p>
                      </article>
                    )
                  })}
                  {!query.isPending && !items.length ? <EmptyState>{t('notifications.empty')}</EmptyState> : null}
                </div>
              </Card>
            </>,
            document.body,
          )
        : null}
    </div>
  )
}
