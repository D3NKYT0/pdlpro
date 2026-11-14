import type { HTMLAttributes } from 'react'
import { ThemeHeroVideo } from '../ThemeHeroVideo'

type Props = HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'section' | 'header'
  enabled?: boolean
}

/** Adds the theme video inside the existing hero element without changing its composition. */
export function ThemeHeroSurface({ as: Element = 'section', enabled = true, className = '', children, ...props }: Props) {
  const video = enabled
  return <Element {...props} className={`${className}${video ? ' theme-hero-media' : ''}`} data-theme-part="hero" data-theme-media={video ? 'video' : undefined}>
    {video ? <ThemeHeroVideo /> : null}
    {children}
  </Element>
}
