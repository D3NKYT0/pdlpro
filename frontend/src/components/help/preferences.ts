import { isSafePreferredName } from './moderation'
import type { HelpLanguage } from './personality'

export interface HelpPreferences {
  preferred_name: string
  detail: 'brief' | 'balanced' | 'detailed'
  language: HelpLanguage
  remember: boolean
}
export const defaultHelpPreferences: HelpPreferences = { preferred_name: '', detail: 'balanced', language: 'pt', remember: false }
const key = (userId: string) => `pdl:denkynho:preferences:v1:${encodeURIComponent(userId)}`

/** Preferences contain explicit choices only; transcripts and signed context are never persisted. */
export function validHelpPreferences(value: unknown): value is HelpPreferences {
  if (!value || typeof value !== 'object') return false
  const data = value as HelpPreferences
  return typeof data.preferred_name === 'string' && (data.preferred_name === '' || isSafePreferredName(data.preferred_name))
    && ['brief', 'balanced', 'detailed'].includes(data.detail) && ['pt', 'en'].includes(data.language) && typeof data.remember === 'boolean'
}

/** Reads only the current account's opt-in choices; unavailable or corrupt storage uses defaults. */
export function loadHelpPreferences(userId?: string): HelpPreferences | null {
  if (!userId) return null
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key(userId)) ?? 'null')
    return validHelpPreferences(value) && value.remember ? value : null
  } catch { return null }
}

/** Stores an allowlist of fields, or removes the account's preferences when consent is off. */
export function storeHelpPreferences(userId: string, value: HelpPreferences): boolean {
  if (!validHelpPreferences(value) || !userId) return false
  try {
    if (value.remember) localStorage.setItem(key(userId), JSON.stringify({ preferred_name: value.preferred_name, detail: value.detail, language: value.language, remember: true }))
    else localStorage.removeItem(key(userId))
    return true
  } catch { return false }
}
