import type { HTMLAttributes } from 'react'

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: 'section' | 'article' | 'aside' | 'div' | 'header'
  'data-theme-part'?: string
}

/** Superfície do painel; escolha o elemento semântico sem recriar bordas e espaçamento. */
export function Card({ as: Element = 'section', className = '', 'data-theme-part': themePart = 'card', ...props }: CardProps) {
  return <Element {...props} data-theme-part={themePart} className={`card ${className}`.trim()} />
}
