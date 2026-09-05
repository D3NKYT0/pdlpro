import { useState } from 'react'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { Toggle } from '../ui/Toggle'
import { defaultHelpPreferences, storeHelpPreferences, validHelpPreferences, type HelpPreferences as Preferences } from './preferences'
import type { HelpLanguage } from './personality'

/** Explicit account-scoped preferences with opt-in browser storage and an erase control. */
export function HelpPreferences({ userId, language, value, disabled, persist, onApply }: {
  userId: string; language: HelpLanguage; value: Preferences | null; disabled: boolean; persist?: (value: Preferences) => Promise<void>; onApply: (value: Preferences) => void
}) {
  const [draft, setDraft] = useState<Preferences>(value ?? { ...defaultHelpPreferences, language })
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const pt = language === 'pt'
  async function apply(next: Preferences) {
    setError(''); setNotice('')
    const trimmed = { ...next, preferred_name: next.preferred_name.trim(), language }
    if (!validHelpPreferences(trimmed)) { setError(pt ? 'Use um nome de até 30 caracteres, apenas com letras, espaços, apóstrofo ou hífen.' : 'Use a name up to 30 characters, with letters, spaces, apostrophes or hyphens.'); return }
    const keepOnAccount = Boolean(persist) && (trimmed.remember || (!trimmed.preferred_name && trimmed.detail === 'balanced'))
    if (keepOnAccount && persist) {
      setPending(true)
      try { await persist(trimmed) } catch { setPending(false); setError(pt ? 'Não foi possível guardar as preferências na sua conta. Tente novamente.' : 'Could not save preferences to your account. Please retry.'); return }
      setPending(false)
    }
    if (!storeHelpPreferences(userId, trimmed)) { setError(pt ? 'Não foi possível atualizar as preferências neste navegador. Tente novamente.' : 'Could not update preferences in this browser. Please retry.'); return }
    setDraft(trimmed); onApply(trimmed)
    setNotice(trimmed.remember ? (pt ? 'Preferências lembradas na sua conta e neste navegador.' : 'Preferences saved to your account and this browser.') : (pt ? 'Preferências aplicadas só nesta conversa; nenhuma preferência ficou salva.' : 'Preferences apply to this conversation only; no preferences remain saved.'))
  }
  const blocked = disabled || pending
  return <section className="help-preferences" aria-label={pt ? 'Preferências da conversa' : 'Conversation preferences'}>
    <strong>{pt ? 'Do seu jeito' : 'Your preferences'}</strong>
    <Field label={pt ? 'Como devo chamar você?' : 'What should I call you?'}><input value={draft.preferred_name} maxLength={30} disabled={blocked} onChange={event => { setDraft({ ...draft, preferred_name: event.target.value }); setError(''); setNotice('') }} /></Field>
    <Field label={pt ? 'Tamanho das respostas' : 'Response length'}><select value={draft.detail} disabled={blocked} onChange={event => setDraft({ ...draft, detail: event.target.value as Preferences['detail'] })}><option value="brief">{pt ? 'Curtas' : 'Brief'}</option><option value="balanced">{pt ? 'Equilibradas' : 'Balanced'}</option><option value="detailed">{pt ? 'Detalhadas' : 'Detailed'}</option></select></Field>
    <Toggle label={pt ? 'Lembrar minhas preferências' : 'Remember my preferences'} checked={draft.remember} disabled={blocked} onChange={event => setDraft({ ...draft, remember: event.target.checked })} />
    <small className="muted">{pt ? 'O nome e o tamanho das respostas podem ficar na sua conta. O idioma fica neste navegador. O histórico não é salvo.' : 'Name and response length can be stored on your account. Language stays in this browser. Chat history is not saved.'}</small>
    <div className="help-preference-actions"><Button size="sm" disabled={blocked} busy={pending} onClick={() => void apply(draft)}>{pt ? 'Aplicar preferências' : 'Apply preferences'}</Button><Button size="sm" variant="secondary" disabled={blocked} onClick={() => void apply({ ...defaultHelpPreferences, language })}>{pt ? 'Apagar preferências' : 'Erase preferences'}</Button></div>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
  </section>
}
