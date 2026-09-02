import type { ReactNode } from 'react'
import { EmptyState } from '../ui/Feedback'
import { themeImage } from '../../theme/assets'

type PublicHeroProps = {
  kicker: string
  title: string
  description?: string
}

export function PublicHero({ kicker, title, description }: PublicHeroProps) {
  return (
    <header className="public-hero">
      <div className="title container">
        <span>
          <img src={themeImage('icons/text.png')} alt="" />
          {kicker}
        </span>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
    </header>
  )
}

export function PublicEmpty({ children }: { children: ReactNode }) {
  return (
    <EmptyState className="public-empty" icon={<span className="public-diamond" aria-hidden="true" />}>{children}</EmptyState>
  )
}
