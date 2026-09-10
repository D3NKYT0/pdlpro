import type { HelpChatMessage } from './HelpChat'
import { denkynhoWelcome, type HelpLanguage } from './personality'
import { initialDialogueState } from './dialogue'
import { type HelpIdentity } from './identity'
import { type HelpPreferences as Preferences } from './preferences'

type Message = HelpChatMessage

/** Alinhado a ``MESSAGE_MAX_LENGTH`` no backend — evita colagens que o modelo ecoa. */
export const MAX_CHAT_MESSAGE_LENGTH = 400

export const welcome = (identity: HelpIdentity, language: HelpLanguage, preferences?: Preferences | null): Message => ({
  id: 0,
  role: 'assistant',
  text: preferences?.preferred_name
    ? language === 'pt'
      ? `Olá, ${preferences.preferred_name}! Sou o Denkynho. Vamos continuar sua jornada no PDL?`
      : language === 'es'
        ? `¡Hola, ${preferences.preferred_name}! Soy Denkynho. ¿Seguimos tu viaje en el PDL?`
        : `Hi, ${preferences.preferred_name}! I'm Denkynho. Let's continue your PDL journey.`
    : denkynhoWelcome(new Date(), identity, language),
  pose: '01-boas-vindas',
})

export const dialogueWithPreferences = (language: HelpLanguage, preferences: Preferences | null) => ({
  ...initialDialogueState(language),
  ...(preferences
    ? {
        name: preferences.preferred_name || undefined,
        detailPreference: preferences.detail === 'brief' ? ('short' as const) : preferences.detail,
      }
    : {}),
})

export function idempotencyKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (part) => {
    const value = Math.floor(Math.random() * 16)
    return (part === 'x' ? value : (value & 0x3) | 0x8).toString(16)
  })
}
