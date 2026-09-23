import { Card } from '../../components/ui/Card'
import { apiErrorMessage } from '../../lib/errors'
import { Field } from '../../components/ui/Field'
import { ButtonLink } from '../../components/ui/Button'
import { useEffect, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { CalendarClock, ExternalLink, Globe, LockKeyhole } from 'lucide-react'
import toast from 'react-hot-toast'
import { staffApi, type ApiPanelSettings } from '../../services/api'
import { fromDatetimeLocal, toDatetimeLocal } from '../../lib/datetime'
import { AdminHeader, AdminSaveBar } from './AdminChrome'

function panelBase(data: ApiPanelSettings) {
  const { id: _id, is_active: _active, ...rest } = data
  return rest
}

export function AdminComingSoonPage() {
  const { t } = useTranslation('admin')
  const queryClient = useQueryClient()
  const panel = useQuery({ queryKey: ['staff-panel'], queryFn: staffApi.panel })
  const [comingSoon, setComingSoon] = useState(false)
  const [allowRegistration, setAllowRegistration] = useState(true)
  const [staffOnly, setStaffOnly] = useState(false)
  const [allowL2Registration, setAllowL2Registration] = useState(true)
  const [comingSoonShowInfo, setComingSoonShowInfo] = useState(false)
  const [comingSoonShowChampions, setComingSoonShowChampions] = useState(true)
  const [comingSoonTitle, setComingSoonTitle] = useState('')
  const [comingSoonSubtitle, setComingSoonSubtitle] = useState('')
  const [comingSoonAt, setComingSoonAt] = useState('')
  const [whatsappUrl, setWhatsappUrl] = useState('')
  const [facebookUrl, setFacebookUrl] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [discordUrl, setDiscordUrl] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const data = panel.data
    if (!data) return
    setComingSoon(data.coming_soon)
    setAllowRegistration(data.allow_registration !== false)
    setStaffOnly(data.staff_only_login)
    setAllowL2Registration(data.allow_l2_registration !== false)
    setComingSoonShowInfo(Boolean(data.coming_soon_show_info))
    setComingSoonShowChampions(data.coming_soon_show_champions !== false)
    setComingSoonTitle(data.coming_soon_title || data.name || '')
    setComingSoonSubtitle(data.coming_soon_subtitle || '')
    setComingSoonAt(toDatetimeLocal(data.coming_soon_at))
    setWhatsappUrl(data.whatsapp_url || '')
    setFacebookUrl(data.facebook_url || '')
    setInstagramUrl(data.instagram_url || '')
    setYoutubeUrl(data.youtube_url || '')
    setDiscordUrl(data.discord_url || '')
  }, [panel.data])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!panel.data) return
    setSaving(true)
    try {
      await staffApi.savePanel({
        ...panelBase(panel.data),
        coming_soon: comingSoon,
        allow_registration: allowRegistration,
        staff_only_login: staffOnly,
        allow_l2_registration: allowL2Registration,
        coming_soon_show_info: comingSoonShowInfo,
        coming_soon_show_champions: comingSoonShowChampions,
        coming_soon_title: comingSoonTitle,
        coming_soon_subtitle: comingSoonSubtitle,
        coming_soon_at: fromDatetimeLocal(comingSoonAt),
        whatsapp_url: whatsappUrl,
        facebook_url: facebookUrl,
        instagram_url: instagramUrl,
        youtube_url: youtubeUrl,
        discord_url: discordUrl,
      })
      toast.success(t('comingSoonAdmin.saved'))
      await queryClient.invalidateQueries({ queryKey: ['staff-panel'] })
      await queryClient.invalidateQueries({ queryKey: ['server-info'] })
    } catch (error) {
      toast.error(apiErrorMessage(error, t('comingSoonAdmin.saveError')))
    } finally {
      setSaving(false)
    }
  }

  const serverName = panel.data?.name || ''
  const serverSlogan = panel.data?.slogan || ''
  const serverDescription = panel.data?.description || ''

  return (
    <div className="account-page">
      <AdminHeader
        kicker={t('comingSoonAdmin.kicker')}
        title={t('comingSoonAdmin.title')}
        description={t('comingSoonAdmin.description')}
      />
      <form className="admin-server-form" onSubmit={onSubmit}>
        <Card className="admin-config-section admin-access-section">
          <header>
            <span><LockKeyhole /></span>
            <div>
              <span className="panel-eyebrow">{t('server.accessEyebrow')}</span>
              <h2>{t('server.accessTitle')}</h2>
              <p>{t('server.accessDescription')}</p>
            </div>
          </header>
          <div className="admin-toggle-list">
            <label className="admin-toggle">
              <input type="checkbox" checked={comingSoon} onChange={(e) => setComingSoon(e.target.checked)} />
              <span className="admin-toggle-control" aria-hidden="true"><i /></span>
              <span><strong>{t('server.enableComingSoon')}</strong><small>{t('server.enableComingSoonHint')}</small></span>
              <b>{comingSoon ? t('server.active') : t('server.inactive')}</b>
            </label>
            <label className={`admin-toggle${!comingSoon ? ' is-disabled' : ''}`}>
              <input
                type="checkbox"
                checked={allowRegistration}
                disabled={!comingSoon}
                onChange={(e) => setAllowRegistration(e.target.checked)}
              />
              <span className="admin-toggle-control" aria-hidden="true"><i /></span>
              <span><strong>{t('server.allowRegistration')}</strong><small>{t('server.allowRegistrationHint')}</small></span>
              <b>{allowRegistration && comingSoon ? t('server.active') : t('server.inactive')}</b>
            </label>
            <label className={`admin-toggle${!comingSoon ? ' is-disabled' : ''}`}>
              <input type="checkbox" checked={staffOnly} disabled={!comingSoon} onChange={(e) => setStaffOnly(e.target.checked)} />
              <span className="admin-toggle-control" aria-hidden="true"><i /></span>
              <span><strong>{t('server.staffOnly')}</strong><small>{t('server.staffOnlyHint')}</small></span>
              <b>{staffOnly && comingSoon ? t('server.active') : t('server.inactive')}</b>
            </label>
            <label className={`admin-toggle${!comingSoon ? ' is-disabled' : ''}`}>
              <input
                type="checkbox"
                checked={allowL2Registration}
                disabled={!comingSoon}
                onChange={(e) => setAllowL2Registration(e.target.checked)}
              />
              <span className="admin-toggle-control" aria-hidden="true"><i /></span>
              <span><strong>{t('server.allowL2Registration')}</strong><small>{t('server.allowL2RegistrationHint')}</small></span>
              <b>{allowL2Registration && comingSoon ? t('server.active') : t('server.inactive')}</b>
            </label>
            <label className={`admin-toggle${!comingSoon ? ' is-disabled' : ''}`}>
              <input
                type="checkbox"
                checked={comingSoonShowInfo}
                disabled={!comingSoon}
                onChange={(e) => setComingSoonShowInfo(e.target.checked)}
              />
              <span className="admin-toggle-control" aria-hidden="true"><i /></span>
              <span>
                <strong>{t('server.showInfoOnComingSoon')}</strong>
                <small>{t('server.showInfoOnComingSoonHint')}</small>
              </span>
              <b>{comingSoonShowInfo && comingSoon ? t('server.active') : t('server.inactive')}</b>
            </label>
            <label className={`admin-toggle${!comingSoon ? ' is-disabled' : ''}`}>
              <input
                type="checkbox"
                checked={comingSoonShowChampions}
                disabled={!comingSoon}
                onChange={(e) => setComingSoonShowChampions(e.target.checked)}
              />
              <span className="admin-toggle-control" aria-hidden="true"><i /></span>
              <span>
                <strong>{t('server.showChampionsOnComingSoon')}</strong>
                <small>{t('server.showChampionsOnComingSoonHint')}</small>
              </span>
              <b>{comingSoonShowChampions && comingSoon ? t('server.active') : t('server.inactive')}</b>
            </label>
          </div>
        </Card>

        <Card className={`admin-config-section${!comingSoon ? ' is-disabled' : ''}`}>
          <header>
            <span><CalendarClock /></span>
            <div>
              <span className="panel-eyebrow">{t('server.launchEyebrow')}</span>
              <h2>{t('server.launchTitle')}</h2>
              <p>{t('server.launchDescription')}</p>
            </div>
          </header>
          <div className="account-form-fields admin-launch-fields">
            <Field>
              <span>
                {t('server.launchHeadline')}
                <small>{t('server.launchHeadlineHint')}</small>
              </span>
              <input
                value={comingSoonTitle}
                disabled={!comingSoon}
                onChange={(e) => setComingSoonTitle(e.target.value)}
                placeholder={serverName || t('server.launchHeadlinePlaceholder')}
                required={comingSoon}
              />
            </Field>
            <Field>
              <span>
                {t('server.launchDate')}
                <small>{t('server.launchDateHint')}</small>
              </span>
              <input
                type="datetime-local"
                value={comingSoonAt}
                disabled={!comingSoon}
                onChange={(e) => setComingSoonAt(e.target.value)}
                required={comingSoon}
              />
            </Field>
            <Field className="admin-launch-subtitle">
              <span>
                {t('server.launchSubtitle')}
                <small>{t('server.launchSubtitleHint')}</small>
              </span>
              <textarea
                value={comingSoonSubtitle}
                disabled={!comingSoon}
                onChange={(e) => setComingSoonSubtitle(e.target.value)}
                placeholder={serverSlogan || serverDescription || t('server.launchSubtitlePlaceholder')}
                rows={2}
              />
            </Field>
          </div>
          {comingSoon ? (
            <div className="admin-coming-soon-preview" style={{ marginTop: 12 }}>
              <ButtonLink to="/" target="_blank" rel="noreferrer" variant="secondary" size="sm">
                <ExternalLink aria-hidden="true" size={14} />
                {t('server.viewLaunchPage')}
              </ButtonLink>
            </div>
          ) : null}
        </Card>

        <Card className={`admin-config-section${!comingSoon ? ' is-disabled' : ''}`}>
          <header>
            <span><Globe /></span>
            <div>
              <span className="panel-eyebrow">{t('comingSoonAdmin.socialEyebrow')}</span>
              <h2>{t('comingSoonAdmin.socialTitle')}</h2>
              <p>{t('comingSoonAdmin.socialDescription')}</p>
            </div>
          </header>
          <p className="muted" style={{ margin: '0 0 12px' }}>{t('server.socialHint')}</p>
          <div className="account-form-fields">
            <Field>{t('server.whatsappUrl')}<input value={whatsappUrl} disabled={!comingSoon} onChange={(e) => setWhatsappUrl(e.target.value)} placeholder="https://wa.me/55..." /></Field>
            <Field>{t('server.facebookUrl')}<input value={facebookUrl} disabled={!comingSoon} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="https://facebook.com/..." /></Field>
            <Field>{t('server.instagramUrl')}<input value={instagramUrl} disabled={!comingSoon} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/..." /></Field>
            <Field>{t('server.youtubeUrl')}<input value={youtubeUrl} disabled={!comingSoon} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/@..." /></Field>
            <Field>{t('server.discordUrl')}<input value={discordUrl} disabled={!comingSoon} onChange={(e) => setDiscordUrl(e.target.value)} placeholder="https://discord.gg/..." /></Field>
          </div>
        </Card>

        <Card as="div" className="admin-server-actions">
          <span>
            <strong>{t('comingSoonAdmin.actionsTitle')}</strong>
            <small>{t('comingSoonAdmin.actionsHint')}</small>
          </span>
          <AdminSaveBar saving={saving} />
        </Card>
      </form>
    </div>
  )
}
