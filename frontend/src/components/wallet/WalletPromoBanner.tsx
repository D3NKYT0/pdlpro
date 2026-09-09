import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import type { ApiWalletPromo } from '../../services/types'

export function WalletPromoBanner({ promo }: { promo: ApiWalletPromo }) {
  const bannerRef = useRef<HTMLElement>(null)
  const frameRef = useRef(0)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  useEffect(() => () => cancelAnimationFrame(frameRef.current), [])

  function onMouseMove(event: MouseEvent<HTMLElement>) {
    const node = bannerRef.current
    if (!node) return
    const rect = node.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const y = ((event.clientY - rect.top) / rect.height) * 2 - 1
    cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(() => {
      setTilt({
        x: Math.max(-1, Math.min(1, x)),
        y: Math.max(-1, Math.min(1, y)),
      })
    })
  }

  function onMouseLeave() {
    cancelAnimationFrame(frameRef.current)
    setTilt({ x: 0, y: 0 })
  }

  const style = {
    '--promo-mx': tilt.x.toFixed(3),
    '--promo-my': tilt.y.toFixed(3),
  } as CSSProperties

  return (
    <aside
      ref={bannerRef}
      className="wallet-promo-banner"
      aria-label={promo.title}
      style={style}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <div className="wallet-promo-banner-art" aria-hidden="true" />
      <div className="wallet-promo-banner-shade" aria-hidden="true" />
      <div className="wallet-promo-banner-copy">
        <span className="panel-eyebrow">Promoção</span>
        <strong>{promo.title}</strong>
        {promo.description ? <small>{promo.description}</small> : null}
        <div className="wallet-promo-banner-offer" aria-hidden="true">
          <b>{Number(promo.percent)}%</b>
          <span>OFF</span>
        </div>
      </div>
    </aside>
  )
}
