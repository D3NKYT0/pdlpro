import type { ReactNode } from 'react'
import './ui.css'

export interface TabItem<T extends string> { id: T; label: ReactNode; icon?: ReactNode }

/** Abas controladas com IDs estáveis e navegação por setas, Home e End.
 * Cada painel deve usar id="<id>-panel-<item>" e aria-labelledby correspondente.
 */
export function Tabs<T extends string>({ id, label, items, value, onChange, className = '' }: {
  id: string; label: string; items: readonly TabItem<T>[]; value: T; onChange: (value: T) => void; className?: string
}) {
  return <div className={`ui-tabs ${className}`} data-theme-part="tabs" role="tablist" aria-label={label}>
    {items.map((item, index) => <button key={item.id} type="button" role="tab" id={`${id}-tab-${item.id}`} aria-controls={`${id}-panel-${item.id}`} aria-selected={value === item.id} tabIndex={value === item.id ? 0 : -1} className={value === item.id ? 'active' : undefined} onClick={() => onChange(item.id)} onKeyDown={event => {
      const target = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : event.key === 'ArrowRight' ? (index + 1) % items.length : event.key === 'ArrowLeft' ? (index - 1 + items.length) % items.length : -1
      if (target < 0) return
      event.preventDefault()
      onChange(items[target].id)
      const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      buttons?.[target].focus()
    }}>{item.icon}<span>{item.label}</span></button>)}
  </div>
}
