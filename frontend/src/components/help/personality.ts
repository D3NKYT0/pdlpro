import type { DenkynhoEmotionId } from './emotions'
import i18n from '../../i18n'
import { ASKING_HOW, PERSONALITY_INTENTS, type HelpLanguage } from './personalityIntents'

export type { HelpLanguage }
export interface PersonalityReply { text: string; pose: string; action?: { label: string; url: string } }

interface WelcomeIdentity { suggestedName?: string; roleLabel: string }

const feelingPose: Record<DenkynhoEmotionId, string> = {
  calm: '02-sucesso', joyful: '02-sucesso', amused: '06-rindo', sad: '07-triste',
  sleepy: '05-dormindo', surprised: '08-surpreso', confused: '09-confuso', frustrated: '10-frustrado',
}

function tPersonality(language: HelpLanguage) {
  return i18n.getFixedT(language, 'personality')
}

function periodGreeting(hour: number, language: HelpLanguage) {
  const t = tPersonality(language)
  if (hour < 12) return t('welcome.morning')
  if (hour < 18) return t('welcome.afternoon')
  return t('welcome.evening')
}

function roleLabel(language: HelpLanguage, role?: string) {
  const t = tPersonality(language)
  if (role === 'superadministrador') return t('welcome.roleSuperadmin')
  if (role === 'equipe') return t('welcome.roleStaff')
  return t('welcome.rolePlayer')
}

export function denkynhoWelcome(date = new Date(), identity?: WelcomeIdentity, language: HelpLanguage = 'pt'): string {
  const t = tPersonality(language)
  const greeting = periodGreeting(date.getHours(), language)
  if (identity) {
    const recognized = identity.suggestedName ? `, ${identity.suggestedName}` : ''
    const preference = identity.suggestedName
      ? t('welcome.confirmName', { name: identity.suggestedName })
      : t('welcome.askName')
    return t('welcome.withIdentity', {
      greeting,
      recognized,
      role: roleLabel(language, identity.roleLabel),
      preference,
    })
  }
  return t('welcome.anonymous', { greeting })
}

export const DENKYNHO_WELCOME = denkynhoWelcome()

/** Normaliza mensagens curtas sem alterar o texto que será exibido ao jogador. */
export const normalizeConversation = (text: string) => text
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9 ]/g, ' ')
  .replace(/\b(vc|vce|ce)\b/g, 'voce')
  .replace(/\bur\b/g, 'you are')
  .replace(/\s+/g, ' ')
  .trim()

function intentReplies(language: HelpLanguage, intentId: string): string[] {
  const value = tPersonality(language)(`intents.${intentId}.replies`, { returnObjects: true })
  return Array.isArray(value) ? value.map(String) : []
}

/** Responde somente a interações sociais curtas e bem reconhecidas. */
export function matchPersonality(message: string, variant = 0, language: HelpLanguage = 'pt', feeling?: DenkynhoEmotionId): PersonalityReply | undefined {
  const normalized = normalizeConversation(message)
  if (!normalized || normalized.length > 90) return undefined
  const t = tPersonality(language)
  if (feeling && feeling !== 'calm' && ASKING_HOW[language].test(normalized)) {
    const text = t(`howIFeel.${feeling}`, { defaultValue: '' })
    if (text) return { text, pose: feelingPose[feeling] }
  }
  const intent = PERSONALITY_INTENTS.find((item) => item.matches[language]?.test(normalized))
  if (!intent) return undefined
  const replies = intentReplies(language, intent.id)
  if (!replies.length) return undefined
  const index = Math.abs(variant) % replies.length
  const text = replies[index]
  const pose = intent.poses[Math.min(index, intent.poses.length - 1)]
  if (!intent.actionUrl) return { text, pose }
  return {
    text,
    pose,
    action: { label: t(`intents.${intent.id}.actionLabel`), url: intent.actionUrl },
  }
}
