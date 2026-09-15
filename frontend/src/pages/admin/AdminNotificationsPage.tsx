import { Card } from '../../components/ui/Card'
import { useFeedbackAction } from '../../hooks/useFeedbackAction'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { Toggle } from '../../components/ui/Toggle'
import { Select } from '../../components/ui/Select'
import { EmptyState, ErrorNotice, LoadingState } from '../../components/ui/Feedback'
import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Bell } from 'lucide-react'
import toast from 'react-hot-toast'
import { staffApi } from '../../services/api'
import { formatDateTime } from '../../lib/formatters'
import { AdminHeader, AdminSaveBar } from './AdminChrome'

const KINDS = ['info', 'support', 'payment', 'staff'] as const

export function AdminNotificationsPage() {
  const { t } = useTranslation('admin')
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const notifications = useQuery({
    queryKey: ['staff-notifications', query],
    queryFn: () => staffApi.notifications(query || undefined),
  })
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [kind, setKind] = useState<(typeof KINDS)[number]>('info')
  const [link, setLink] = useState('')
  const [username, setUsername] = useState('')
  const [broadcast, setBroadcast] = useState(false)
  const action = useFeedbackAction()

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    await action.run(async () => {
      const result = await staffApi.sendNotification({
        title,
        body,
        kind,
        link,
        username: broadcast ? undefined : username,
        broadcast,
      })
      toast.success(broadcast ? t('notifications.toast.broadcast', { count: result.sent ?? 0 }) : t('notifications.toast.sent'))
      setTitle('')
      setBody('')
      setLink('')
      setUsername('')
      setBroadcast(false)
      await queryClient.invalidateQueries({ queryKey: ['staff-notifications'] })
    }, t('notifications.toast.error'))
  }

  async function onDelete(id: string) {
    if (!window.confirm(t('chrome.confirmDelete'))) return
    await action.run(async () => {
      await staffApi.deleteNotification(id)
      toast.success(t('notifications.toast.deleted'))
      await queryClient.invalidateQueries({ queryKey: ['staff-notifications'] })
    }, t('notifications.toast.error'))
  }

  return (
    <div className="account-page">
      <AdminHeader kicker={t('notifications.kicker')} title={t('notifications.title')} description={t('notifications.description')} />
      <form className="card admin-form" onSubmit={onSubmit}>
        <Field>{t('notifications.fieldTitle')}<input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} /></Field>
        <Field>{t('notifications.fieldBody')}<textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} /></Field>
        <div className="account-form-fields">
          <Field>{t('notifications.kind')}
            <Select aria-label={t('notifications.kind')} value={kind} onChange={(value) => setKind(value as (typeof KINDS)[number])} options={KINDS.map((value) => ({ value, label: t(`notifications.kinds.${value}`) }))} />
          </Field>
          <Field>{t('notifications.link')}<input value={link} onChange={(e) => setLink(e.target.value)} maxLength={500} /></Field>
        </div>
        <Toggle label={t('notifications.broadcast')} checked={broadcast} onChange={(e) => setBroadcast(e.target.checked)} />
        {broadcast ? null : (
          <Field>{t('notifications.username')}<input value={username} onChange={(e) => setUsername(e.target.value)} required={!broadcast} autoComplete="off" /></Field>
        )}
        <AdminSaveBar saving={action.pending} label={broadcast ? t('notifications.submitBroadcast') : t('notifications.submitSend')} />
      </form>
      <Card>
        <div className="account-section-heading">
          <div>
            <span className="panel-eyebrow">{t('notifications.libraryEyebrow')}</span>
            <h2>{t('notifications.libraryTitle')}</h2>
          </div>
        </div>
        <Field>{t('notifications.search')}
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('notifications.searchPlaceholder')} />
        </Field>
        {notifications.isPending ? <LoadingState /> : null}
        <ErrorNotice error={notifications.error} onRetry={() => void notifications.refetch()} />
        {(notifications.data ?? []).length ? (
          <div className="admin-news-list">
            {(notifications.data ?? []).map((item) => (
              <article className="admin-news-item" key={item.id}>
                <span><Bell /></span>
                <div>
                  <div>
                    <h3>{item.title}</h3>
                    <b className={item.is_read ? '' : 'is-published'}>{item.is_read ? t('notifications.read') : t('notifications.unread')}</b>
                  </div>
                  <p>{item.username} · {t(`notifications.kinds.${item.kind}`, { defaultValue: item.kind })} · {formatDateTime(item.created_at)}</p>
                </div>
                <Button variant="danger" type="button" onClick={() => void onDelete(item.id)}>{t('chrome.delete')}</Button>
              </article>
            ))}
          </div>
        ) : notifications.isPending ? null : <EmptyState icon={<Bell />}>{t('notifications.empty')}</EmptyState>}
      </Card>
    </div>
  )
}
