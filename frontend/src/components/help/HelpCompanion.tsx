import { useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { SpeechBubble } from './SpeechBubble'
import './companion-controls.css'

const TIP_KEYS = ['companion.tip1', 'companion.tip2', 'companion.tip3'] as const
const bounds = () => {
  const viewport = window.visualViewport
  return { left: viewport?.offsetLeft ?? 0, top: viewport?.offsetTop ?? 0, width: viewport?.width ?? window.innerWidth, height: viewport?.height ?? window.innerHeight }
}
const clamp = (point: { x: number; y: number }) => {
  const box = bounds()
  return { x: Math.max(box.left + 8, Math.min(point.x, box.left + box.width - 88)), y: Math.max(box.top + 8, Math.min(point.y, box.top + box.height - 128)) }
}

/** Disclosure do mascote; no celular, o próprio personagem é uma alça arrastável limitada à área visível. */
export function HelpCompanion({ mascot, status, children, onChat, faqLink }: { mascot: ReactNode; status: string; children: (onActivity: () => void) => ReactNode; onChat: () => void; faqLink?: ReactNode }) {
  const { t } = useTranslation('help')
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [tip, setTip] = useState(-1)
  const [mobile, setMobile] = useState(window.innerWidth <= 900)
  const [position, setPosition] = useState(() => clamp({ x: window.innerWidth - 88, y: 120 }))
  const [area, setArea] = useState(bounds)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const restoreButton = useRef<HTMLButtonElement>(null)
  const restoreFocus = useRef(false)
  const drag = useRef<{ id: number; x: number; y: number; origin: typeof position; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  const id = useId()
  useEffect(() => {
    if (!restoreFocus.current) return
    ;(mobile && collapsed ? restoreButton : trigger).current?.focus()
    restoreFocus.current = false
  }, [collapsed, mobile])
  useEffect(() => {
    const resize = () => { setMobile(window.innerWidth <= 900); setPosition(clamp); setArea(bounds()) }
    window.addEventListener('resize', resize)
    window.visualViewport?.addEventListener('resize', resize)
    window.visualViewport?.addEventListener('scroll', resize)
    return () => { window.removeEventListener('resize', resize); window.visualViewport?.removeEventListener('resize', resize); window.visualViewport?.removeEventListener('scroll', resize) }
  }, [])
  useEffect(() => {
    if (!open || (mobile && collapsed)) return
    closeButton.current?.focus()
    const outside = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (root.current?.contains(target)) return
      if (target instanceof Element && target.closest('[data-ui-select-list]')) return
      setOpen(false)
    }
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() } }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [open, mobile, collapsed])
  if (mobile && collapsed) return <div className="help-companion-compact" ref={root}>
    <Button ref={restoreButton} size="sm" variant="secondary" onClick={() => { setOpen(false); restoreFocus.current = true; setCollapsed(false) }}>{text.showCharacter}</Button>
  </div>
  return <div ref={root} className={`help-companion-host${mobile ? ' is-floating' : ''}`} style={{ ...(mobile ? { left: position.x, top: position.y } : {}), '--companion-menu-top': `${area.top + 8}px`, '--companion-menu-left': `${area.left + 8}px`, '--companion-menu-width': `${Math.max(0, area.width - 16)}px`, '--companion-menu-height': `${Math.max(0, area.height - 16)}px` } as CSSProperties}>
    <Card as="aside" className="help-companion" aria-label={text.assistant}>
      <div className="help-companion-intro"><span className="panel-eyebrow">{text.companion}</span><h2>Denkynho</h2></div>
      <button ref={trigger} type="button" className="help-character-handle" aria-label={text.handle} aria-expanded={open} aria-controls={open ? id : undefined} aria-haspopup="dialog" aria-describedby={`${id}-hint`}
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
      <small id={`${id}-hint`} className={mobile ? 'help-sr' : 'muted'}>{mobile ? text.tapHint : text.clickHint}</small>
      <div className="help-companion-status" aria-live="polite"><SpeechBubble speaker="status">{status}</SpeechBubble></div>
    </Card>
    {open && <Card className="help-companion-menu" role="dialog" aria-label={text.actionsDialog} id={id}>
      <header><strong>Denkynho</strong><Button ref={closeButton} size="sm" variant="ghost" onClick={() => { setOpen(false); trigger.current?.focus() }}>{text.close}</Button></header>
      <SpeechBubble speaker="status">{status}</SpeechBubble>
      {children(() => { if (mobile) setOpen(false) })}
      <div className="help-companion-footer" role="group" aria-label={text.quickHelp}>{faqLink}<Button size="sm" variant="secondary" onClick={() => setTip(value => (value + 1) % tips[language].length)}>{text.giveTip}</Button><Button size="sm" variant="secondary" onClick={() => { setOpen(false); onChat() }}>{text.chat}</Button></div>
      {tip >= 0 && <p role="status">{tips[language][tip]}</p>}
      {mobile && <div className="help-activities">
        <Button size="sm" variant="ghost" onClick={() => setPosition(clamp({ x: bounds().left + bounds().width - 88, y: bounds().top + 120 }))}>{text.resetPosition}</Button>
        <Button size="sm" variant="secondary" onClick={() => { drag.current = null; setOpen(false); restoreFocus.current = true; setCollapsed(true) }}>{text.hideCharacter}</Button>
      </div>}
    </Card>}
  </div>
}
