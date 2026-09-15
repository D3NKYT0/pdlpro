import { Card } from '../../components/ui/Card'
import { useFeedbackAction } from '../../hooks/useFeedbackAction'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { Tabs } from '../../components/ui/Tabs'
import { RichTextEditor } from '../../components/ui/RichText'
import { isRichTextEmpty } from '../../lib/rich-text'
import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { FilePenLine, Newspaper, PencilLine, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { staffApi, type ApiStaffNews } from '../../services/api'
import { AdminHeader, AdminSaveBar } from './AdminChrome'

const LANGS = ['pt', 'en', 'es'] as const

const emptyForm = {
  title: '',
  titleEn: '',
  titleEs: '',
  excerpt: '',
  excerptEn: '',
  excerptEs: '',
  body: '',
  bodyEn: '',
  bodyEs: '',
  published: true,
}

export function AdminNewsPage() {
  const { t } = useTranslation('admin')
  const queryClient = useQueryClient()
  const news = useQuery({ queryKey: ['staff-news'], queryFn: staffApi.news })
  const [title, setTitle] = useState(emptyForm.title)
  const [titleEn, setTitleEn] = useState(emptyForm.titleEn)
  const [titleEs, setTitleEs] = useState(emptyForm.titleEs)
  const [excerpt, setExcerpt] = useState(emptyForm.excerpt)
  const [excerptEn, setExcerptEn] = useState(emptyForm.excerptEn)
  const [excerptEs, setExcerptEs] = useState(emptyForm.excerptEs)
  const [body, setBody] = useState(emptyForm.body)
  const [bodyEn, setBodyEn] = useState(emptyForm.bodyEn)
  const [bodyEs, setBodyEs] = useState(emptyForm.bodyEs)
  const [published, setPublished] = useState(emptyForm.published)
  const [editing, setEditing] = useState<string | null>(null)
  const [lang, setLang] = useState<(typeof LANGS)[number]>('pt')
  const action = useFeedbackAction()
  const saving = action.pending

  function resetEditor() {
    setTitle(emptyForm.title)
    setTitleEn(emptyForm.titleEn)
    setTitleEs(emptyForm.titleEs)
    setExcerpt(emptyForm.excerpt)
    setExcerptEn(emptyForm.excerptEn)
    setExcerptEs(emptyForm.excerptEs)
    setBody(emptyForm.body)
    setBodyEn(emptyForm.bodyEn)
    setBodyEs(emptyForm.bodyEs)
    setPublished(emptyForm.published)
    setEditing(null)
    setLang('pt')
  }

  function load(item: ApiStaffNews) {
    setEditing(item.id)
    setTitle(item.title)
    setTitleEn(item.title_en)
    setTitleEs(item.title_es)
    setExcerpt(item.excerpt)
    setExcerptEn(item.excerpt_en)
    setExcerptEs(item.excerpt_es)
    setBody(item.body)
    setBodyEn(item.body_en)
    setBodyEs(item.body_es)
    setPublished(item.is_published)
    setLang('pt')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) {
      toast.error(t('news.toast.titleRequired'))
      setLang('pt')
      return
    }
    if (isRichTextEmpty(body)) {
      toast.error(t('news.toast.bodyRequired'))
      setLang('pt')
      return
    }
    await action.run(async () => {
      await staffApi.saveNews({
        id: editing || undefined,
        title,
        title_en: titleEn,
        title_es: titleEs,
        excerpt,
        excerpt_en: excerptEn,
        excerpt_es: excerptEs,
        body,
        body_en: bodyEn,
        body_es: bodyEs,
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
          <Tabs
            id="news-lang"
            label={t('news.language')}
            value={lang}
            onChange={setLang}
            items={LANGS.map((id) => ({ id, label: t(`news.languages.${id}`) }))}
          />
          <div className="admin-cms-langs" role="tabpanel" id={`news-lang-panel-${lang}`} aria-labelledby={`news-lang-tab-${lang}`}>
            {lang === 'pt' ? (
              <>
                <Field>{t('news.fieldTitle')} <small>{title.length}/120</small><input maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} required /></Field>
                <Field>{t('news.fieldExcerpt')} <small>{excerpt.length}/240</small><input maxLength={240} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} /></Field>
                <Field>{t('news.fieldBody')}<RichTextEditor value={body} onChange={setBody} required aria-label={t('news.fieldBody')} /></Field>
              </>
            ) : null}
            {lang === 'en' ? (
              <>
                <Field>{t('news.fieldTitle')} <small>{titleEn.length}/120</small><input maxLength={120} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} /></Field>
                <Field>{t('news.fieldExcerpt')} <small>{excerptEn.length}/240</small><input maxLength={240} value={excerptEn} onChange={(e) => setExcerptEn(e.target.value)} /></Field>
                <Field>{t('news.fieldBody')}<RichTextEditor value={bodyEn} onChange={setBodyEn} aria-label={t('news.fieldBody')} /></Field>
              </>
            ) : null}
            {lang === 'es' ? (
              <>
                <Field>{t('news.fieldTitle')} <small>{titleEs.length}/120</small><input maxLength={120} value={titleEs} onChange={(e) => setTitleEs(e.target.value)} /></Field>
                <Field>{t('news.fieldExcerpt')} <small>{excerptEs.length}/240</small><input maxLength={240} value={excerptEs} onChange={(e) => setExcerptEs(e.target.value)} /></Field>
                <Field>{t('news.fieldBody')}<RichTextEditor value={bodyEs} onChange={setBodyEs} aria-label={t('news.fieldBody')} /></Field>
              </>
            ) : null}
          </div>
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
            <Button className="ghost" type="button" onClick={() => load(item)}><PencilLine /> {t('news.edit')}</Button>
          </article>
        ))}</div> : <div className="account-empty-state"><Newspaper /><strong>{t('news.emptyTitle')}</strong><span>{t('news.emptyText')}</span></div>}
      </Card>
    </div>
  )
}
