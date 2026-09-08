import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { IconButton } from './Button'
import './ui.css'

export interface ModalProps {
  open: boolean
  title: ReactNode
  onClose: () => void
  children: ReactNode
  className?: string
}

/** Diálogo modal com fundo, Escape, foco inicial e fechamento pelo backdrop. */
export function Modal({ open, title, onClose, children, className = '' }: ModalProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const node = panelRef.current
    node?.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')?.focus()
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = original
      previous?.focus?.()
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="ui-modal-root" data-theme-part="modal">
      <button type="button" className="ui-modal-backdrop" aria-label="Fechar" onClick={onClose} />
      <div
        ref={panelRef}
        className={`ui-modal card ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="ui-modal-header">
          <h2 id={titleId}>{title}</h2>
          <IconButton label="Fechar" onClick={onClose}><X aria-hidden="true" /></IconButton>
        </header>
        <div className="ui-modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
