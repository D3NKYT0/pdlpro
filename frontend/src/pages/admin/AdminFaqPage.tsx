import { Card } from '../../components/ui/Card'
import { useFeedbackAction } from '../../hooks/useFeedbackAction'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { Toggle } from '../../components/ui/Toggle'
import { Select } from '../../components/ui/Select'
import { Tabs } from '../../components/ui/Tabs'
import { EmptyState, ErrorNotice, LoadingState } from '../../components/ui/Feedback'
import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { CircleHelp } from 'lucide-react'
import toast from 'react-hot-toast'
import { staffApi, type ApiStaffFaq } from '../../services/api'
import { AdminHeader, AdminSaveBar } from './AdminChrome'

const CATEGORIES = ['getting_started', 'account_security', 'game_accounts', 'economy', 'commerce', 'games_rewards', 'community', 'support'] as const
const AUDIENCES = ['public', 'staff', 'superadmin'] as const
const LANGS = ['pt', 'en', 'es'] as const

const emptyForm = {
  question: '',
  shortAnswer: '',
  answer: '',
  questionEn: '',
  shortAnswerEn: '',
  answerEn: '',
  questionEs: '',
  shortAnswerEs: '',
  answerEs: '',
  category: 'getting_started',
  keywords: '',
  keywordsEn: '',
  keywordsEs: '',
  audience: 'public',
  assistantOnly: false,
  order: '0',
  published: true,
}

export function AdminFaqPage() {
  const { t } = useTranslation('admin')
  const queryClient = useQueryClient()
  const faq = useQuery({ queryKey: ['staff-faq'], queryFn: staffApi.faq })
  const [editing, setEditing] = useState<string | null>(null)
  const [lang, setLang] = useState<(typeof LANGS)[number]>('pt')
  const [form, setForm] = useState(emptyForm)
  const action = useFeedbackAction()

  function reset() {
    setEditing(null)
    setLang('pt')
    setForm(emptyForm)
  }

  function load(item: ApiStaffFaq) {
    setEditing(item.id)
    setForm({
      question: item.question,
      shortAnswer: item.short_answer,
      answer: item.answer,
      questionEn: item.question_en,
      shortAnswerEn: item.short_answer_en,
      answerEn: item.answer_en,
      questionEs: item.question_es,
      shortAnswerEs: item.short_answer_es,
      answerEs: item.answer_es,
      category: CATEGORIES.includes(item.category as (typeof CATEGORIES)[number]) ? item.category : 'getting_started',
      keywords: item.keywords,
      keywordsEn: item.keywords_en,
      keywordsEs: item.keywords_es,
      audience: AUDIENCES.includes(item.audience as (typeof AUDIENCES)[number]) ? item.audience : 'public',
      assistantOnly: item.assistant_only,
      order: String(item.order),
      published: item.is_published,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    await action.run(async () => {
      await staffApi.saveFaq({
        id: editing || undefined,
        question: form.question,
        short_answer: form.shortAnswer,
        answer: form.answer,
        question_en: form.questionEn,
        short_answer_en: form.shortAnswerEn,
        answer_en: form.answerEn,
        question_es: form.questionEs,
        short_answer_es: form.shortAnswerEs,
        answer_es: form.answerEs,
        category: form.category,
        keywords: form.keywords,
        keywords_en: form.keywordsEn,
        keywords_es: form.keywordsEs,
        audience: form.audience,
        assistant_only: form.assistantOnly,
        order: Number(form.order),
        is_published: form.published,
      })
      toast.success(editing ? t('faq.toast.updated') : t('faq.toast.created'))
      reset()
      await queryClient.invalidateQueries({ queryKey: ['staff-faq'] })
      await queryClient.invalidateQueries({ queryKey: ['faq'] })
    }, t('faq.toast.error'))
  }

  async function onDelete(id: string) {
    if (!window.confirm(t('chrome.confirmDelete'))) return
    await action.run(async () => {
      await staffApi.deleteFaq(id)
      toast.success(t('faq.toast.deleted'))
      if (editing === id) reset()
      await queryClient.invalidateQueries({ queryKey: ['staff-faq'] })
      await queryClient.invalidateQueries({ queryKey: ['faq'] })
    }, t('faq.toast.error'))
  }

  return (
    <div className="account-page">
      <AdminHeader kicker={t('faq.kicker')} title={t('faq.title')} description={t('faq.description')} />
      <form className="card admin-form" onSubmit={onSubmit}>
        <Tabs
          id="faq-lang"
          label={t('faq.language')}
          value={lang}
          onChange={setLang}
          items={LANGS.map((id) => ({ id, label: t(`faq.languages.${id}`) }))}
        />
        <div className="admin-cms-langs" role="tabpanel" id={`faq-lang-panel-${lang}`} aria-labelledby={`faq-lang-tab-${lang}`}>
          {lang === 'pt' ? (
            <>
              <Field>{t('faq.question')}<input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} required maxLength={250} /></Field>
              <Field>{t('faq.shortAnswer')}<input value={form.shortAnswer} onChange={(e) => setForm({ ...form, shortAnswer: e.target.value })} maxLength={400} /></Field>
              <Field>{t('faq.answer')}<textarea value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} rows={6} required /></Field>
              <Field>{t('faq.keywords')}<input value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} /></Field>
            </>
          ) : null}
          {lang === 'en' ? (
            <>
              <Field>{t('faq.question')}<input value={form.questionEn} onChange={(e) => setForm({ ...form, questionEn: e.target.value })} maxLength={250} /></Field>
              <Field>{t('faq.shortAnswer')}<input value={form.shortAnswerEn} onChange={(e) => setForm({ ...form, shortAnswerEn: e.target.value })} maxLength={400} /></Field>
              <Field>{t('faq.answer')}<textarea value={form.answerEn} onChange={(e) => setForm({ ...form, answerEn: e.target.value })} rows={6} /></Field>
              <Field>{t('faq.keywords')}<input value={form.keywordsEn} onChange={(e) => setForm({ ...form, keywordsEn: e.target.value })} /></Field>
            </>
          ) : null}
          {lang === 'es' ? (
            <>
              <Field>{t('faq.question')}<input value={form.questionEs} onChange={(e) => setForm({ ...form, questionEs: e.target.value })} maxLength={250} /></Field>
              <Field>{t('faq.shortAnswer')}<input value={form.shortAnswerEs} onChange={(e) => setForm({ ...form, shortAnswerEs: e.target.value })} maxLength={400} /></Field>
              <Field>{t('faq.answer')}<textarea value={form.answerEs} onChange={(e) => setForm({ ...form, answerEs: e.target.value })} rows={6} /></Field>
              <Field>{t('faq.keywords')}<input value={form.keywordsEs} onChange={(e) => setForm({ ...form, keywordsEs: e.target.value })} /></Field>
            </>
          ) : null}
        </div>
        <div className="account-form-fields">
          <Field>{t('faq.category')}
            <Select aria-label={t('faq.category')} value={form.category} onChange={(category) => setForm({ ...form, category })} options={CATEGORIES.map((value) => ({ value, label: t(`faq.categories.${value}`) }))} />
          </Field>
          <Field>{t('faq.audience')}
            <Select aria-label={t('faq.audience')} value={form.audience} onChange={(audience) => setForm({ ...form, audience })} options={AUDIENCES.map((value) => ({ value, label: t(`faq.audiences.${value}`) }))} />
          </Field>
          <Field>{t('faq.order')}<input type="number" min={0} value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} /></Field>
        </div>
        <Toggle label={t('faq.published')} checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
        <Toggle label={t('faq.assistantOnly')} checked={form.assistantOnly} onChange={(e) => setForm({ ...form, assistantOnly: e.target.checked })} />
        <div className="admin-cms-actions">
          <AdminSaveBar saving={action.pending} label={editing ? t('faq.submitUpdate') : t('faq.submitCreate')} />
          {editing ? <Button className="ghost" type="button" onClick={reset}>{t('chrome.cancelEdit')}</Button> : null}
        </div>
      </form>
      <Card>
        <div className="account-section-heading">
          <div>
            <span className="panel-eyebrow">{t('faq.libraryEyebrow')}</span>
            <h2>{t('faq.libraryTitle')}</h2>
          </div>
        </div>
        {faq.isPending ? <LoadingState /> : null}
        <ErrorNotice error={faq.error} onRetry={() => void faq.refetch()} />
        {(faq.data ?? []).length ? (
          <div className="admin-news-list">
            {(faq.data ?? []).map((item) => (
              <article className="admin-news-item" key={item.id}>
                <span><CircleHelp /></span>
                <div>
                  <div>
                    <h3>{item.question}</h3>
                    <b className={item.is_published ? 'is-published' : ''}>{item.assistant_only ? t('faq.handbook') : item.is_published ? t('faq.publishedLabel') : t('faq.draft')}</b>
                  </div>
                  <p>{t(`faq.categories.${item.category}`, { defaultValue: item.category })}</p>
                </div>
                <div className="admin-cms-actions">
                  <Button className="ghost" type="button" onClick={() => load(item)}>{t('chrome.edit')}</Button>
                  <Button variant="danger" type="button" onClick={() => void onDelete(item.id)}>{t('chrome.delete')}</Button>
                </div>
              </article>
            ))}
          </div>
        ) : faq.isPending ? null : <EmptyState icon={<CircleHelp />}>{t('faq.empty')}</EmptyState>}
      </Card>
    </div>
  )
}
