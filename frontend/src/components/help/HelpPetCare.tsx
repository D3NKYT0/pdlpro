import type { ApiDenkynhoCareResult, ApiDenkynhoProfile } from '../../services/api'
import { IconButton } from '../ui/Button'
import { Field } from '../ui/Field'
import { ErrorNotice, LoadingState } from '../ui/Feedback'
import { Select } from '../ui/Select'
import { Toggle } from '../ui/Toggle'
import { DenkynhoActivityIcon } from './DenkynhoActivityIcon'
import { HelpPreferences } from './HelpPreferences'
import { PetProgress } from './PetProgress'
import { emotionLabel } from './emotions'
import type { DenkynhoEmotion } from './emotions'
import type { HelpLanguage } from './personality'
import type { HelpPreferences as Preferences } from './preferences'

export const helpActivities = [
  { action: 'feed', pose: '11-comendo', pt: 'Alimentar', en: 'Feed', status: { pt: 'Fazendo uma pausa para um lanche.', en: 'Taking a snack break.' } },
  { action: 'sleep', pose: '05-dormindo', pt: 'Dormir', en: 'Sleep', status: { pt: 'Dormindo na caminha para recuperar energia.', en: 'Sleeping in bed to recover energy.' } },
  { action: 'play', pose: '12-jogando', pt: 'Brincar', en: 'Play', status: { pt: 'Brincando para ficar mais alegre!', en: 'Playing to feel happier!' } },
  { action: 'care', pose: '14-carinho', pt: 'Dar carinho', en: 'Give affection', status: { pt: 'Recebendo carinho e ficando mais alegre!', en: 'Getting affection and feeling happier!' } },
  { action: 'bath', pose: '15-banho', pt: 'Dar banho', en: 'Bathe', status: { pt: 'Tomando banho para aumentar a higiene!', en: 'Taking a bath to improve hygiene!' } },
  { action: 'walk', pose: '16-andando', pt: 'Caminhar', en: 'Walk', status: { pt: 'Caminhando para se exercitar!', en: 'Walking for a little exercise!' } },
  { action: 'dance', pose: '13-dancando', pt: 'Dançar juntos', en: 'Dance together', status: { pt: 'Dançando com você!', en: 'Dancing with you!' } },
] as const

export type HelpActivity = (typeof helpActivities)[number]

export type HelpPetLabels = {
  petLoading: string
  petError: string
  pet: string
  level: string
  xp: string
  attributes: string
  satiety: string
  energy: string
  happiness: string
  hygiene: string
  emotion: string
  empathy: string
  needsMood: string
  animate: string
  reduced: string
  language: string
}

interface HelpPetCareProps {
  labels: HelpPetLabels
  language: HelpLanguage
  userId?: string | null
  pet?: ApiDenkynhoProfile | null
  petLoading: boolean
  petQueryError: unknown
  petIsError: boolean
  petActionError: unknown
  petActionPending: boolean
  busy: boolean
  draft: string
  failed: boolean
  moderationBlocked: boolean
  activity: string | null
  careResult: ApiDenkynhoCareResult | null
  emotion: DenkynhoEmotion
  animated: boolean
  reduced: boolean
  preferences: Preferences | null
  onAnimationsChange: (enabled: boolean) => void
  onLanguageChange: (language: HelpLanguage) => void
  onCare: (item: HelpActivity, onActivity: () => void) => void
  onProfileChange: (updated: ApiDenkynhoProfile) => void
  onPreferencesPersist: (next: Preferences) => Promise<void>
  onPreferencesApply: (next: Preferences) => void
  onActivityReady: () => void
}

export function HelpPetCare({
  labels,
  language,
  userId,
  pet,
  petLoading,
  petQueryError,
  petIsError,
  petActionError,
  petActionPending,
  busy,
  draft,
  failed,
  moderationBlocked,
  activity,
  careResult,
  emotion,
  animated,
  reduced,
  preferences,
  onAnimationsChange,
  onLanguageChange,
  onCare,
  onProfileChange,
  onPreferencesPersist,
  onPreferencesApply,
  onActivityReady,
}: HelpPetCareProps) {
  const petAttributes = pet
    ? [
        { id: 'satiety', label: labels.satiety, value: pet.attributes.satiety },
        { id: 'energy', label: labels.energy, value: pet.attributes.energy },
        { id: 'happiness', label: labels.happiness, value: pet.attributes.happiness },
        { id: 'hygiene', label: labels.hygiene, value: pet.attributes.hygiene },
      ]
    : []

  return (
    <>
      {petLoading && <LoadingState className="denk-pet-loading">{labels.petLoading}</LoadingState>}
      {pet && (
        <section className="denk-pet-panel" aria-label={labels.pet}>
          <header>
            <strong>
              {labels.level} {pet.level}
            </strong>
            <small>
              {labels.xp} {pet.experience}/{pet.experience_next}
            </small>
          </header>
          <p className="denk-pet-emotion">
            <strong>
              {labels.emotion}: {emotionLabel(emotion.id, language)}
            </strong>
            <small className="muted">{emotion.source === 'user' ? labels.empathy : labels.needsMood}</small>
          </p>
          {pet.daily_visit && (pet.visit_xp ?? 0) > 0 && (
            <p role="status">
              {language === 'pt' ? `Obrigado pela visita! +${pet.visit_xp} XP` : `Thanks for visiting! +${pet.visit_xp} XP`}
            </p>
          )}
          <div className="denk-pet-attributes" aria-label={labels.attributes}>
            {petAttributes.map((attribute) => (
              <div key={attribute.id}>
                <span>{attribute.label}</span>
                <progress aria-label={attribute.label} max={100} value={attribute.value}>
                  {attribute.value}%
                </progress>
                <b>{attribute.value}</b>
              </div>
            ))}
          </div>
        </section>
      )}
      <ErrorNotice error={petQueryError ?? petActionError} fallback={labels.petError} className="denk-pet-error" />
      <div className="help-activities" role="group" aria-label={language === 'pt' ? 'Atividades do Denkynho' : 'Denkynho activities'}>
        {helpActivities
          .filter((item) => item.action !== 'dance' || pet?.available_actions?.includes('dance'))
          .map((item) => (
            <IconButton
              key={item.pose}
              label={item[language]}
              size="sm"
              variant="secondary"
              className="denk-activity-button"
              disabled={
                busy ||
                petActionPending ||
                petLoading ||
                petIsError ||
                Boolean(draft) ||
                failed ||
                moderationBlocked ||
                activity === item.pose
              }
              aria-pressed={activity === item.pose}
              onClick={() => {
                void onCare(item, onActivityReady)
              }}
            >
              <DenkynhoActivityIcon action={item.action} />
            </IconButton>
          ))}
      </div>
      {pet?.unlocks && (
        <PetProgress
          key={userId ?? 'guest'}
          profile={pet}
          language={language}
          careResult={careResult}
          disabled={busy || petActionPending}
          onProfileChange={onProfileChange}
        />
      )}
      <Toggle label={labels.animate} checked={animated} disabled={reduced} onChange={(event) => onAnimationsChange(event.target.checked)} />
      {reduced && <small className="muted">{labels.reduced}</small>}
      <Field label={labels.language}>
        <Select
          value={language}
          disabled={busy || petActionPending}
          onChange={(value) => onLanguageChange(value as HelpLanguage)}
          options={[
            { value: 'pt', label: 'Português' },
            { value: 'en', label: 'English' },
            { value: 'es', label: 'Español' },
          ]}
        />
      </Field>
      {userId ? (
        <HelpPreferences
          key={`${userId}-${language}`}
          userId={userId}
          language={language}
          value={preferences}
          disabled={busy || petActionPending}
          persist={onPreferencesPersist}
          onApply={onPreferencesApply}
        />
      ) : null}
    </>
  )
}
