import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, ExternalLink, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { contentApi, type ApiBanner, type ContentLanguage } from '../../services/api'
import './banner-modal.css'

export interface BannerModalProps {
  location?: 'landing' | 'coming_soon' | 'panel' | 'all'
  previewBanner?: ApiBanner
  onClosePreview?: () => void
}

function isBannerDismissed(banner: ApiBanner): boolean {
  if (typeof window === 'undefined') return true

  // Check persistent localStorage
  const localVal = window.localStorage.getItem(`pdl_banner_dismissed_${banner.id}`)
  if (localVal) {
    if (localVal === 'forever') return true
    const expiresAt = Number(localVal)
    if (!Number.isNaN(expiresAt) && expiresAt > Date.now()) return true
  }

  // Check session storage
  if (banner.dismiss_policy === 'session') {
    const sessionVal = window.sessionStorage.getItem(`pdl_banner_session_dismissed_${banner.id}`)
    if (sessionVal) return true
  }

  // Policy dismiss_forever
  if (banner.dismiss_policy === 'dismiss_forever' && localVal) {
    return true
  }

  return false
}

export function BannerModal({
  location = 'all',
  previewBanner,
  onClosePreview,
}: BannerModalProps) {
  const { t, i18n } = useTranslation('public')
  const [inMemoryDismissed, setInMemoryDismissed] = useState<Set<string>>(() => new Set())
  const [currentIndex, setCurrentIndex] = useState(0)
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [autoCloseRemaining, setAutoCloseRemaining] = useState<number | null>(null)

  // Fetch banners from public API
  const { data: serverBanners } = useQuery({
    queryKey: ['public-banners', location, i18n.language],
    queryFn: () => contentApi.banners(location, i18n.language as ContentLanguage),
    enabled: !previewBanner,
    staleTime: 60_000,
  })

  // Filter banners list
  const activeBanners = useMemo(() => {
    if (previewBanner) return [previewBanner]
    if (!serverBanners || !serverBanners.length) return []
    return serverBanners.filter(
      (b) => !inMemoryDismissed.has(b.id) && !isBannerDismissed(b),
    )
  }, [previewBanner, serverBanners, inMemoryDismissed])

  const currentBanner: ApiBanner | undefined = activeBanners[currentIndex]

  // Dismiss logic for a given banner
  const dismissBanner = useCallback(
    (banner: ApiBanner) => {
      if (previewBanner) {
        onClosePreview?.()
        return
      }

      setInMemoryDismissed((prev) => new Set(prev).add(banner.id))

      if (dontShowAgain || banner.dismiss_policy === 'dismiss_forever') {
        window.localStorage.setItem(`pdl_banner_dismissed_${banner.id}`, 'forever')
      } else if (banner.dismiss_policy === 'session') {
        window.sessionStorage.setItem(`pdl_banner_session_dismissed_${banner.id}`, '1')
      } else if (banner.dismiss_policy === 'days') {
        const days = banner.dismiss_days > 0 ? banner.dismiss_days : 1
        const expiresAt = Date.now() + days * 86_400_000
        window.localStorage.setItem(`pdl_banner_dismissed_${banner.id}`, String(expiresAt))
      }

      // If there are more banners in queue, adjust index or advance
      if (currentIndex >= activeBanners.length - 1) {
        setCurrentIndex(Math.max(0, activeBanners.length - 2))
      }
      setDontShowAgain(false)
    },
    [previewBanner, onClosePreview, dontShowAgain, currentIndex, activeBanners.length],
  )

  // Auto-close timer management
  useEffect(() => {
    if (!currentBanner || !currentBanner.auto_close || currentBanner.auto_close_delay <= 0) {
      setAutoCloseRemaining(null)
      return undefined
    }

    setAutoCloseRemaining(currentBanner.auto_close_delay)
    const timer = window.setInterval(() => {
      setAutoCloseRemaining((prev) => {
        if (prev === null || prev <= 1) {
          window.clearInterval(timer)
          dismissBanner(currentBanner)
          return null
        }
        return prev - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [currentBanner, dismissBanner])

  // ESC key handler
  useEffect(() => {
    if (!currentBanner) return undefined
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (currentBanner) dismissBanner(currentBanner)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentBanner, dismissBanner])

  if (!currentBanner) return null

  const bannerImageUrl = currentBanner.image_url || currentBanner.image
  const bannerWidth = currentBanner.width_px || currentBanner.width
  const isFlyer = currentBanner.display_type === 'normal' || (!currentBanner.title && Boolean(bannerImageUrl))
  const totalBanners = activeBanners.length

  const handleLinkClick = (url: string) => {
    if (!url) return
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer')
    } else {
      window.location.href = url
    }
  }

  const modalContent = (
    <div
      className="pdl-banner-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && currentBanner.show_close_button !== false) {
          dismissBanner(currentBanner)
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label={currentBanner.title || 'Banner'}
    >
      <div
        className={`pdl-banner-container ${isFlyer ? 'pdl-banner-flyer' : 'pdl-banner-rich'}`}
        style={{
          width: bannerWidth ? `${bannerWidth}px` : undefined,
          maxWidth: '92vw',
        }}
      >
        {/* Close Button */}
        {currentBanner.show_close_button !== false && (
          <button
            type="button"
            className="pdl-banner-close-btn"
            onClick={() => dismissBanner(currentBanner)}
            aria-label={t('banner.close', 'Fechar')}
            title={t('banner.close', 'Fechar')}
          >
            <X size={20} />
          </button>
        )}

        {/* Auto-Close Progress Bar */}
        {currentBanner.auto_close && autoCloseRemaining !== null && currentBanner.auto_close_delay > 0 && (
          <div className="pdl-banner-progress-track">
            <div
              className="pdl-banner-progress-bar"
              style={{
                width: `${(autoCloseRemaining / currentBanner.auto_close_delay) * 100}%`,
              }}
            />
          </div>
        )}

        {/* 1. VISUAL FLYER MODE */}
        {isFlyer ? (
          <div>
            {currentBanner.link ? (
              <a
                href={currentBanner.link}
                className="pdl-banner-flyer-link"
                onClick={(e) => {
                  e.preventDefault()
                  handleLinkClick(currentBanner.link)
                }}
                target="_blank"
                rel="noreferrer"
              >
                <img
                  src={bannerImageUrl}
                  alt={currentBanner.title || 'Banner flyer'}
                  className="pdl-banner-flyer-img"
                  style={{
                    maxHeight: currentBanner.height ? `${currentBanner.height}px` : '85vh',
                  }}
                />
              </a>
            ) : (
              <img
                src={bannerImageUrl}
                alt={currentBanner.title || 'Banner flyer'}
                className="pdl-banner-flyer-img"
                style={{
                  maxHeight: currentBanner.height ? `${currentBanner.height}px` : '85vh',
                }}
              />
            )}

            {/* Footer with Do Not Show Again */}
            <div className="pdl-banner-footer">
              <label className="pdl-banner-dismiss-option">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                />
                <span>{t('banner.dontShowAgain', 'Não mostrar novamente')}</span>
              </label>

              {totalBanners > 1 && (
                <div className="pdl-banner-nav">
                  <button
                    type="button"
                    className="pdl-banner-nav-btn"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex((prev) => prev - 1)}
                    aria-label={t('banner.previous', 'Anterior')}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="pdl-banner-counter">
                    {t('banner.counter', { current: currentIndex + 1, total: totalBanners })}
                  </span>
                  <button
                    type="button"
                    className="pdl-banner-nav-btn"
                    disabled={currentIndex === totalBanners - 1}
                    onClick={() => setCurrentIndex((prev) => prev + 1)}
                    aria-label={t('banner.next', 'Próximo')}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* 2. RICH MODAL MODE */
          <div>
            <div className="pdl-banner-scrollable">
              {/* Header */}
              <div className="pdl-banner-header">
                {currentBanner.badge && (
                  <span className="pdl-banner-badge">{currentBanner.badge}</span>
                )}
                {currentBanner.title && (
                  <h2 className="pdl-banner-title">{currentBanner.title}</h2>
                )}
              </div>

              {/* Banner Image / Media */}
              {bannerImageUrl && (
                <div className="pdl-banner-media">
                  <img
                    src={bannerImageUrl}
                    alt={currentBanner.title}
                    className="pdl-banner-media-img"
                    style={{
                      maxHeight: currentBanner.height ? `${currentBanner.height}px` : '380px',
                    }}
                  />
                </div>
              )}

              {/* Description Body */}
              {currentBanner.description && (
                <div className="pdl-banner-desc">{currentBanner.description}</div>
              )}

              {/* Actions / CTA Buttons */}
              {(currentBanner.link || currentBanner.secondary_link) && (
                <div className="pdl-banner-actions">
                  {currentBanner.link && (
                    <button
                      type="button"
                      className="pdl-banner-btn-primary"
                      onClick={() => handleLinkClick(currentBanner.link)}
                    >
                      <span>{currentBanner.link_text || t('banner.actionDefault', 'Saiba mais')}</span>
                      <ExternalLink size={15} />
                    </button>
                  )}
                  {currentBanner.secondary_link && currentBanner.secondary_link_text && (
                    <button
                      type="button"
                      className="pdl-banner-btn-secondary"
                      onClick={() => handleLinkClick(currentBanner.secondary_link)}
                    >
                      <span>{currentBanner.secondary_link_text}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pdl-banner-footer">
              <label className="pdl-banner-dismiss-option">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                />
                <span>{t('banner.dontShowAgain', 'Não mostrar novamente')}</span>
              </label>

              {currentBanner.auto_close && autoCloseRemaining !== null && (
                <span className="pdl-banner-timer-badge">
                  {t('banner.autoCloseIn', { seconds: autoCloseRemaining })}
                </span>
              )}

              {totalBanners > 1 && (
                <div className="pdl-banner-nav">
                  <button
                    type="button"
                    className="pdl-banner-nav-btn"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex((prev) => prev - 1)}
                    aria-label={t('banner.previous', 'Anterior')}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="pdl-banner-counter">
                    {t('banner.counter', { current: currentIndex + 1, total: totalBanners })}
                  </span>
                  <button
                    type="button"
                    className="pdl-banner-nav-btn"
                    disabled={currentIndex === totalBanners - 1}
                    onClick={() => setCurrentIndex((prev) => prev + 1)}
                    aria-label={t('banner.next', 'Próximo')}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(modalContent, document.body)
}
