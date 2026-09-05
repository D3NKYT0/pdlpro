import { useEffect, useId, useRef, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { Button, ButtonLink } from '../ui/Button'
import { Card } from '../ui/Card'
import { ErrorNotice, LoadingState } from '../ui/Feedback'
import { getHelpContext, type HelpIdentity, type HelpResources } from './contextual'
import type { HelpLanguage } from './personality'
import './contextual-help.css'

/** Inline help for the current panel screen. Opening it does not send a chat message. */
export function ContextualHelp({ path, user = null, resources, loading = false, error, language = 'pt' }: {
  path: string; user?: HelpIdentity; resources?: HelpResources; loading?: boolean; error?: unknown; language?: HelpLanguage
}) {
  const [openPath, setOpenPath] = useState<string | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const id = useId()
  const context = getHelpContext(path, user, error ? undefined : resources, language)
  const open = openPath === path
  const pt = language === 'pt'
  useEffect(() => {
    if (open) closeButton.current?.focus()
  }, [open])
  if (!context) return null
  const close = () => { setOpenPath(null); trigger.current?.focus() }
  return <div className="contextual-help" onKeyDown={event => { if (open && event.key === 'Escape') { event.stopPropagation(); close() } }}>
    <Button ref={trigger} size="sm" variant="secondary" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpenPath(open ? null : path)}>
      <MessageCircle aria-hidden="true" /> {pt ? 'Denkynho: ajuda nesta tela' : 'Denkynho: help on this screen'}
    </Button>
    {open && <Card as="aside" className="contextual-help-panel" id={id} aria-labelledby={`${id}-title`}>
      <header><h2 id={`${id}-title`}>{context.title}</h2><Button ref={closeButton} size="sm" variant="secondary" onClick={close}>{pt ? 'Fechar ajuda da tela' : 'Close screen help'}</Button></header>
      <p>{context.tip}</p>
      <p className="muted">{pt ? 'Pergunte ao Denkynho: ' : 'Ask Denkynho: '}{context.suggestion}</p>
      {loading && <LoadingState>{pt ? 'Verificando recursos disponíveis…' : 'Checking available features…'}</LoadingState>}
      <ErrorNotice error={Boolean(error)} fallback={pt ? 'Não foi possível verificar os recursos. Os atalhos de módulos ficam ocultos até a próxima consulta.' : 'Could not check available features. Module shortcuts stay hidden until the next check.'} />
      <div className="contextual-help-actions">
        <ButtonLink size="sm" to={`/painel/ajuda?from=${encodeURIComponent(context.path)}`}>{pt ? 'Conversar sobre esta tela' : 'Chat about this screen'}</ButtonLink>
        {!loading && context.actions.filter(action => action.to !== context.path).map(action => <ButtonLink key={action.to} size="sm" variant="secondary" to={action.to}>{action.label}</ButtonLink>)}
      </div>
    </Card>}
  </div>
}
