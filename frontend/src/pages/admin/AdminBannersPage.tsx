import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ExternalLink, Eye, Image as ImageIcon, Megaphone, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card } from '../../components/ui/Card'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { Toggle } from '../../components/ui/Toggle'
import { Tabs } from '../../components/ui/Tabs'
import { EmptyState, ErrorNotice, LoadingState } from '../../components/ui/Feedback'
import { useFeedbackAction } from '../../hooks/useFeedbackAction'
import { staffApi, type ApiStaffBanner, type ApiBanner } from '../../services/api'
import { BannerModal } from '../../components/public/BannerModal'
import { AdminHeader, AdminSaveBar } from './AdminChrome'

const LANGS = ['pt', 'en', 'es'] as const

const emptyForm: ApiStaffBanner = {
  title: '',
  title_en: '',
  title_es: '',
  badge: '',
  description: '',
  description_en: '',
  description_es: '',
  image: '',
  link: '',
  link_text: '',
  link_text_en: '',
  link_text_es: '',
  secondary_link: '',
  secondary_link_text: '',
  secondary_link_text_en: '',
  secondary_link_text_es: '',
  display_type: 'popup',
  target_location: 'landing_and_coming_soon',
  dismiss_policy: 'days',
  dismiss_days: 1,
  auto_close: false,
  auto_close_delay: 10,
  show_close_button: true,
  width: 600,
  height: 0,
  is_active: true,
  order: 0,
}

export function AdminBannersPage() {
  const { t } = useTranslation('admin')
  const queryClient = useQueryClient()
  const banners = useQuery({ queryKey: ['staff-banners'], queryFn: staffApi.banners })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ApiStaffBanner>(emptyForm)
  const [langTab, setLangTab] = useState<(typeof LANGS)[number]>('pt')
  const [previewingBanner, setPreviewingBanner] = useState<ApiBanner | null>(null)
  const action = useFeedbackAction()

  function reset() {
    setEditingId(null)
    setForm(emptyForm)
    setLangTab('pt')
  }

  function load(item: ApiStaffBanner) {
    setEditingId(item.id || null)
    setForm({
      ...emptyForm,
      ...item,
      dismiss_days: item.dismiss_days ?? 1,
      auto_close_delay: item.auto_close_delay ?? 10,
      width: item.width ?? 600,
      height: item.height ?? 0,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handlePreviewForm() {
    const previewData: ApiBanner = {
      id: editingId || 'preview-banner',
      title: langTab === 'en' ? (form.title_en || form.title) : langTab === 'es' ? (form.title_es || form.title) : form.title,
      badge: form.badge,
      description: langTab === 'en' ? (form.description_en || form.description) : langTab === 'es' ? (form.description_es || form.description) : form.description,
      image: form.image,
      link: form.link,
      link_text: langTab === 'en' ? (form.link_text_en || form.link_text) : langTab === 'es' ? (form.link_text_es || form.link_text) : form.link_text,
      secondary_link: form.secondary_link,
      secondary_link_text: langTab === 'en' ? (form.secondary_link_text_en || form.secondary_link_text) : langTab === 'es' ? (form.secondary_link_text_es || form.secondary_link_text) : form.secondary_link_text,
      display_type: form.display_type,
      target_location: form.target_location,
      dismiss_policy: form.dismiss_policy,
      dismiss_days: form.dismiss_days,
      auto_close: form.auto_close,
      auto_close_delay: form.auto_close_delay,
      show_close_button: form.show_close_button,
      width: form.width || 600,
      height: form.height || 0,
      order: form.order,
    }
    setPreviewingBanner(previewData)
  }

  function handlePreviewExisting(item: ApiStaffBanner) {
    const previewData: ApiBanner = {
      id: item.id || 'preview-banner',
      title: item.title,
      badge: item.badge,
      description: item.description,
      image: item.image,
      link: item.link,
      link_text: item.link_text,
      secondary_link: item.secondary_link,
      secondary_link_text: item.secondary_link_text,
      display_type: item.display_type,
      target_location: item.target_location,
      dismiss_policy: item.dismiss_policy,
      dismiss_days: item.dismiss_days,
      auto_close: item.auto_close,
      auto_close_delay: item.auto_close_delay,
      show_close_button: item.show_close_button,
      width: item.width,
      height: item.height,
      order: item.order,
    }
    setPreviewingBanner(previewData)
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    await action.run(async () => {
      await staffApi.saveBanner({
        ...form,
        id: editingId || undefined,
        dismiss_days: Number(form.dismiss_days) || 1,
        auto_close_delay: Number(form.auto_close_delay) || 10,
        width: Number(form.width) || 600,
        height: Number(form.height) || 0,
        order: Number(form.order) || 0,
      })
      toast.success(editingId ? t('banners.toast.updated') : t('banners.toast.created'))
      reset()
      await queryClient.invalidateQueries({ queryKey: ['staff-banners'] })
      await queryClient.invalidateQueries({ queryKey: ['public-banners'] })
    }, t('banners.toast.error'))
  }

  async function onDelete(id: string) {
    if (!window.confirm(t('chrome.confirmDelete', 'Tem certeza que deseja excluir?'))) return
    await action.run(async () => {
      await staffApi.deleteBanner(id)
      toast.success(t('banners.toast.deleted'))
      if (editingId === id) reset()
      await queryClient.invalidateQueries({ queryKey: ['staff-banners'] })
      await queryClient.invalidateQueries({ queryKey: ['public-banners'] })
    }, t('banners.toast.error'))
  }

  return (
    <div className="account-page">
      <AdminHeader
        kicker={t('banners.kicker')}
        title={t('banners.title')}
        description={t('banners.description')}
      />

      {/* Editor Form */}
      <form className="card admin-form" onSubmit={onSubmit}>
        <div className="account-section-heading">
          <div>
            <span className="panel-eyebrow">
              {editingId ? t('banners.edit') : t('banners.create')}
            </span>
            <h2>{form.title || t('banners.create')}</h2>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              type="button"
              className="ghost"
              onClick={handlePreviewForm}
              disabled={!form.title && !form.image}
            >
              <Eye size={16} />
              <span>{t('banners.preview')}</span>
            </Button>
          </div>
        </div>

        {/* Multilingual Tabs */}
        <Tabs
          id="banner-lang"
          label={t('banners.tabPt')}
          items={[
            { id: 'pt', label: t('banners.tabPt') },
            { id: 'en', label: t('banners.tabEn') },
            { id: 'es', label: t('banners.tabEs') },
          ]}
          value={langTab}
          onChange={(tab) => setLangTab(tab as (typeof LANGS)[number])}
        />

        {langTab === 'pt' && (
          <div className="account-form-fields">
            <Field>
              {t('banners.fieldTitle')}
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                maxLength={200}
                placeholder="Ex: Inauguração do Servidor"
              />
            </Field>
            <Field>
              {t('banners.fieldBadge')}
              <input
                value={form.badge}
                onChange={(e) => setForm({ ...form, badge: e.target.value })}
                maxLength={60}
                placeholder="Ex: NOVO, EVENTO, PROMO"
              />
            </Field>
            <Field style={{ gridColumn: '1 / -1' }}>
              {t('banners.fieldDescription')}
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Texto explicativo exibido no modal rico..."
              />
            </Field>
            <Field>
              {t('banners.fieldLinkText')}
              <input
                value={form.link_text}
                onChange={(e) => setForm({ ...form, link_text: e.target.value })}
                placeholder="Ex: Participar agora"
              />
            </Field>
            <Field>
              {t('banners.fieldSecondaryLinkText')}
              <input
                value={form.secondary_link_text}
                onChange={(e) => setForm({ ...form, secondary_link_text: e.target.value })}
                placeholder="Ex: Ver regulamento"
              />
            </Field>
          </div>
        )}

        {langTab === 'en' && (
          <div className="account-form-fields">
            <Field>
              {t('banners.fieldTitleEn')}
              <input
                value={form.title_en}
                onChange={(e) => setForm({ ...form, title_en: e.target.value })}
                maxLength={200}
                placeholder="Ex: Grand Opening"
              />
            </Field>
            <Field style={{ gridColumn: '1 / -1' }}>
              {t('banners.fieldDescriptionEn')}
              <textarea
                rows={3}
                value={form.description_en}
                onChange={(e) => setForm({ ...form, description_en: e.target.value })}
                placeholder="English description for the modal..."
              />
            </Field>
            <Field>
              {t('banners.fieldLinkTextEn')}
              <input
                value={form.link_text_en}
                onChange={(e) => setForm({ ...form, link_text_en: e.target.value })}
                placeholder="Ex: Join Now"
              />
            </Field>
            <Field>
              {t('banners.fieldSecondaryLinkTextEn')}
              <input
                value={form.secondary_link_text_en}
                onChange={(e) => setForm({ ...form, secondary_link_text_en: e.target.value })}
                placeholder="Ex: Learn More"
              />
            </Field>
          </div>
        )}

        {langTab === 'es' && (
          <div className="account-form-fields">
            <Field>
              {t('banners.fieldTitleEs')}
              <input
                value={form.title_es}
                onChange={(e) => setForm({ ...form, title_es: e.target.value })}
                maxLength={200}
                placeholder="Ex: Gran Inauguración"
              />
            </Field>
            <Field style={{ gridColumn: '1 / -1' }}>
              {t('banners.fieldDescriptionEs')}
              <textarea
                rows={3}
                value={form.description_es}
                onChange={(e) => setForm({ ...form, description_es: e.target.value })}
                placeholder="Descripción en español..."
              />
            </Field>
            <Field>
              {t('banners.fieldLinkTextEs')}
              <input
                value={form.link_text_es}
                onChange={(e) => setForm({ ...form, link_text_es: e.target.value })}
                placeholder="Ex: Participar ya"
              />
            </Field>
            <Field>
              {t('banners.fieldSecondaryLinkTextEs')}
              <input
                value={form.secondary_link_text_es}
                onChange={(e) => setForm({ ...form, secondary_link_text_es: e.target.value })}
                placeholder="Ex: Más información"
              />
            </Field>
          </div>
        )}

        {/* Display & Behavior Configuration */}
        <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <span className="panel-eyebrow" style={{ display: 'block', marginBottom: '0.75rem' }}>
            {t('banners.tabBehavior')}
          </span>

          <div className="account-form-fields">
            <Field>
              {t('banners.fieldDisplayType')}
              <select
                value={form.display_type}
                onChange={(e) =>
                  setForm({ ...form, display_type: e.target.value as 'normal' | 'popup' })
                }
              >
                <option value="popup">{t('banners.displayTypePopup')}</option>
                <option value="normal">{t('banners.displayTypeNormal')}</option>
              </select>
            </Field>

            <Field>
              {t('banners.fieldTargetLocation')}
              <select
                value={form.target_location}
                onChange={(e) =>
                  setForm({
                    ...form,
                    target_location: e.target.value as ApiStaffBanner['target_location'],
                  })
                }
              >
                <option value="landing_and_coming_soon">{t('banners.locationLandingAndComingSoon')}</option>
                <option value="landing">{t('banners.locationLanding')}</option>
                <option value="coming_soon">{t('banners.locationComingSoon')}</option>
                <option value="panel">{t('banners.locationPanel')}</option>
                <option value="all">{t('banners.locationAll')}</option>
              </select>
            </Field>

            <Field>
              {t('banners.fieldDismissPolicy')}
              <select
                value={form.dismiss_policy}
                onChange={(e) =>
                  setForm({
                    ...form,
                    dismiss_policy: e.target.value as ApiStaffBanner['dismiss_policy'],
                  })
                }
              >
                <option value="days">{t('banners.policyDays')}</option>
                <option value="session">{t('banners.policySession')}</option>
                <option value="always">{t('banners.policyAlways')}</option>
                <option value="dismiss_forever">{t('banners.policyDismissForever')}</option>
              </select>
            </Field>

            {form.dismiss_policy === 'days' && (
              <Field>
                {t('banners.fieldDismissDays')}
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={form.dismiss_days}
                  onChange={(e) => setForm({ ...form, dismiss_days: Number(e.target.value) })}
                />
              </Field>
            )}

            <Field style={{ gridColumn: '1 / -1' }}>
              {t('banners.fieldImage')}
              <input
                type="text"
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
                placeholder="https://... ou /theme/assets/..."
              />
            </Field>

            <Field>
              {t('banners.fieldLink')}
              <input
                type="text"
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
                placeholder="https://... ou rota interna /painel"
              />
            </Field>

            <Field>
              {t('banners.fieldSecondaryLink')}
              <input
                type="text"
                value={form.secondary_link}
                onChange={(e) => setForm({ ...form, secondary_link: e.target.value })}
                placeholder="https://... ou /discord"
              />
            </Field>

            <Field>
              {t('banners.fieldWidth')}
              <input
                type="number"
                min={300}
                max={1400}
                value={form.width}
                onChange={(e) => setForm({ ...form, width: Number(e.target.value) })}
              />
            </Field>

            <Field>
              {t('banners.fieldOrder')}
              <input
                type="number"
                value={form.order}
                onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
              />
            </Field>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginTop: '1rem' }}>
            <Toggle
              label={t('banners.fieldActive')}
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            <Toggle
              label={t('banners.fieldShowCloseButton')}
              checked={form.show_close_button}
              onChange={(e) => setForm({ ...form, show_close_button: e.target.checked })}
            />
            <Toggle
              label={t('banners.fieldAutoClose')}
              checked={form.auto_close}
              onChange={(e) => setForm({ ...form, auto_close: e.target.checked })}
            />
            {form.auto_close && (
              <Field style={{ maxWidth: '180px' }}>
                {t('banners.fieldAutoCloseDelay')}
                <input
                  type="number"
                  min={3}
                  max={60}
                  value={form.auto_close_delay}
                  onChange={(e) => setForm({ ...form, auto_close_delay: Number(e.target.value) })}
                />
              </Field>
            )}
          </div>
        </div>

        <div className="admin-cms-actions" style={{ marginTop: '1.5rem' }}>
          <AdminSaveBar
            saving={action.pending}
            label={editingId ? t('banners.submitUpdate') : t('banners.submitCreate')}
          />
          {editingId ? (
            <Button className="ghost" type="button" onClick={reset}>
              {t('chrome.cancelEdit', 'Cancelar edição')}
            </Button>
          ) : null}
        </div>
      </form>

      {/* Catalog List */}
      <Card style={{ marginTop: '2rem' }}>
        <div className="account-section-heading">
          <div>
            <span className="panel-eyebrow">{t('banners.libraryEyebrow')}</span>
            <h2>{t('banners.libraryTitle')}</h2>
          </div>
        </div>

        {banners.isPending ? <LoadingState /> : null}
        <ErrorNotice error={banners.error} onRetry={() => void banners.refetch()} />

        {!(banners.data ?? []).length && !banners.isPending ? (
          <EmptyState>
            {t('banners.empty')}
          </EmptyState>
        ) : null}

        {(banners.data ?? []).length ? (
          <div className="admin-news-list">
            {(banners.data ?? []).map((item) => (
              <article className="admin-news-item" key={item.id}>
                <span>
                  {item.image ? <ImageIcon size={20} /> : <Megaphone size={20} />}
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                    {item.badge && (
                      <span className="panel-badge-soft" style={{ fontSize: '0.72rem' }}>
                        {item.badge}
                      </span>
                    )}
                    <span className="panel-badge-soft" style={{ fontSize: '0.72rem' }}>
                      {item.display_type === 'popup' ? 'Modal Rico' : 'Flyer Visual'}
                    </span>
                    <span className="panel-badge-soft" style={{ fontSize: '0.72rem' }}>
                      {item.target_location}
                    </span>
                    <span
                      className="panel-badge-soft"
                      style={{
                        fontSize: '0.72rem',
                        color: item.is_active ? '#4ade80' : '#f87171',
                      }}
                    >
                      {item.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  {item.description ? (
                    <p style={{ margin: '0.35rem 0 0', fontSize: '0.84rem', color: '#9c9a96' }}>
                      {item.description}
                    </p>
                  ) : null}
                </div>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <Button
                    className="ghost icon-only"
                    type="button"
                    title={t('banners.preview')}
                    aria-label="preview-banner-item"
                    onClick={() => handlePreviewExisting(item)}
                  >
                    <Eye size={16} />
                  </Button>
                  <Button
                    className="ghost"
                    type="button"
                    onClick={() => load(item)}
                  >
                    {t('chrome.edit', 'Editar')}
                  </Button>
                  <Button
                    className="ghost danger icon-only"
                    type="button"
                    title={t('chrome.delete', 'Excluir')}
                    onClick={() => item.id && onDelete(item.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </Card>

      {/* Live Preview Modal Overlay */}
      {previewingBanner && (
        <BannerModal
          previewBanner={previewingBanner}
          onClosePreview={() => setPreviewingBanner(null)}
        />
      )}
    </div>
  )
}
