import { useLocation } from 'react-router-dom'
import { CharacterCreationSettings, defaultCharacterCreation } from '../../components/character/CharacterCreationSettings'
import { CoordinateInput } from '../../components/character/CoordinateInput'
import { Toggle } from '../../components/ui/Toggle'
import { Card } from '../../components/ui/Card'
import { apiErrorMessage } from '../../lib/errors'
import { ErrorNotice, LoadingState } from '../../components/ui/Feedback'
import { Field } from '../../components/ui/Field'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { FileText, Gauge, Globe, ServerCog, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { staffApi, type ApiPanelSettings } from '../../services/api'
import { AdminHeader, AdminSaveBar } from './AdminChrome'

function panelBase(data: ApiPanelSettings) {
  const { id: _id, is_active: _active, ...rest } = data
  return rest
}

export function AdminServerPage() {
  const { t } = useTranslation('admin')
  const queryClient = useQueryClient()
  const { hash } = useLocation()
  const creationOnly = hash === '#character-creation'
  const creationSection = useRef<HTMLElement>(null)
  const panel = useQuery({ queryKey: ['staff-panel'], queryFn: staffApi.panel })
  const [name, setName] = useState('')
  const [slogan, setSlogan] = useState('')
  const [description, setDescription] = useState('')
  const [chronicle, setChronicle] = useState('')
  const [xp, setXp] = useState('x1')
  const [sp, setSp] = useState('x1')
  const [adena, setAdena] = useState('x1')
  const [drop, setDrop] = useState('x1')
  const [spoil, setSpoil] = useState('x1')
  const [safe, setSafe] = useState('+3')
  const [maxEnchant, setMaxEnchant] = useState('+16')
  const [maxLevel, setMaxLevel] = useState('80')
  const [features, setFeatures] = useState('')
  const [pvp, setPvp] = useState('')
  const [start, setStart] = useState('')
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [ogImage, setOgImage] = useState('')
  const [trailerYoutubeId, setTrailerYoutubeId] = useState('')
  const [saving, setSaving] = useState(false)
  const [unstuckLocation, setUnstuckLocation] = useState<{ x: number; y: number; z: number } | null>(null)
  const [characterCreation, setCharacterCreation] = useState(defaultCharacterCreation)

  useEffect(() => {
    const data = panel.data
    if (!data) return
    setUnstuckLocation(data.unstuck_location ?? null)
    setCharacterCreation(data.character_creation ?? defaultCharacterCreation())
    setName(data.name)
    setSlogan(data.slogan)
    setDescription(data.description)
    setChronicle(data.chronicle)
    setXp(data.rates.xp || 'x1')
    setSp(data.rates.sp || 'x1')
    setAdena(data.rates.adena || 'x1')
    setDrop(data.rates.drop || 'x1')
    setSpoil(data.rates.spoil || 'x1')
    setSafe(data.enchant.safe || '+3')
    setMaxEnchant(data.enchant.max || '+16')
    setMaxLevel(String(data.max_level))
    setFeatures((data.features ?? []).join('\n'))
    setPvp(data.notes.pvp || '')
    setStart(data.notes.start || '')
    setSeoTitle(data.seo_title || '')
    setSeoDescription(data.seo_description || '')
    setOgImage(data.og_image || '')
    setTrailerYoutubeId(data.trailer_youtube_id || '')
  }, [panel.data])

  useEffect(() => {
    if (hash !== '#character-creation' || panel.isPending) return
    const frame = requestAnimationFrame(() => {
      creationSection.current?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [hash, panel.isPending])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!panel.data || saving) return
    setSaving(true)
    try {
      await staffApi.savePanel({
        ...panelBase(panel.data),
        character_creation: characterCreation,
        unstuck_location: unstuckLocation,
        name,
        slogan,
        description,
        chronicle,
        rates: { xp, sp, adena, drop, spoil },
        enchant: { safe, max: maxEnchant },
        max_level: Number(maxLevel),
        features: features.split('\n').map((line) => line.trim()).filter(Boolean),
        notes: { pvp, start },
        seo_title: seoTitle,
        seo_description: seoDescription,
        og_image: ogImage,
        trailer_youtube_id: trailerYoutubeId,
      })
      toast.success(t('server.saved'))
      await queryClient.invalidateQueries({ queryKey: ['staff-panel'] })
      await queryClient.invalidateQueries({ queryKey: ['server-info'] })
    } catch (error) {
      toast.error(apiErrorMessage(error, t('server.saveError')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="account-page">
      <AdminHeader kicker={t('server.kicker')} title={t(creationOnly ? 'characterCreation.title' : 'server.title')} description={t(creationOnly ? 'characterCreation.description' : 'server.description')} />
      {panel.isPending && <LoadingState />}
      <ErrorNotice error={panel.error} onRetry={() => { void panel.refetch() }} />
      <form className="admin-server-form" onSubmit={onSubmit}>
        {!creationOnly && <>
        <Card className="admin-config-section">
          <header><span><ServerCog /></span><div><span className="panel-eyebrow">{t('server.identityEyebrow')}</span><h2>{t('server.identityTitle')}</h2><p>{t('server.identityDescription')}</p></div></header>
          <div className="account-form-fields">
            <Field>{t('server.name')}<input value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field>{t('server.slogan')}<input value={slogan} onChange={(e) => setSlogan(e.target.value)} /></Field>
          </div>
          <Field>{t('server.descriptionField')}<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></Field>
          <div className="account-form-fields">
            <Field>{t('server.chronicle')}<input value={chronicle} onChange={(e) => setChronicle(e.target.value)} /></Field>
            <Field>{t('server.maxLevel')}<input type="number" min="1" value={maxLevel} onChange={(e) => setMaxLevel(e.target.value)} /></Field>
          </div>
        </Card>

        <Card className="admin-config-section">
          <header><span><Globe /></span><div><span className="panel-eyebrow">{t('server.seoEyebrow')}</span><h2>{t('server.seoTitle')}</h2><p>{t('server.seoDescription')}</p></div></header>
          <div className="account-form-fields">
            <Field>{t('server.seoTitleField')}<input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder={name} /></Field>
            <Field>{t('server.ogImage')}<input value={ogImage} onChange={(e) => setOgImage(e.target.value)} placeholder={t('server.ogImagePlaceholder')} /></Field>
          </div>
          <Field>{t('server.seoDescriptionField')}<textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={3} placeholder={description} /></Field>
          <Field>{t('server.trailerYoutubeId')}<input value={trailerYoutubeId} onChange={(e) => setTrailerYoutubeId(e.target.value)} placeholder="Mm19W1PKMFQ" /></Field>
        </Card>

        <div className="admin-server-columns">
          <Card className="admin-config-section">
            <header><span><Gauge /></span><div><span className="panel-eyebrow">{t('server.ratesEyebrow')}</span><h2>{t('server.ratesTitle')}</h2><p>{t('server.ratesDescription')}</p></div></header>
            <div className="admin-server-rate-grid">
              <Field>{t('server.xp')}<input value={xp} onChange={(e) => setXp(e.target.value)} /></Field>
              <Field>{t('server.sp')}<input value={sp} onChange={(e) => setSp(e.target.value)} /></Field>
              <Field>{t('server.adena')}<input value={adena} onChange={(e) => setAdena(e.target.value)} /></Field>
              <Field>{t('server.drop')}<input value={drop} onChange={(e) => setDrop(e.target.value)} /></Field>
              <Field>{t('server.spoil')}<input value={spoil} onChange={(e) => setSpoil(e.target.value)} /></Field>
            </div>
          </Card>

          <Card className="admin-config-section">
            <header><span><Sparkles /></span><div><span className="panel-eyebrow">{t('server.enchantEyebrow')}</span><h2>{t('server.enchantTitle')}</h2><p>{t('server.enchantDescription')}</p></div></header>
            <div className="account-form-fields">
              <Field>{t('server.safeEnchant')}<input value={safe} onChange={(e) => setSafe(e.target.value)} /></Field>
              <Field>{t('server.maxEnchant')}<input value={maxEnchant} onChange={(e) => setMaxEnchant(e.target.value)} /></Field>
            </div>
          </Card>
        </div>

        <Card className="admin-config-section">
          <header><span><FileText /></span><div><span className="panel-eyebrow">{t('server.contentEyebrow')}</span><h2>{t('server.contentTitle')}</h2><p>{t('server.contentDescription')}</p></div></header>
          <Field>{t('server.features')} <small>{t('server.featuresHint')}</small><textarea value={features} onChange={(e) => setFeatures(e.target.value)} rows={4} /></Field>
          <div className="account-form-fields">
            <Field>{t('server.pvpNote')}<textarea value={pvp} onChange={(e) => setPvp(e.target.value)} rows={3} /></Field>
            <Field>{t('server.startNote')}<textarea value={start} onChange={(e) => setStart(e.target.value)} rows={3} /></Field>
          </div>
        </Card>

        </>}
        <section id="character-creation" ref={creationSection} aria-label={t('characterCreation.title')} tabIndex={-1} style={{ scrollMarginTop: '100px' }}>
          <Card>
            <h2>{t('unstuck.title')}</h2>
            <p>{t('unstuck.hint')}</p>
            <Toggle label={t('unstuck.custom')} checked={unstuckLocation !== null} disabled={saving || panel.isPending || panel.isError} onChange={event => setUnstuckLocation(event.target.checked ? { x: 83400, y: 147940, z: -3404 } : null)} />
            {unstuckLocation && <div className="account-form-fields">
              {(['x', 'y', 'z'] as const).map(axis => <Field key={axis} label={t(`unstuck.${axis}`)}><CoordinateInput disabled={saving} value={unstuckLocation[axis]} onChange={value => setUnstuckLocation({ ...unstuckLocation, [axis]: value })} /></Field>)}
            </div>}
          </Card>
          <CharacterCreationSettings value={characterCreation} onChange={setCharacterCreation} disabled={saving || panel.isPending || panel.isError} maxLevel={Number(maxLevel) || 80} />
        </section>

        <Card as="div" className="admin-server-actions"><span><strong>{t('server.actionsTitle')}</strong><small>{t('server.actionsHint')}</small></span><AdminSaveBar saving={saving} /></Card>
      </form>
    </div>
  )
}
