import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { contentApi, type ApiDenkynhoCareResult, type ApiDenkynhoProfile, type DenkynhoAppearance, type DenkynhoUnlock } from '../../services/api'
import { useAsyncAction } from '../../hooks/useAsyncAction'
import { Button, IconButton } from '../ui/Button'
import { ErrorNotice } from '../ui/Feedback'
import type { HelpLanguage } from './personality'
import './pet-progress.css'
import { knownScene, scenes } from './scenes'

/** Shows server-confirmed care gains and equips only unlocked cosmetic items. */
export function PetProgress({ profile, language, careResult, disabled = false, onProfileChange }: {
  profile: ApiDenkynhoProfile; language: HelpLanguage; careResult?: ApiDenkynhoCareResult | null; disabled?: boolean; onProfileChange: (profile: ApiDenkynhoProfile) => void
}) {
  const { t } = useTranslation('help')
  const action = useAsyncAction()
  /** O catálogo do servidor traz apenas pt/en; outros idiomas caem no inglês. */
  const unlockLabel = (label: DenkynhoUnlock['label']) => (label as Partial<Record<HelpLanguage, string>>)[language] ?? label.en ?? label.pt
  const backgrounds = profile.unlocks?.filter(item => item.slot === 'scene') ?? []
  const [sceneIndex, setSceneIndex] = useState(() => Math.max(0, backgrounds.findIndex(item => item.id === profile.appearance?.scene)))
  const index = Math.min(sceneIndex, Math.max(0, backgrounds.length - 1))
  const visibleItems = [...backgrounds.slice(index, index + 1), ...(profile.unlocks?.filter(item => item.slot !== 'scene') ?? [])]
  const gains = careResult && !careResult.replayed ? careResult : null
  async function equip(slot: keyof DenkynhoAppearance, itemId: string) {
    await action.run(async () => {
      const updated = await contentApi.equipDenkynho(slot, itemId)
      if (!updated || !updated.appearance || !Number.isFinite(updated.level) || !updated.attributes) throw new Error(t('progress.wardrobeError'))
      onProfileChange(updated)
    })
  }
  return <section className="denk-progress" aria-label={t('progress.section')}>
    {gains && <div role="status" className="denk-care-gains">
      <strong>+{gains.xp_gained} XP{gains.level_up ? ` · ${t('progress.newLevel', { level: gains.level })}` : ''}</strong>
      {Object.entries(gains.attributes_gained ?? {}).map(([key, value]) => <small key={key}>{t(`page.${key}`)} {value > 0 ? '+' : ''}{value}</small>)}
      {gains.unlocked?.map(id => <span key={id}>{t('progress.unlocked')} {(() => { const item = profile.unlocks?.find(item => item.id === id); return item ? unlockLabel(item.label) : id })()}</span>)}
    </div>}
    <strong>{t('progress.nextUnlock')}</strong>
    <p>{profile.unlocks?.find(item => !item.unlocked) ? (() => { const item = profile.unlocks!.find(item => !item.unlocked)!; return `${unlockLabel(item.label)} · ${t('progress.level')} ${item.level}` })() : t('progress.allUnlocked')}</p>
    <progress aria-label={t('progress.xpBar')} value={profile.experience} max={profile.experience_next} />
    <h3>{t('progress.wardrobe')}</h3>
    {backgrounds.length > 0 && <div className="denk-scene-navigation" role="group" aria-label={t('progress.browseScenes')}>
      <IconButton label={t('progress.prevScene')} size="sm" variant="secondary" disabled={backgrounds.length < 2} onClick={() => setSceneIndex((index - 1 + backgrounds.length) % backgrounds.length)}><ChevronLeft aria-hidden="true" /></IconButton>
      <span aria-live="polite">{t('progress.sceneOf', { current: index + 1, total: backgrounds.length })}</span>
      <IconButton label={t('progress.nextScene')} size="sm" variant="secondary" disabled={backgrounds.length < 2} onClick={() => setSceneIndex((index + 1) % backgrounds.length)}><ChevronRight aria-hidden="true" /></IconButton>
    </div>}
    <div className="denk-wardrobe">
      {visibleItems.map(item => <div key={item.id} className={item.slot === 'scene' ? 'denk-scene-option' : undefined}>
        {item.slot === 'scene' && knownScene(item.id) && <><img src={scenes[knownScene(item.id)!].src} alt="" loading="lazy" /><small>{scenes[knownScene(item.id)!][language]}</small></>}
        <span>{unlockLabel(item.label)} <small>· {t('progress.level')} {item.level}</small></span>
        {item.slot === 'interaction' ? <small>{item.unlocked ? t('progress.inActivities') : t('progress.locked')}</small> : <Button size="sm" variant="secondary" disabled={disabled || action.pending || !item.unlocked} aria-pressed={profile.appearance?.[item.slot] === item.id} onClick={() => void equip(item.slot as keyof DenkynhoAppearance, profile.appearance?.[item.slot as keyof DenkynhoAppearance] === item.id ? '' : item.id)}>{profile.appearance?.[item.slot] === item.id ? t('progress.remove') : t('progress.equip')} {unlockLabel(item.label)}</Button>}
      </div>)}
    </div>
    <ErrorNotice error={action.error} />
  </section>
}
