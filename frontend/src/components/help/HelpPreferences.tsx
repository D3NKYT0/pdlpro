import { useState } from 'react'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { Toggle } from '../ui/Toggle'
import { defaultHelpPreferences, storeHelpPreferences, validHelpPreferences, type HelpPreferences as Preferences } from './preferences'
import type { HelpLanguage } from './personality'

/** Explicit account-scoped preferences with opt-in browser storage and an erase control. */
export function HelpPreferences({ userId, language, value, disabled, onApply }: {
  userId: string; language: HelpLanguage; value: Preferences | null; disabled: boolean; onApply: (value: Preferences) => void
}) {
  const [draft, setDraft] = useState<Preferences>(value ?? { ...defaultHelpPreferences, language })
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const pt = language === 'pt'
  function apply(next: Preferences) {
    setError(''); setNotice('')
    const trimmed = { ...next, preferred_name: next.preferred_name.trim(), language }
    if (!validHelpPreferences(trimmed)) { setError(pt ? 'Use um nome de até 30 caracteres, apenas com letras, espaços, apóstrofo ou hífen.' : 'Use a name up to 30 characters, with letters, spaces, apostrophes or hyphens.'); return }
    if (!storeHelpPreferences(userId, trimmed)) { setError(pt ? 'Não foi possível atualizar as preferências neste navegador. Tente novamente.' : 'Could not update preferences in this browser. Please retry.'); return }
    setDraft(trimmed); onApply(trimmed)
    setNotice(trimmed.remember ? (pt ? 'Preferências lembradas neste navegador para sua conta.' : 'Preferences saved in this browser for your account.') : (pt ? 'Preferências aplicadas só nesta conversa; nenhuma preferência ficou salva.' : 'Preferences apply to this conversation only; no preferences remain saved.'))
  }
  return <section className="help-preferences" aria-label={pt ? 'Preferências da conversa' : 'Conversation preferences'}>
    <strong>{pt ? 'Do seu jeito' : 'Your preferences'}</strong>
    <Field label={pt ? 'Como devo chamar você?' : 'What should I call you?'}><input value={draft.preferred_name} maxLength={30} disabled={disabled} onChange={event => { setDraft({ ...draft, preferred_name: event.target.value }); setError(''); setNotice('') }} /></Field>
    <Field label={pt ? 'Tamanho das respostas' : 'Response length'}><select value={draft.detail} disabled={disabled} onChange={event => setDraft({ ...draft, detail: event.target.value as Preferences['detail'] })}><option value="brief">{pt ? 'Curtas' : 'Brief'}</option><option value="balanced">{pt ? 'Equilibradas' : 'Balanced'}</option><option value="detailed">{pt ? 'Detalhadas' : 'Detailed'}</option></select></Field>
    <Toggle label={pt ? 'Lembrar minhas preferências' : 'Remember my preferences'} checked={draft.remember} disabled={disabled} onChange={event => setDraft({ ...draft, remember: event.target.checked })} />
    <small className="muted">{pt ? 'Guarda nome, idioma e tamanho das respostas neste navegador, apenas para esta conta. O histórico não é salvo.' : 'Stores name, language and response length in this browser for this account. Chat history is not saved.'}</small>
    <div className="help-activities"><Button size="sm" disabled={disabled} onClick={() => apply(draft)}>{pt ? 'Aplicar preferências' : 'Apply preferences'}</Button><Button size="sm" variant="secondary" disabled={disabled} onClick={() => apply({ ...defaultHelpPreferences, language })}>{pt ? 'Apagar preferências' : 'Erase preferences'}</Button></div>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
  </section>
}
