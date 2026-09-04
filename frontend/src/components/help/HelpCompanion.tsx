import { useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import type { HelpLanguage } from './personality'

const tips = {
  pt: ['Não envie senhas ou códigos de acesso no chat.', 'Conte o que aconteceu e em qual tela você está para facilitar a orientação.', 'O FAQ reúne orientações; para problemas que precisam da equipe, use Atendimento da equipe.'],
  en: ['Never share passwords or access codes in chat.', 'Describe what happened and which screen you are on to help me guide you.', 'Browse the FAQ for guidance; use Contact the team for issues that need staff assistance.'],
}
const bounds = () => {
  const viewport = window.visualViewport
  return { left: viewport?.offsetLeft ?? 0, top: viewport?.offsetTop ?? 0, width: viewport?.width ?? window.innerWidth, height: viewport?.height ?? window.innerHeight }
}
const clamp = (point: { x: number; y: number }) => {
  const box = bounds()
  return { x: Math.max(box.left + 8, Math.min(point.x, box.left + box.width - 88)), y: Math.max(box.top + 8, Math.min(point.y, box.top + box.height - 128)) }
}

/** Disclosure do mascote; no celular, o próprio personagem é uma alça arrastável limitada à área visível. */
export function HelpCompanion({ language, mascot, status, children, onChat }: { language: HelpLanguage; mascot: ReactNode; status: string; children: (onActivity: () => void) => ReactNode; onChat: () => void }) {
  const [open, setOpen] = useState(false)
  const [tip, setTip] = useState(-1)
  const [mobile, setMobile] = useState(window.innerWidth <= 900)
  const [position, setPosition] = useState(() => clamp({ x: window.innerWidth - 88, y: 120 }))
  const [area, setArea] = useState(bounds)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const drag = useRef<{ id: number; x: number; y: number; origin: typeof position; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  const id = useId()
  const pt = language === 'pt'
  useEffect(() => {
    const resize = () => { setMobile(window.innerWidth <= 900); setPosition(clamp); setArea(bounds()) }
    window.addEventListener('resize', resize)
    window.visualViewport?.addEventListener('resize', resize)
    window.visualViewport?.addEventListener('scroll', resize)
    return () => { window.removeEventListener('resize', resize); window.visualViewport?.removeEventListener('resize', resize); window.visualViewport?.removeEventListener('scroll', resize) }
  }, [])
  useEffect(() => {
    if (!open) return
    closeButton.current?.focus()
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() } }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [open])
  return <div ref={root} className={`help-companion-host${mobile ? ' is-floating' : ''}`} style={{ ...(mobile ? { left: position.x, top: position.y } : {}), '--companion-menu-top': `${area.top + 8}px`, '--companion-menu-left': `${area.left + 8}px`, '--companion-menu-width': `${Math.max(0, area.width - 16)}px`, '--companion-menu-height': `${Math.max(0, area.height - 16)}px` } as CSSProperties}>
    <Card as="aside" className="help-companion" aria-label={pt ? 'Seu assistente' : 'Your assistant'}>
      <div className="help-companion-intro"><span className="panel-eyebrow">{pt ? 'Seu companheiro no PDL' : 'Your PDL companion'}</span><h2>Denkynho</h2></div>
      <button ref={trigger} type="button" className="help-character-handle" aria-label={pt ? 'Denkynho: ações e dicas' : 'Denkynho: actions and tips'} aria-expanded={open} aria-controls={open ? id : undefined} aria-haspopup="dialog" aria-describedby={`${id}-hint`}
        onClick={() => { if (suppressClick.current) { suppressClick.current = false; return } setOpen(value => !value) }}
        onPointerDown={event => {
          suppressClick.current = false
          if (!mobile || event.button !== 0 || !event.isPrimary) return
          drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, origin: position, moved: false }
          event.currentTarget.setPointerCapture?.(event.pointerId)
        }}
        onPointerMove={event => {
          const current = drag.current
          if (!current || current.id !== event.pointerId) return
          const dx = event.clientX - current.x, dy = event.clientY - current.y
          if (!current.moved && Math.hypot(dx, dy) < 6) return
          current.moved = true; suppressClick.current = true; setOpen(false)
          setPosition(clamp({ x: current.origin.x + dx, y: current.origin.y + dy }))
        }}
        onPointerUp={() => { drag.current = null }}
        onPointerCancel={() => { drag.current = null; suppressClick.current = true }}
        onLostPointerCapture={() => { drag.current = null }}
        onKeyDown={event => {
          suppressClick.current = false
          if (!mobile || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
          event.preventDefault()
          setPosition(point => clamp({ x: point.x + (event.key === 'ArrowLeft' ? -20 : event.key === 'ArrowRight' ? 20 : 0), y: point.y + (event.key === 'ArrowUp' ? -20 : event.key === 'ArrowDown' ? 20 : 0) }))
        }}>{mascot}<span className="help-character-badge" aria-hidden="true">•••</span></button>
      <small id={`${id}-hint`} className={mobile ? 'help-sr' : 'muted'}>{pt ? (mobile ? 'Toque para ações. Arraste ou use as setas para mover.' : 'Clique em mim para ações e dicas.') : (mobile ? 'Tap for actions. Drag or use arrow keys to move.' : 'Click me for actions and tips.')}</small>
      <p className="muted help-companion-status">{status}</p>
    </Card>
    {open && <Card className="help-companion-menu" role="dialog" aria-label={pt ? 'Ações e dicas do Denkynho' : 'Denkynho actions and tips'} id={id}>
      <header><strong>Denkynho</strong><Button ref={closeButton} size="sm" variant="ghost" onClick={() => { setOpen(false); trigger.current?.focus() }}>{pt ? 'Fechar' : 'Close'}</Button></header>
      <p className="muted">{status}</p>
      {children(() => { if (mobile) setOpen(false) })}
      <div className="help-activities"><Button size="sm" variant="secondary" onClick={() => setTip(value => (value + 1) % tips[language].length)}>{pt ? 'Me dê uma dica' : 'Give me a tip'}</Button><Button size="sm" variant="secondary" onClick={() => { setOpen(false); onChat() }}>{pt ? 'Conversar' : 'Chat'}</Button></div>
      {tip >= 0 && <p role="status">{tips[language][tip]}</p>}
      {mobile && <Button size="sm" variant="ghost" onClick={() => setPosition(clamp({ x: bounds().left + bounds().width - 88, y: bounds().top + 120 }))}>{pt ? 'Reposicionar personagem' : 'Reset character position'}</Button>}
    </Card>}
  </div>
}
