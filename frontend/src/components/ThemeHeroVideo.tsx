import { useEffect, useState } from 'react'
import { themeImage } from '../theme/assets'

const MOBILE_QUERY = '(max-width: 768px)'

function heroVideoSrc(mobile: boolean) {
  return themeImage(mobile ? 'video-mobile.mp4' : 'video.mp4')
}

function heroPosterSrc(mobile: boolean) {
  return themeImage(mobile ? 'video-mobile-poster.jpg' : 'video-poster.jpg')
}

/** Fundo animado do hero: landscape no desktop e versão retrato no mobile. */
export function ThemeHeroVideo() {
  const [mobile, setMobile] = useState(() => window.matchMedia?.(MOBILE_QUERY).matches ?? false)
  const [src, setSrc] = useState(() => heroVideoSrc(mobile))
  const poster = heroPosterSrc(mobile)

  useEffect(() => {
    const media = window.matchMedia?.(MOBILE_QUERY)
    if (!media) return
    const sync = () => {
      const next = media.matches
      setMobile(next)
      setSrc(heroVideoSrc(next))
    }
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  return (
    <div className="video" aria-hidden="true">
      <video
        key={src}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={poster}
        src={src}
        onError={(event) => {
          const el = event.currentTarget
          if (src.includes('video-mobile')) {
            const fallback = themeImage('video.mp4')
            setSrc(fallback)
            el.src = fallback
            el.load()
            void el.play().catch(() => undefined)
            return
          }
          // Mantém o poster visível se o MP4 falhar.
          el.removeAttribute('src')
        }}
      />
    </div>
  )
}
