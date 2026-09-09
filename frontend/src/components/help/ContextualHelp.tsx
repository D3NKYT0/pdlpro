import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { Button, ButtonLink, IconButton } from '../ui/Button'
import { Card } from '../ui/Card'
import { ErrorNotice, LoadingState } from '../ui/Feedback'
import { getHelpContext, supportTicketPrefill, type HelpIdentity, type HelpResources } from './contextual'
import type { HelpLanguage } from './personality'
import type { ApiDenkynhoProfile } from '../../services/api'
import { denkynhoPose } from './assets'
import poses from './poses.json'
import './contextual-help.css'

function careShortcut(cueId: string | undefined, language: HelpLanguage) {
  const pt = language === 'pt'
  if (cueId === 'satiety') return { label: pt ? 'Alimentar no cantinho' : 'Feed in the den' }
  if (cueId === 'energy') return { label: pt ? 'Levar para descansar' : 'Put him to rest' }
  if (cueId === 'hygiene') return { label: pt ? 'Dar um banho' : 'Give a bath' }
  if (cueId === 'happiness') return { label: pt ? 'Fazer carinho' : 'Give affection' }
  return null
}

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
  const helpEnabled = !resources?.some((resource) => resource.code === 'help' && !resource.enabled)
  const supportEnabled = !resources?.some((resource) => resource.code === 'support' && !resource.enabled)
  const ticket = supportEnabled ? supportTicketPrefill(context?.path ?? path, language) : null
  const triggerLabel = cue ? cue.message[language] : (pt ? 'Denkynho: ajuda nesta tela' : 'Denkynho: help on this screen')
  const helpPath = context ? `/painel/ajuda?from=${encodeURIComponent(context.path)}` : '/painel/ajuda'
  const petCare = helpEnabled ? careShortcut(cue?.id, language) : null
  const attributes = pet ? [
    { id: 'satiety', label: pt ? 'Saciedade' : 'Satiety', value: pet.attributes.satiety },
    { id: 'energy', label: pt ? 'Energia' : 'Energy', value: pet.attributes.energy },
    { id: 'happiness', label: pt ? 'Alegria' : 'Happiness', value: pet.attributes.happiness },
    { id: 'hygiene', label: pt ? 'Higiene' : 'Hygiene', value: pet.attributes.hygiene },
  ] : []
  useEffect(() => {
    if (open) closeButton.current?.focus()
  }, [open])
  if (!context && !pet) return null
  const close = () => { setOpenPath(null); trigger.current?.focus() }
  return <div className="contextual-help" onKeyDown={event => { if (open && event.key === 'Escape') { event.stopPropagation(); close() } }}>
    <Button ref={trigger} size="sm" variant="secondary" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpenPath(open ? null : path)}>
      {pet ? <img className="contextual-help-face" src={denkynhoPose(pose.src)} alt="" /> : <MessageCircle aria-hidden="true" />}
      {cue && <b className="contextual-help-cue" aria-hidden="true">!</b>}
      {triggerLabel}
    </Button>
    {open && <Card as="aside" className="contextual-help-panel" id={id} aria-labelledby={`${id}-title`}>
      <header className="contextual-help-top">
        <div className="contextual-help-brand">
          <p className="contextual-help-kicker">{pt ? 'Cantinho do Denkynho' : "Denkynho's den"}</p>
          <h2 id={`${id}-title`}>{context?.title ?? 'Denkynho'}</h2>
        </div>
        <div className="contextual-help-meta">
          {pet ? <p className="contextual-help-level"><strong>{pt ? 'Nv.' : 'Lv.'} {pet.level}</strong><small>{pet.experience}/{pet.experience_next} XP</small></p> : null}
          {cue ? <p className="contextual-help-status" role="status">{cue.message[language]}</p> : null}
          {pet?.daily_visit && (pet.visit_xp ?? 0) > 0 ? <p className="contextual-help-status" role="status">{pt ? `Visita +${pet.visit_xp} XP` : `Visit +${pet.visit_xp} XP`}</p> : null}
        </div>
        <IconButton ref={closeButton} label={pt ? 'Fechar ajuda da tela' : 'Close screen help'} size="sm" variant="danger" onClick={close}>
          <X aria-hidden="true" />
        </IconButton>
      </header>

      <div className={`contextual-help-stage${pet ? ' has-pet' : ''}`}>
        {pet ? <div className="contextual-help-hero" aria-hidden="true">
          <img className="contextual-help-avatar" src={denkynhoPose(pose.src)} alt="" />
        </div> : null}

        {pet ? <section className="contextual-help-needs" aria-label={pt ? 'Necessidades' : 'Needs'}>
          <div className="contextual-help-needs-grid">
            {attributes.map(attribute => (
              <div key={attribute.id} className="contextual-help-need">
                <div className="contextual-help-need-head">
                  <span>{attribute.label}</span>
                  <b>{attribute.value}</b>
                </div>
                <div
                  className="contextual-help-need-track"
                  role="progressbar"
                  aria-label={attribute.label}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={attribute.value}
                  style={{ '--need': `${Math.max(0, Math.min(100, attribute.value))}%` } as CSSProperties}
                >
                  <span className="contextual-help-need-fill" />
                </div>
              </div>
            ))}
          </div>
          <div className="contextual-help-care">
            {helpEnabled ? <ButtonLink size="sm" to={helpPath}>{pt ? 'Abrir o cantinho' : 'Open the den'}</ButtonLink> : null}
            {petCare ? <ButtonLink size="sm" variant="secondary" to={helpPath}>{petCare.label}</ButtonLink> : null}
          </div>
        </section> : null}

        <section className="contextual-help-guide">
          {context && helpEnabled ? <p className="muted contextual-help-ask"><span>{pt ? 'Pergunte:' : 'Ask:'}</span> {context.suggestion}</p> : null}
          {loading && <LoadingState>{pt ? 'Verificando recursos disponíveis…' : 'Checking available features…'}</LoadingState>}
          <ErrorNotice error={Boolean(error)} fallback={pt ? 'Não foi possível verificar os recursos. Os atalhos de módulos ficam ocultos até a próxima consulta.' : 'Could not check available features. Module shortcuts stay hidden until the next check.'} />
          <div className="contextual-help-actions">
            {helpEnabled ? <ButtonLink size="sm" to={helpPath}>{pt ? 'Conversar sobre esta tela' : 'Chat about this screen'}</ButtonLink> : null}
            {ticket && <ButtonLink size="sm" variant="secondary" to={ticket.to}>{ticket.label}</ButtonLink>}
            {!loading && context?.actions.filter(action => action.to !== context.path).map(action => <ButtonLink key={action.to} size="sm" variant="secondary" to={action.to}>{action.label}</ButtonLink>)}
          </div>
        </section>

        {context ? <section className="contextual-help-daily" aria-label={pt ? 'Dica do dia' : 'Tip of the day'}>
          <p className="contextual-help-kicker">{pt ? 'Dica do dia' : 'Tip of the day'}</p>
          <p className="contextual-help-tip">{context.tip}</p>
        </section> : null}
      </div>
    </Card>}
  </div>
}
