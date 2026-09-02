import type { ReactNode } from 'react'
import './ui.css'
import { Card } from './Card'

export interface PageHeaderProps {
  title: string
  eyebrow?: ReactNode
  description?: ReactNode
  leading?: ReactNode
  actions?: ReactNode
  className?: string
  descriptionClassName?: string
}

/** Cabeçalho de página com hierarquia única e área de ações responsiva. */
export function PageHeader({ title, eyebrow, description, leading, actions, className = '', descriptionClassName = 'muted' }: PageHeaderProps) {
  return <Card as="header" className={`ui-page-header ${className}`.trim()}>
    <div>{leading}{eyebrow && <span className="panel-eyebrow">{eyebrow}</span>}<h1>{title}</h1>{description && <p className={descriptionClassName}>{description}</p>}</div>
    {actions}
  </Card>
}
