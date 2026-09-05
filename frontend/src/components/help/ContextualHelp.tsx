import { useEffect, useId, useRef, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { Button, ButtonLink } from '../ui/Button'
import { Card } from '../ui/Card'
import { ErrorNotice, LoadingState } from '../ui/Feedback'
import { getHelpContext, supportTicketPrefill, type HelpIdentity, type HelpResources } from './contextual'
import type { HelpLanguage } from './personality'
import type { ApiDenkynhoProfile } from '../../services/domain/content.service'
import poses from './poses.json'
import './contextual-help.css'

/** Inline help for the current panel screen. Opening it does not send a chat message. */
export function ContextualHelp({ path, user = null, resources, loading = false, error, language = 'pt', pet = null }: {
  path: string; user?: HelpIdentity; resources?: HelpResources; loading?: boolean; error?: unknown; language?: HelpLanguage; pet?: ApiDenkynhoProfile | null
}) {
  const [openPath, setOpenPath] = useState<string | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const id = useId()
  const context = getHelpContext(path, user, error ? undefined : resources, language)
  const open = openPath === path
  const pt = language === 'pt'
  const cue = pet?.cue
  const pose = poses.find(item => item.id === (pet?.emotion?.idle_pose || pet?.emotion?.pose)) ?? poses[0]
  const ticket = supportTicketPrefill(context?.path ?? path, language)
  const triggerLabel = cue ? cue.message[language] : (pt ? 'Denkynho: ajuda nesta tela' : 'Denkynho: help on this screen')
  useEffect(() => {
    if (open) closeButton.current?.focus()
  }, [open])
  if (!context && !pet) return null
  const close = () => { setOpenPath(null); trigger.current?.focus() }
  return <div className="contextual-help" onKeyDown={event => { if (open && event.key === 'Escape') { event.stopPropagation(); close() } }}>
    <Button ref={trigger} size="sm" variant="secondary" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpenPath(open ? null : path)}>
      {pet ? <img className="contextual-help-face" src={`/mascot/denkynho/${pose.src}`} alt="" /> : <MessageCircle aria-hidden="true" />}
      {cue && <b className="contextual-help-cue" aria-hidden="true">!</b>}
      {triggerLabel}
    </Button>
    {open && <Card as="aside" className="contextual-help-panel" id={id} aria-labelledby={`${id}-title`}>
      <header><h2 id={`${id}-title`}>{context?.title ?? 'Denkynho'}</h2><Button ref={closeButton} size="sm" variant="secondary" onClick={close}>{pt ? 'Fechar ajuda da tela' : 'Close screen help'}</Button></header>
      {cue && <p role="status">{cue.message[language]}</p>}
      {pet?.daily_visit && (pet.visit_xp ?? 0) > 0 && <p role="status">{pt ? `Obrigado pela visita! +${pet.visit_xp} XP` : `Thanks for visiting! +${pet.visit_xp} XP`}</p>}
      {context && <p>{context.tip}</p>}
      {context && <p className="muted">{pt ? 'Pergunte ao Denkynho: ' : 'Ask Denkynho: '}{context.suggestion}</p>}
      {loading && <LoadingState>{pt ? 'Verificando recursos disponíveis…' : 'Checking available features…'}</LoadingState>}
      <ErrorNotice error={Boolean(error)} fallback={pt ? 'Não foi possível verificar os recursos. Os atalhos de módulos ficam ocultos até a próxima consulta.' : 'Could not check available features. Module shortcuts stay hidden until the next check.'} />
      <div className="contextual-help-actions">
        <ButtonLink size="sm" to={context ? `/painel/ajuda?from=${encodeURIComponent(context.path)}` : '/painel/ajuda'}>{pt ? 'Conversar sobre esta tela' : 'Chat about this screen'}</ButtonLink>
        {ticket && <ButtonLink size="sm" variant="secondary" to={ticket.to}>{ticket.label}</ButtonLink>}
        {!loading && context?.actions.filter(action => action.to !== context.path).map(action => <ButtonLink key={action.to} size="sm" variant="secondary" to={action.to}>{action.label}</ButtonLink>)}
      </div>
    </Card>}
  </div>
}
