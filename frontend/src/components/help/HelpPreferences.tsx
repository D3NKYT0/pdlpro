import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { Select } from '../ui/Select'
import { Toggle } from '../ui/Toggle'
import { defaultHelpPreferences, storeHelpPreferences, validHelpPreferences, type HelpPreferences as Preferences } from './preferences'
import type { HelpLanguage } from './personality'

/** Explicit account-scoped preferences with opt-in browser storage and an erase control. */
export function HelpPreferences({ userId, language, value, disabled, persist, onApply }: {
  userId: string; language: HelpLanguage; value: Preferences | null; disabled: boolean; persist?: (value: Preferences) => Promise<void>; onApply: (value: Preferences) => void
}) {
  const { t } = useTranslation('help')
  const [draft, setDraft] = useState<Preferences>(value ?? { ...defaultHelpPreferences, language })
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  async function apply(next: Preferences) {
    setError(''); setNotice('')
    const trimmed = { ...next, preferred_name: next.preferred_name.trim(), language }
    if (!validHelpPreferences(trimmed)) { setError(t('preferences.invalidName')); return }
    const keepOnAccount = Boolean(persist) && (trimmed.remember || (!trimmed.preferred_name && trimmed.detail === 'balanced'))
    if (keepOnAccount && persist) {
      setPending(true)
      try { await persist(trimmed) } catch { setPending(false); setError(t('preferences.saveAccountError')); return }
      setPending(false)
    }
    if (!storeHelpPreferences(userId, trimmed)) { setError(t('preferences.saveBrowserError')); return }
    setDraft(trimmed); onApply(trimmed)
    setNotice(trimmed.remember ? t('preferences.savedNotice') : t('preferences.sessionNotice'))
  }
  const blocked = disabled || pending
  return <section className="help-preferences" aria-label={t('preferences.section')}>
    <strong>{t('preferences.title')}</strong>
    <Field label={t('preferences.name')}><input value={draft.preferred_name} maxLength={30} disabled={blocked} onChange={event => { setDraft({ ...draft, preferred_name: event.target.value }); setError(''); setNotice('') }} /></Field>
    <Field label={t('preferences.detail')}><Select value={draft.detail} disabled={blocked} onChange={value => setDraft({ ...draft, detail: value as Preferences['detail'] })} options={[{ value: 'brief', label: t('preferences.brief') }, { value: 'balanced', label: t('preferences.balanced') }, { value: 'detailed', label: t('preferences.detailed') }]} /></Field>
    <Toggle label={t('preferences.remember')} checked={draft.remember} disabled={blocked} onChange={event => setDraft({ ...draft, remember: event.target.checked })} />
    <small className="muted">{t('preferences.hint')}</small>
    <div className="help-preference-actions"><Button size="sm" disabled={blocked} busy={pending} onClick={() => void apply(draft)}>{t('preferences.apply')}</Button><Button size="sm" variant="secondary" disabled={blocked} onClick={() => void apply({ ...defaultHelpPreferences, language })}>{t('preferences.erase')}</Button></div>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
  </section>
}
