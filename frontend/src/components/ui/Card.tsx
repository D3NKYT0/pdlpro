import type { HTMLAttributes } from 'react'

/** Superfície do painel; escolha o elemento semântico sem recriar bordas e espaçamento. */
export function Card({ as: Element = 'section', className = '', ...props }: HTMLAttributes<HTMLElement> & { as?: 'section' | 'article' | 'aside' | 'div' | 'header' }) {
  return <Element {...props} className={`card ${className}`.trim()} />
}
