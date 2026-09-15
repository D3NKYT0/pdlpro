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
import { CalendarDays } from 'lucide-react'
import toast from 'react-hot-toast'
import { staffApi, type ApiStaffCalendarEvent } from '../../services/api'
import { formatDateTime } from '../../lib/formatters'
import { fromDatetimeLocal, toDatetimeLocal } from '../../lib/datetime'
import { AdminHeader, AdminSaveBar } from './AdminChrome'

const COLORS = ['gold', 'crimson', 'teal', 'violet', 'steel'] as const
const LANGS = ['pt', 'en', 'es'] as const

const emptyForm = {
  title: '',
  titleEn: '',
  titleEs: '',
  description: '',
  descriptionEn: '',
  descriptionEs: '',
  startsAt: '',
  endsAt: '',
  color: 'gold',
  published: true,
}

export function AdminCalendarPage() {
  const { t } = useTranslation('admin')
  const queryClient = useQueryClient()
  const events = useQuery({ queryKey: ['staff-calendar'], queryFn: staffApi.calendar })
  const [editing, setEditing] = useState<string | null>(null)
  const [lang, setLang] = useState<(typeof LANGS)[number]>('pt')
  const [form, setForm] = useState(emptyForm)
  const action = useFeedbackAction()

  function reset() {
    setEditing(null)
    setLang('pt')
    setForm(emptyForm)
  }

  function load(item: ApiStaffCalendarEvent) {
    setEditing(item.id)
    setForm({
      title: item.title,
      titleEn: item.title_en,
      titleEs: item.title_es,
      description: item.description,
      descriptionEn: item.description_en,
      descriptionEs: item.description_es,
      startsAt: toDatetimeLocal(item.starts_at),
      endsAt: toDatetimeLocal(item.ends_at),
      color: COLORS.includes(item.color as (typeof COLORS)[number]) ? item.color : 'gold',
      published: item.is_published,
    })
    setLang('pt')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!form.title.trim()) {
      toast.error(t('calendar.toast.titleRequired'))
      setLang('pt')
      return
    }
    await action.run(async () => {
      await staffApi.saveCalendar({
        id: editing || undefined,
        title: form.title,
        title_en: form.titleEn,
        title_es: form.titleEs,
        description: form.description,
        description_en: form.descriptionEn,
        description_es: form.descriptionEs,
        starts_at: fromDatetimeLocal(form.startsAt),
        ends_at: fromDatetimeLocal(form.endsAt),
        color: form.color,
        is_published: form.published,
      })
      toast.success(editing ? t('calendar.toast.updated') : t('calendar.toast.created'))
      reset()
      await queryClient.invalidateQueries({ queryKey: ['staff-calendar'] })
      await queryClient.invalidateQueries({ queryKey: ['calendar'] })
    }, t('calendar.toast.error'))
  }

  async function onDelete(id: string) {
    if (!window.confirm(t('chrome.confirmDelete'))) return
    await action.run(async () => {
      await staffApi.deleteCalendar(id)
      toast.success(t('calendar.toast.deleted'))
      if (editing === id) reset()
      await queryClient.invalidateQueries({ queryKey: ['staff-calendar'] })
      await queryClient.invalidateQueries({ queryKey: ['calendar'] })
    }, t('calendar.toast.error'))
  }

  return (
    <div className="account-page">
      <AdminHeader kicker={t('calendar.kicker')} title={t('calendar.title')} description={t('calendar.description')} />
      <form className="card admin-form" onSubmit={onSubmit}>
        <Tabs
          id="calendar-lang"
          label={t('calendar.language')}
          value={lang}
          onChange={setLang}
          items={LANGS.map((id) => ({ id, label: t(`calendar.languages.${id}`) }))}
        />
        <div className="admin-cms-langs" role="tabpanel" id={`calendar-lang-panel-${lang}`} aria-labelledby={`calendar-lang-tab-${lang}`}>
          {lang === 'pt' ? (
            <>
              <Field>{t('calendar.fieldTitle')}<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={200} /></Field>
              <Field>{t('calendar.fieldDescription')}<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
            </>
          ) : null}
          {lang === 'en' ? (
            <>
              <Field>{t('calendar.fieldTitle')}<input value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} maxLength={200} /></Field>
              <Field>{t('calendar.fieldDescription')}<textarea value={form.descriptionEn} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} rows={4} /></Field>
            </>
          ) : null}
          {lang === 'es' ? (
            <>
              <Field>{t('calendar.fieldTitle')}<input value={form.titleEs} onChange={(e) => setForm({ ...form, titleEs: e.target.value })} maxLength={200} /></Field>
              <Field>{t('calendar.fieldDescription')}<textarea value={form.descriptionEs} onChange={(e) => setForm({ ...form, descriptionEs: e.target.value })} rows={4} /></Field>
            </>
          ) : null}
        </div>
        <div className="account-form-fields">
          <Field>{t('calendar.color')}
            <Select
              aria-label={t('calendar.color')}
              value={form.color}
              onChange={(color) => setForm({ ...form, color })}
              options={COLORS.map((value) => ({ value, label: t(`calendar.colors.${value}`) }))}
            />
          </Field>
        </div>
        <div className="account-form-fields">
          <Field>{t('calendar.startsAt')}<input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} required /></Field>
          <Field>{t('calendar.endsAt')}<input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} required /></Field>
        </div>
        <Toggle label={t('calendar.published')} checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
        <div className="admin-cms-actions">
          <AdminSaveBar saving={action.pending} label={editing ? t('calendar.submitUpdate') : t('calendar.submitCreate')} />
          {editing ? <Button className="ghost" type="button" onClick={reset}>{t('chrome.cancelEdit')}</Button> : null}
        </div>
      </form>
      <Card>
        <div className="account-section-heading">
          <div>
            <span className="panel-eyebrow">{t('calendar.libraryEyebrow')}</span>
            <h2>{t('calendar.libraryTitle')}</h2>
          </div>
        </div>
        {events.isPending ? <LoadingState /> : null}
        <ErrorNotice error={events.error} onRetry={() => void events.refetch()} />
        {(events.data ?? []).length ? (
          <div className="admin-news-list">
            {(events.data ?? []).map((item) => (
              <article className="admin-news-item" key={item.id}>
                <span><CalendarDays /></span>
                <div>
                  <div>
                    <h3>{item.title}</h3>
                    <b className={item.is_published ? 'is-published' : ''}>{item.is_published ? t('calendar.publishedLabel') : t('calendar.draft')}</b>
                  </div>
                  <p>{formatDateTime(item.starts_at)} — {formatDateTime(item.ends_at)}</p>
                </div>
                <div className="admin-cms-actions">
                  <Button className="ghost" type="button" onClick={() => load(item)}>{t('chrome.edit')}</Button>
                  <Button variant="danger" type="button" onClick={() => void onDelete(item.id)}>{t('chrome.delete')}</Button>
                </div>
              </article>
            ))}
          </div>
        ) : events.isPending ? null : <EmptyState icon={<CalendarDays />}>{t('calendar.empty')}</EmptyState>}
      </Card>
    </div>
  )
}
