import { Card } from '../../components/ui/Card'
import { useFeedbackAction } from '../../hooks/useFeedbackAction'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { Toggle } from '../../components/ui/Toggle'
import { Tabs } from '../../components/ui/Tabs'
import { RichTextEditor } from '../../components/ui/RichText'
import { EmptyState, ErrorNotice, LoadingState } from '../../components/ui/Feedback'
import { isRichTextEmpty } from '../../lib/rich-text'
import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import { staffApi, type ApiStaffWikiPage } from '../../services/api'
import { AdminHeader, AdminSaveBar } from './AdminChrome'

const LANGS = ['pt', 'en', 'es'] as const

const emptyForm = {
  title: '',
  titleEn: '',
  titleEs: '',
  summary: '',
  summaryEn: '',
  summaryEs: '',
  body: '',
  bodyEn: '',
  bodyEs: '',
  category: 'guide',
  slug: '',
  order: '0',
  published: true,
  menuItem: true,
}

export function AdminWikiPage() {
  const { t } = useTranslation('admin')
  const queryClient = useQueryClient()
  const pages = useQuery({ queryKey: ['staff-wiki'], queryFn: staffApi.wiki })
  const [editing, setEditing] = useState<string | null>(null)
  const [lang, setLang] = useState<(typeof LANGS)[number]>('pt')
  const [form, setForm] = useState(emptyForm)
  const action = useFeedbackAction()

  function reset() {
    setEditing(null)
    setLang('pt')
    setForm(emptyForm)
  }

  function load(item: ApiStaffWikiPage) {
    setEditing(item.id)
    setForm({
      title: item.title,
      titleEn: item.title_en,
      titleEs: item.title_es,
      summary: item.summary,
      summaryEn: item.summary_en,
      summaryEs: item.summary_es,
      body: item.body,
      bodyEn: item.body_en,
      bodyEs: item.body_es,
      category: item.category || 'guide',
      slug: item.slug,
      order: String(item.order),
      published: item.is_published,
      menuItem: item.is_menu_item,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (isRichTextEmpty(form.body)) {
      toast.error(t('wiki.toast.bodyRequired'))
      return
    }
    await action.run(async () => {
      await staffApi.saveWiki({
        id: editing || undefined,
        title: form.title,
        title_en: form.titleEn,
        title_es: form.titleEs,
        summary: form.summary,
        summary_en: form.summaryEn,
        summary_es: form.summaryEs,
        body: form.body,
        body_en: form.bodyEn,
        body_es: form.bodyEs,
        category: form.category,
        slug: form.slug || undefined,
        order: Number(form.order),
        is_published: form.published,
        is_menu_item: form.menuItem,
      })
      toast.success(editing ? t('wiki.toast.updated') : t('wiki.toast.created'))
      reset()
      await queryClient.invalidateQueries({ queryKey: ['staff-wiki'] })
      await queryClient.invalidateQueries({ queryKey: ['wiki'] })
    }, t('wiki.toast.error'))
  }

  async function onDelete(id: string) {
    if (!window.confirm(t('chrome.confirmDelete'))) return
    await action.run(async () => {
      await staffApi.deleteWiki(id)
      toast.success(t('wiki.toast.deleted'))
      if (editing === id) reset()
      await queryClient.invalidateQueries({ queryKey: ['staff-wiki'] })
      await queryClient.invalidateQueries({ queryKey: ['wiki'] })
    }, t('wiki.toast.error'))
  }

  return (
    <div className="account-page">
      <AdminHeader kicker={t('wiki.kicker')} title={t('wiki.title')} description={t('wiki.description')} />
      <form className="card admin-form" onSubmit={onSubmit}>
        <Tabs
          id="wiki-lang"
          label={t('wiki.language')}
          value={lang}
          onChange={setLang}
          items={LANGS.map((id) => ({ id, label: t(`wiki.languages.${id}`) }))}
        />
        <div className="admin-cms-langs" role="tabpanel" id={`wiki-lang-panel-${lang}`} aria-labelledby={`wiki-lang-tab-${lang}`}>
          {lang === 'pt' ? (
            <>
              <Field>{t('wiki.fieldTitle')}<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={200} /></Field>
              <Field>{t('wiki.summary')}<input value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} maxLength={400} /></Field>
              <Field>{t('wiki.body')}<RichTextEditor value={form.body} onChange={(body) => setForm({ ...form, body })} required aria-label={t('wiki.body')} /></Field>
            </>
          ) : null}
          {lang === 'en' ? (
            <>
              <Field>{t('wiki.fieldTitle')}<input value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} maxLength={200} /></Field>
              <Field>{t('wiki.summary')}<input value={form.summaryEn} onChange={(e) => setForm({ ...form, summaryEn: e.target.value })} maxLength={400} /></Field>
              <Field>{t('wiki.body')}<RichTextEditor value={form.bodyEn} onChange={(bodyEn) => setForm({ ...form, bodyEn })} aria-label={t('wiki.body')} /></Field>
            </>
          ) : null}
          {lang === 'es' ? (
            <>
              <Field>{t('wiki.fieldTitle')}<input value={form.titleEs} onChange={(e) => setForm({ ...form, titleEs: e.target.value })} maxLength={200} /></Field>
              <Field>{t('wiki.summary')}<input value={form.summaryEs} onChange={(e) => setForm({ ...form, summaryEs: e.target.value })} maxLength={400} /></Field>
              <Field>{t('wiki.body')}<RichTextEditor value={form.bodyEs} onChange={(bodyEs) => setForm({ ...form, bodyEs })} aria-label={t('wiki.body')} /></Field>
            </>
          ) : null}
        </div>
        <div className="account-form-fields">
          <Field>{t('wiki.category')}<input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} maxLength={40} /></Field>
          <Field>{t('wiki.slug')}<input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} maxLength={200} /></Field>
          <Field>{t('wiki.order')}<input type="number" min={0} value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} /></Field>
        </div>
        <Toggle label={t('wiki.published')} checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
        <Toggle label={t('wiki.menuItem')} checked={form.menuItem} onChange={(e) => setForm({ ...form, menuItem: e.target.checked })} />
        <div className="admin-cms-actions">
          <AdminSaveBar saving={action.pending} label={editing ? t('wiki.submitUpdate') : t('wiki.submitCreate')} />
          {editing ? <Button className="ghost" type="button" onClick={reset}>{t('chrome.cancelEdit')}</Button> : null}
        </div>
      </form>
      <Card>
        <div className="account-section-heading">
          <div>
            <span className="panel-eyebrow">{t('wiki.libraryEyebrow')}</span>
            <h2>{t('wiki.libraryTitle')}</h2>
          </div>
        </div>
        {pages.isPending ? <LoadingState /> : null}
        <ErrorNotice error={pages.error} onRetry={() => void pages.refetch()} />
        {(pages.data ?? []).length ? (
          <div className="admin-news-list">
            {(pages.data ?? []).map((item) => (
              <article className="admin-news-item" key={item.id}>
                <span><BookOpen /></span>
                <div>
                  <div>
                    <h3>{item.title}</h3>
                    <b className={item.is_published ? 'is-published' : ''}>{item.is_published ? t('wiki.publishedLabel') : t('wiki.draft')}</b>
                  </div>
                  <p>{item.slug} · {item.category}</p>
                </div>
                <div className="admin-cms-actions">
                  <Button className="ghost" type="button" onClick={() => load(item)}>{t('chrome.edit')}</Button>
                  <Button variant="danger" type="button" onClick={() => void onDelete(item.id)}>{t('chrome.delete')}</Button>
                </div>
              </article>
            ))}
          </div>
        ) : pages.isPending ? null : <EmptyState icon={<BookOpen />}>{t('wiki.empty')}</EmptyState>}
      </Card>
    </div>
  )
}
