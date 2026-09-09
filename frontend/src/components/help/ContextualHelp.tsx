import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
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

const CARE_KEYS = ['satiety', 'energy', 'hygiene', 'happiness'] as const
type CareKey = (typeof CARE_KEYS)[number]

function resolveHelpLanguage(language: string | undefined): HelpLanguage {
  if (language === 'en' || language === 'es' || language === 'pt') return language
  return 'pt'
}

function cueMessage(
  cue: NonNullable<ApiDenkynhoProfile['cue']>,
  language: HelpLanguage,
) {
  return cue.message[language] ?? cue.message.en ?? cue.message.pt
}

/** Inline help for the current panel screen. Opening it does not send a chat message. */
export function ContextualHelp({ path, user = null, resources, loading = false, error, language, pet = null }: {
  path: string; user?: HelpIdentity; resources?: HelpResources; loading?: boolean; error?: unknown; language?: HelpLanguage; pet?: ApiDenkynhoProfile | null
}) {
  const { t, i18n } = useTranslation('help')
  const activeLanguage = language ?? resolveHelpLanguage(i18n.language)
  const [openPath, setOpenPath] = useState<string | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const id = useId()
  const context = getHelpContext(path, user, error ? undefined : resources, activeLanguage)
  const open = openPath === path
  const cue = pet?.cue
  const pose = poses.find(item => item.id === (pet?.emotion?.idle_pose || pet?.emotion?.pose)) ?? poses[0]
  const helpEnabled = !resources?.some((resource) => resource.code === 'help' && !resource.enabled)
  const supportEnabled = !resources?.some((resource) => resource.code === 'support' && !resource.enabled)
  const ticket = supportEnabled ? supportTicketPrefill(context?.path ?? path, activeLanguage) : null
  const triggerLabel = cue ? cueMessage(cue, activeLanguage) : t('contextual.triggerHelp')
  const helpPath = context ? `/painel/ajuda?from=${encodeURIComponent(context.path)}` : '/painel/ajuda'
  const petCareKey = helpEnabled && cue && CARE_KEYS.includes(cue.id as CareKey) ? (cue.id as CareKey) : null
  const attributes = pet ? CARE_KEYS.map((attr) => ({
    id: attr,
    label: t(`contextual.attributes.${attr}`),
    value: pet.attributes[attr],
  })) : []
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
          <p className="contextual-help-kicker">{t('contextual.kicker')}</p>
          <h2 id={`${id}-title`}>{context?.title ?? 'Denkynho'}</h2>
        </div>
        <div className="contextual-help-meta">
          {pet ? <p className="contextual-help-level"><strong>{t('contextual.levelShort', { level: pet.level })}</strong><small>{pet.experience}/{pet.experience_next} XP</small></p> : null}
          {cue ? <p className="contextual-help-status" role="status">{cueMessage(cue, activeLanguage)}</p> : null}
          {pet?.daily_visit && (pet.visit_xp ?? 0) > 0 ? <p className="contextual-help-status" role="status">{t('contextual.visitXp', { xp: pet.visit_xp })}</p> : null}
        </div>
        <IconButton ref={closeButton} label={t('contextual.close')} size="sm" variant="danger" onClick={close}>
          <X aria-hidden="true" />
        </IconButton>
      </header>

      <div className={`contextual-help-stage${pet ? ' has-pet' : ''}`}>
        {pet ? <div className="contextual-help-hero" aria-hidden="true">
          <img className="contextual-help-avatar" src={denkynhoPose(pose.src)} alt="" />
        </div> : null}

        {pet ? <section className="contextual-help-needs" aria-label={t('contextual.needs')}>
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
            {helpEnabled ? <ButtonLink size="sm" to={helpPath}>{t('contextual.openDen')}</ButtonLink> : null}
            {petCareKey ? <ButtonLink size="sm" variant="secondary" to={helpPath}>{t(`contextual.care.${petCareKey}`)}</ButtonLink> : null}
          </div>
        </section> : null}

        <section className="contextual-help-guide">
          {context && helpEnabled ? <p className="muted contextual-help-ask"><span>{t('contextual.ask')}</span> {context.suggestion}</p> : null}
          {loading && <LoadingState>{t('contextual.checkingResources')}</LoadingState>}
          <ErrorNotice error={Boolean(error)} fallback={t('contextual.resourcesError')} />
          <div className="contextual-help-actions">
            {helpEnabled ? <ButtonLink size="sm" to={helpPath}>{t('contextual.chatAboutScreen')}</ButtonLink> : null}
            {ticket && <ButtonLink size="sm" variant="secondary" to={ticket.to}>{ticket.label}</ButtonLink>}
            {!loading && context?.actions.filter(action => action.to !== context.path).map(action => <ButtonLink key={action.to} size="sm" variant="secondary" to={action.to}>{action.label}</ButtonLink>)}
          </div>
        </section>

        {context ? <section className="contextual-help-daily" aria-label={t('contextual.tipOfDay')}>
          <p className="contextual-help-kicker">{t('contextual.tipOfDay')}</p>
          <p className="contextual-help-tip">{context.tip}</p>
        </section> : null}
      </div>
    </Card>}
  </div>
}
