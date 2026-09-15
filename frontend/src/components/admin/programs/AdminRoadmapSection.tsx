import { Card } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { Tabs } from '../../ui/Tabs'
import { RichTextEditor } from '../../ui/RichText'
import { isRichTextEmpty } from '../../../lib/rich-text'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import {
  programsApi,
  type RoadmapEntry,
} from '../../../services/api'
import {
  Empty,
  ErrorNotice,
  Loading,
  Status,
} from '../../programs/ProgramUI'
import { useProgramAction } from '../../programs/useProgramAction'
import { AdminHeader } from '../../../pages/admin/AdminChrome'
import toast from 'react-hot-toast'

const LANGS = ['pt', 'en', 'es'] as const

export function AdminRoadmapSection() {
  const { t } = useTranslation('admin')
  const query = useQuery({
    queryKey: ['staff-roadmap'],
    queryFn: () => programsApi.roadmap(true),
  })
  const action = useProgramAction()
  const [edit, setEdit] = useState<Partial<RoadmapEntry> | null>(null)
  const [lang, setLang] = useState<(typeof LANGS)[number]>('pt')
  const [remove, setRemove] = useState<string | null>(null)

  function openCreate() {
    setLang('pt')
    setEdit({
      status: 'planned',
      progress: 0,
      published: true,
      title: '',
      title_en: '',
      title_es: '',
      description: '',
      description_en: '',
      description_es: '',
    })
  }

  function openEdit(entry: RoadmapEntry) {
    setLang('pt')
    setEdit(entry)
  }

  function patch(next: Partial<RoadmapEntry>) {
    setEdit((current) => (current ? { ...current, ...next } : current))
  }

  return (
    <div className="program-page">
      <AdminHeader
        kicker={t('roadmap.kicker')}
        title={t('roadmap.title')}
        description={t('roadmap.description')}
      />
      <ErrorNotice error={query.error || action.error} />
      <div className="program-actions">
        <Button type="submit" onClick={openCreate}>
          <Plus size={18} />
          {t('roadmap.new')}
        </Button>
      </div>
      {edit && (
        <Card className="program-section">
          <h2>{edit.id ? t('roadmap.edit') : t('roadmap.new')}</h2>
          <form
            key={edit.id || 'new'}
            className="program-form"
            onSubmit={(e) => {
              e.preventDefault()
              const f = new FormData(e.currentTarget)
              const title = String(edit.title || '').trim()
              const description = edit.description || ''
              if (!title) {
                toast.error(t('roadmap.titleRequired'))
                setLang('pt')
                return
              }
              if (isRichTextEmpty(description)) {
                toast.error(t('roadmap.descriptionRequired'))
                setLang('pt')
                return
              }
              void action
                .run(
                  () =>
                    programsApi.saveRoadmap(
                      {
                        title,
                        title_en: String(edit.title_en || '').trim(),
                        title_es: String(edit.title_es || '').trim(),
                        description,
                        description_en: edit.description_en || '',
                        description_es: edit.description_es || '',
                        category: String(f.get('category')),
                        status: String(f.get('status')),
                        progress: Number(f.get('progress')),
                        target_date: String(f.get('target_date')) || null,
                        published: f.has('published'),
                        order: Number(f.get('order')),
                      },
                      edit.id,
                    ),
                  t('roadmap.saved'),
                  [['staff-roadmap'], ['roadmap']],
                )
                .then((ok) => {
                  if (ok) {
                    setLang('pt')
                    setEdit(null)
                  }
                })
            }}
          >
            <Tabs
              id="roadmap-lang"
              label={t('roadmap.language')}
              value={lang}
              onChange={setLang}
              items={LANGS.map((id) => ({ id, label: t(`roadmap.languages.${id}`) }))}
            />
            <div
              className="admin-cms-langs"
              role="tabpanel"
              id={`roadmap-lang-panel-${lang}`}
              aria-labelledby={`roadmap-lang-tab-${lang}`}
            >
              {lang === 'pt' ? (
                <>
                  <label>
                    {t('roadmap.titleField')}
                    <input
                      required
                      maxLength={160}
                      value={edit.title || ''}
                      onChange={(event) => patch({ title: event.target.value })}
                    />
                  </label>
                  <label>
                    {t('roadmap.descriptionField')}
                    <RichTextEditor
                      value={edit.description || ''}
                      onChange={(html) => patch({ description: html })}
                      required
                      aria-label={t('roadmap.descriptionField')}
                    />
                  </label>
                </>
              ) : null}
              {lang === 'en' ? (
                <>
                  <label>
                    {t('roadmap.titleField')}
                    <input
                      maxLength={160}
                      value={edit.title_en || ''}
                      onChange={(event) => patch({ title_en: event.target.value })}
                    />
                  </label>
                  <label>
                    {t('roadmap.descriptionField')}
                    <RichTextEditor
                      value={edit.description_en || ''}
                      onChange={(html) => patch({ description_en: html })}
                      aria-label={t('roadmap.descriptionField')}
                    />
                  </label>
                </>
              ) : null}
              {lang === 'es' ? (
                <>
                  <label>
                    {t('roadmap.titleField')}
                    <input
                      maxLength={160}
                      value={edit.title_es || ''}
                      onChange={(event) => patch({ title_es: event.target.value })}
                    />
                  </label>
                  <label>
                    {t('roadmap.descriptionField')}
                    <RichTextEditor
                      value={edit.description_es || ''}
                      onChange={(html) => patch({ description_es: html })}
                      aria-label={t('roadmap.descriptionField')}
                    />
                  </label>
                </>
              ) : null}
            </div>
            <div className="program-fields">
              <label>
                {t('roadmap.category')}
                <input
                  name="category"
                  required
                  maxLength={60}
                  defaultValue={edit.category || 'Servidor'}
                />
              </label>
              <label>
                {t('roadmap.stage')}
                <select name="status" defaultValue={edit.status}>
                  <option value="planned">{t('roadmap.statusPlanned')}</option>
                  <option value="progress">{t('roadmap.statusProgress')}</option>
                  <option value="completed">{t('roadmap.statusCompleted')}</option>
                </select>
              </label>
              <label>
                {t('roadmap.progress')}
                <input
                  name="progress"
                  type="number"
                  min={0}
                  max={100}
                  required
                  defaultValue={edit.progress}
                />
              </label>
              <label>
                {t('roadmap.targetDate')}
                <input
                  name="target_date"
                  type="date"
                  defaultValue={edit.target_date || ''}
                />
              </label>
              <label>
                {t('roadmap.order')}
                <input
                  name="order"
                  type="number"
                  min={0}
                  defaultValue={edit.order || 0}
                />
              </label>
            </div>
            <label className="program-check">
              <input
                name="published"
                type="checkbox"
                defaultChecked={edit.published}
              />
              {t('roadmap.publish')}
            </label>
            <div className="program-actions">
              <Button type="submit" disabled={action.busy}>
                {t('roadmap.save')}
              </Button>
              <Button
                className="ghost"
                type="button"
                onClick={() => {
                  setLang('pt')
                  setEdit(null)
                }}
              >
                {t('roadmap.cancel')}
              </Button>
            </div>
          </form>
        </Card>
      )}
      {query.isPending && <Loading />}
      <div className="program-grid">
        {query.data?.map((r) => (
          <Card as="article" className="program-section" key={r.id}>
            <Status value={r.status} />
            <h2>{r.title}</h2>
            <p className="muted">
              {t('roadmap.summary', {
                category: r.category,
                progress: r.progress,
                state: r.published ? t('roadmap.published') : t('roadmap.draft'),
              })}
            </p>
            <div className="program-actions">
              <Button type="submit" className="ghost" onClick={() => openEdit(r)}>
                <Pencil size={16} />
                {t('roadmap.editAction')}
              </Button>
              {remove === r.id ? (
                <>
                  <Button type="submit"

                    disabled={action.busy}
                    onClick={() =>
                      void action
                        .run(
                          () => programsApi.deleteRoadmap(r.id),
                          t('roadmap.removed'),
                          [['staff-roadmap'], ['roadmap']],
                        )
                        .then(() => setRemove(null))
                    }
                  >
                    {t('roadmap.confirmDelete')}
                  </Button>
                  <Button type="submit" className="ghost" onClick={() => setRemove(null)}>
                    {t('roadmap.cancel')}
                  </Button>
                </>
              ) : (
                <Button type="submit"
                  className="ghost"
                  onClick={() => setRemove(r.id)}
                  aria-label={t('roadmap.delete', { title: r.title })}
                >
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
      {query.data?.length === 0 && (
        <Empty>{t('roadmap.empty')}</Empty>
      )}
    </div>
  )
}
