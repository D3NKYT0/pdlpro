import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { contentApi, type ApiDenkynhoCareResult, type ApiDenkynhoProfile, type DenkynhoAppearance } from '../../services/domain/content.service'
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
  const action = useAsyncAction()
  const pt = language === 'pt'
  const backgrounds = profile.unlocks?.filter(item => item.slot === 'scene') ?? []
  const [sceneIndex, setSceneIndex] = useState(() => Math.max(0, backgrounds.findIndex(item => item.id === profile.appearance?.scene)))
  const index = Math.min(sceneIndex, Math.max(0, backgrounds.length - 1))
  const visibleItems = [...backgrounds.slice(index, index + 1), ...(profile.unlocks?.filter(item => item.slot !== 'scene') ?? [])]
  const gains = careResult && !careResult.replayed ? careResult : null
  async function equip(slot: keyof DenkynhoAppearance, itemId: string) {
    await action.run(async () => {
      const updated = await contentApi.equipDenkynho(slot, itemId)
      if (!updated || !updated.appearance || !Number.isFinite(updated.level) || !updated.attributes) throw new Error(pt ? 'Resposta inválida do armário.' : 'Invalid wardrobe response.')
      onProfileChange(updated)
    })
  }
  const attributeLabels = pt ? { satiety: 'Saciedade', energy: 'Energia', happiness: 'Alegria', hygiene: 'Higiene' } : { satiety: 'Satiety', energy: 'Energy', happiness: 'Happiness', hygiene: 'Hygiene' }
  return <section className="denk-progress" aria-label={pt ? 'Evolução e armário' : 'Progress and wardrobe'}>
    {gains && <div role="status" className="denk-care-gains">
      <strong>+{gains.xp_gained} XP{gains.level_up ? (pt ? ` · Novo nível: ${gains.level}!` : ` · New level: ${gains.level}!`) : ''}</strong>
      {Object.entries(gains.attributes_gained ?? {}).map(([key, value]) => <small key={key}>{attributeLabels[key as keyof typeof attributeLabels]} {value > 0 ? '+' : ''}{value}</small>)}
      {gains.unlocked?.map(id => <span key={id}>{pt ? 'Desbloqueado: ' : 'Unlocked: '}{profile.unlocks?.find(item => item.id === id)?.label[language] ?? id}</span>)}
    </div>}
    <strong>{pt ? 'Seu próximo desbloqueio' : 'Your next unlock'}</strong>
    <p>{profile.unlocks?.find(item => !item.unlocked) ? (() => { const item = profile.unlocks!.find(item => !item.unlocked)!; return `${item.label[language]} · ${pt ? 'Nível' : 'Level'} ${item.level}` })() : pt ? 'Todos os desbloqueios disponíveis conquistados.' : 'All available unlocks earned.'}</p>
    <progress aria-label={pt ? 'Progresso para o próximo nível' : 'Progress toward next level'} value={profile.experience} max={profile.experience_next} />
    <h3>{pt ? 'Cenários e acessórios' : 'Scenes and accessories'}</h3>
    {backgrounds.length > 0 && <div className="denk-scene-navigation" role="group" aria-label={pt ? 'Navegar pelos cenários' : 'Browse scenes'}>
      <IconButton label={pt ? 'Cenário anterior' : 'Previous scene'} size="sm" variant="secondary" disabled={backgrounds.length < 2} onClick={() => setSceneIndex((index - 1 + backgrounds.length) % backgrounds.length)}><ChevronLeft aria-hidden="true" /></IconButton>
      <span aria-live="polite">{pt ? 'Cenário' : 'Scene'} {index + 1} / {backgrounds.length}</span>
      <IconButton label={pt ? 'Próximo cenário' : 'Next scene'} size="sm" variant="secondary" disabled={backgrounds.length < 2} onClick={() => setSceneIndex((index + 1) % backgrounds.length)}><ChevronRight aria-hidden="true" /></IconButton>
    </div>}
    <div className="denk-wardrobe">
      {visibleItems.map(item => <div key={item.id} className={item.slot === 'scene' ? 'denk-scene-option' : undefined}>
        {item.slot === 'scene' && knownScene(item.id) && <><img src={scenes[knownScene(item.id)!].src} alt="" loading="lazy" /><small>{scenes[knownScene(item.id)!][language]}</small></>}
        <span>{item.label[language]} <small>· {pt ? 'Nível' : 'Level'} {item.level}</small></span>
        {item.slot === 'interaction' ? <small>{item.unlocked ? (pt ? 'Disponível nas atividades' : 'Available in activities') : (pt ? 'Bloqueado' : 'Locked')}</small> : <Button size="sm" variant="secondary" disabled={disabled || action.pending || !item.unlocked} aria-pressed={profile.appearance?.[item.slot] === item.id} onClick={() => void equip(item.slot as keyof DenkynhoAppearance, profile.appearance?.[item.slot as keyof DenkynhoAppearance] === item.id ? '' : item.id)}>{profile.appearance?.[item.slot] === item.id ? (pt ? 'Retirar' : 'Remove') : (pt ? 'Usar' : 'Equip')} {item.label[language]}</Button>}
      </div>)}
    </div>
    <ErrorNotice error={action.error} />
  </section>
}
