import { Card } from '../../components/ui/Card'
import { useFeedbackAction } from '../../hooks/useFeedbackAction'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { Toggle } from '../../components/ui/Toggle'
import { EmptyState, ErrorNotice, LoadingState } from '../../components/ui/Feedback'
import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { staffApi, type ApiStaffDownload } from '../../services/api'
import { AdminHeader, AdminSaveBar } from './AdminChrome'

const emptyForm = { title: '', url: '', category: 'client', order: '0', published: true }

export function AdminDownloadsPage() {
  const { t } = useTranslation('admin')
  const queryClient = useQueryClient()
  const downloads = useQuery({ queryKey: ['staff-downloads'], queryFn: staffApi.downloads })
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const action = useFeedbackAction()

  function reset() {
    setEditing(null)
    setForm(emptyForm)
  }

  function load(item: ApiStaffDownload) {
    setEditing(item.id)
    setForm({
      title: item.title,
      url: item.url,
      category: item.category || 'client',
      order: String(item.order),
      published: item.is_published,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    await action.run(async () => {
      await staffApi.saveDownload({
        id: editing || undefined,
        title: form.title,
        url: form.url,
        category: form.category,
        order: Number(form.order),
        is_published: form.published,
      })
      toast.success(editing ? t('downloads.toast.updated') : t('downloads.toast.created'))
      reset()
      await queryClient.invalidateQueries({ queryKey: ['staff-downloads'] })
      await queryClient.invalidateQueries({ queryKey: ['downloads'] })
    }, t('downloads.toast.error'))
  }

  async function onDelete(id: string) {
    if (!window.confirm(t('chrome.confirmDelete'))) return
    await action.run(async () => {
      await staffApi.deleteDownload(id)
      toast.success(t('downloads.toast.deleted'))
      if (editing === id) reset()
      await queryClient.invalidateQueries({ queryKey: ['staff-downloads'] })
      await queryClient.invalidateQueries({ queryKey: ['downloads'] })
    }, t('downloads.toast.error'))
  }

  return (
    <div className="account-page">
      <AdminHeader kicker={t('downloads.kicker')} title={t('downloads.title')} description={t('downloads.description')} />
      <form className="card admin-form" onSubmit={onSubmit}>
        <div className="account-form-fields">
          <Field>{t('downloads.fieldTitle')}<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={120} /></Field>
          <Field>{t('downloads.category')}<input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} maxLength={60} /></Field>
        </div>
        <Field>{t('downloads.url')}<input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} required /></Field>
        <Field>{t('downloads.order')}<input type="number" min={0} value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} /></Field>
        <Toggle label={t('downloads.published')} checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
        <div className="admin-cms-actions">
          <AdminSaveBar saving={action.pending} label={editing ? t('downloads.submitUpdate') : t('downloads.submitCreate')} />
          {editing ? <Button className="ghost" type="button" onClick={reset}>{t('chrome.cancelEdit')}</Button> : null}
        </div>
      </form>
      <Card>
        <div className="account-section-heading">
          <div>
            <span className="panel-eyebrow">{t('downloads.libraryEyebrow')}</span>
            <h2>{t('downloads.libraryTitle')}</h2>
          </div>
        </div>
        {downloads.isPending ? <LoadingState /> : null}
        <ErrorNotice error={downloads.error} onRetry={() => void downloads.refetch()} />
        {(downloads.data ?? []).length ? (
          <div className="admin-news-list">
            {(downloads.data ?? []).map((item) => (
              <article className="admin-news-item" key={item.id}>
                <span><Download /></span>
                <div>
                  <div>
                    <h3>{item.title}</h3>
                    <b className={item.is_published ? 'is-published' : ''}>{item.is_published ? t('downloads.publishedLabel') : t('downloads.draft')}</b>
                  </div>
                  <p>{item.category} · {item.url}</p>
                </div>
                <div className="admin-cms-actions">
                  <Button className="ghost" type="button" onClick={() => load(item)}>{t('chrome.edit')}</Button>
                  <Button variant="danger" type="button" onClick={() => void onDelete(item.id)}>{t('chrome.delete')}</Button>
                </div>
              </article>
            ))}
          </div>
        ) : downloads.isPending ? null : <EmptyState icon={<Download />}>{t('downloads.empty')}</EmptyState>}
      </Card>
    </div>
  )
}
