import { Card } from '../../components/ui/Card'
import { useFeedbackAction } from '../../hooks/useFeedbackAction'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { RichTextEditor } from '../../components/ui/RichText'
import { isRichTextEmpty } from '../../lib/rich-text'
import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { FilePenLine, Newspaper, PencilLine, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { staffApi } from '../../services/api'
import { AdminHeader, AdminSaveBar } from './AdminChrome'

export function AdminNewsPage() {
  const { t } = useTranslation('admin')
  const queryClient = useQueryClient()
  const news = useQuery({ queryKey: ['staff-news'], queryFn: staffApi.news })
  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [body, setBody] = useState('')
  const [published, setPublished] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const action = useFeedbackAction()
  const saving = action.pending

  function resetEditor() {
    setTitle('')
    setExcerpt('')
    setBody('')
    setPublished(true)
    setEditing(null)
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (isRichTextEmpty(body)) {
      toast.error(t('news.toast.bodyRequired'))
      return
    }
    await action.run(async () => {
      await staffApi.saveNews({
        id: editing || undefined,
        title,
        excerpt,
        body,
        is_published: published,
      })
      toast.success(editing ? t('news.toast.updated') : t('news.toast.created'))
      resetEditor()
      await queryClient.invalidateQueries({ queryKey: ['staff-news'] })
      await queryClient.invalidateQueries({ queryKey: ['news'] })
    }, t('news.toast.error'))
  }

  return (
    <div className="account-page">
      <AdminHeader kicker={t('news.kicker')} title={t('news.title')} description={t('news.description')} />
      <form className="admin-news-editor" onSubmit={onSubmit}>
        <Card className="admin-config-section">
          <header>
            <span><FilePenLine /></span>
            <div><span className="panel-eyebrow">{editing ? t('news.editingEyebrow') : t('news.creatingEyebrow')}</span><h2>{editing ? t('news.editTitle') : t('news.createTitle')}</h2><p>{t('news.editorText')}</p></div>
          </header>
          <Field>{t('news.fieldTitle')} <small>{title.length}/120</small><input maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} required /></Field>
          <Field>{t('news.fieldExcerpt')} <small>{excerpt.length}/240</small><input maxLength={240} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} /></Field>
          <Field>{t('news.fieldBody')}<RichTextEditor value={body} onChange={setBody} required aria-label={t('news.fieldBody')} /></Field>
        </Card>

        <Card as="aside" className="admin-news-publish">
          <header><span><Send /></span><div><span className="panel-eyebrow">{t('news.publishEyebrow')}</span><h2>{t('news.publishTitle')}</h2></div></header>
          <label className="admin-toggle">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            <span className="admin-toggle-control" aria-hidden="true"><i /></span>
            <span><strong>{published ? t('news.publishNow') : t('news.saveDraft')}</strong><small>{published ? t('news.publishNowHint') : t('news.saveDraftHint')}</small></span>
            <b>{published ? t('news.public') : t('news.draft')}</b>
          </label>
          <div className="admin-news-checklist">
            <span><small>{t('news.fieldTitle')}</small><b>{title.trim() ? t('news.ready') : t('news.pending')}</b></span>
            <span><small>{t('news.fieldBody')}</small><b>{isRichTextEmpty(body) ? t('news.pending') : t('news.ready')}</b></span>
          </div>
          <AdminSaveBar saving={saving} label={editing ? t('news.submitUpdate') : published ? t('news.submitPublish') : t('news.submitDraft')} />
          {editing ? <Button className="ghost" type="button" onClick={resetEditor}>{t('news.cancelEdit')}</Button> : null}
        </Card>
      </form>
      <Card className="admin-news-library">
        <header className="admin-services-heading">
          <span><Newspaper /></span>
          <div><span className="panel-eyebrow">{t('news.libraryEyebrow')}</span><h2>{t('news.libraryTitle')}</h2><p>{t('news.libraryText')}</p></div>
          <div className="admin-services-summary"><strong>{(news.data ?? []).length}</strong><small>{t('news.total')}</small></div>
        </header>
        {(news.data ?? []).length ? <div className="admin-news-list">{(news.data ?? []).map((item) => (
          <article className="admin-news-item" key={item.id}>
            <span><Newspaper /></span>
            <div><div><h3>{item.title}</h3><b className={item.is_published ? 'is-published' : ''}>{item.is_published ? t('news.published') : t('news.draft')}</b></div><p>{item.excerpt || t('news.noExcerpt')}</p></div>
            <Button className="ghost" type="button" onClick={() => {
              setEditing(item.id)
              setTitle(item.title)
              setExcerpt(item.excerpt)
              setBody(item.body)
              setPublished(item.is_published)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}><PencilLine /> {t('news.edit')}</Button>
          </article>
        ))}</div> : <div className="account-empty-state"><Newspaper /><strong>{t('news.emptyTitle')}</strong><span>{t('news.emptyText')}</span></div>}
      </Card>
    </div>
  )
}
