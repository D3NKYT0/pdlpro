import { useEffect, useState } from 'react'
import { themeImage } from '../theme/assets'
import { useTheme } from '../theme/ThemeProvider'

const MOBILE_QUERY = '(max-width: 768px)'

/** Fundo animado do hero: landscape no desktop e versão retrato no mobile. */
export function ThemeHeroVideo() {
  const theme = useTheme()
  const [mobile, setMobile] = useState(() => window.matchMedia?.(MOBILE_QUERY).matches ?? false)
  const desktop = theme.assets?.['images/video.mp4'] || themeImage('video.mp4')
  const mobileSource = theme.assets?.['images/video-mobile.mp4'] || (theme.assets?.['images/video.mp4'] ? desktop : themeImage('video-mobile.mp4'))
  const requested = mobile ? mobileSource : desktop
  const posterPath = mobile ? 'video-mobile-poster.jpg' : 'video-poster.jpg'
  const poster = theme.assets?.[`images/${posterPath}`] || themeImage(posterPath)
  const [failedSources, setFailedSources] = useState<Set<string>>(() => new Set())
  const src = !failedSources.has(requested) ? requested : mobile && !failedSources.has(desktop) ? desktop : undefined

  useEffect(() => setFailedSources(new Set()), [requested, desktop])

  useEffect(() => {
    const media = window.matchMedia?.(MOBILE_QUERY)
    if (!media) return
    const sync = () => {
      const next = media.matches
      setMobile(next)
    }
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  return (
    <div className="video" aria-hidden="true">
      <video
        key={src ?? poster}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={poster}
        src={src}
        onError={(event) => {
          const failed = event.currentTarget.getAttribute('src')
          if (failed) setFailedSources(previous => new Set([...previous, failed]))
        }}
      />
    </div>
  )
}
