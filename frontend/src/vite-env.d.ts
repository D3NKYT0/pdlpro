/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_APP_TITLE?: string
  readonly VITE_DISCORD_URL?: string
  readonly VITE_TRAILER_YOUTUBE_ID?: string
  readonly VITE_SERVER_NAME?: string
  readonly VITE_SERVER_DESCRIPTION?: string
  readonly VITE_HCAPTCHA_SITEKEY?: string
  readonly VITE_GOOGLE_CLIENT_ID?: string
  readonly VITE_DISCORD_CLIENT_ID?: string
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_SENTRY_ENVIRONMENT?: string
  readonly VITE_SENTRY_RELEASE?: string
  readonly VITE_SENTRY_TRACES_SAMPLE_RATE?: string
  /** Lista de IDs de extensão SPA (vírgula). Ex.: `example` ou `acme`. */
  readonly VITE_PDL_EXTENSIONS?: string
  /** Google Analytics 4 / Google Tag ID (ex: G-XXXXXXXXXX ou GT-XXXXXXXXXX). */
  readonly VITE_GTAG_ID?: string
  /** Google Ads Conversion Tracking ID (ex: AW-XXXXXXXXXX). */
  readonly VITE_GOOGLE_ADS_ID?: string
  /** Google Ads Conversion Label padrão para compras/recargas. */
  readonly VITE_GOOGLE_ADS_CONVERSION_LABEL?: string
  /** Google Tag Manager Container ID (ex: GTM-XXXXXXX). */
  readonly VITE_GTM_ID?: string
  /** Meta Pixel (Facebook Pixel ID numérico, ex: 1234567890123456). */
  readonly VITE_META_PIXEL_ID?: string
  /** TikTok Pixel ID (ex: C1234567890). */
  readonly VITE_TIKTOK_PIXEL_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  dataLayer?: unknown[]
  gtag?: (...args: unknown[]) => void
  fbq?: (...args: unknown[]) => void
  _fbq?: unknown
  ttq?: {
    page: () => void
    track: (event: string, params?: Record<string, unknown>) => void
    grantConsent?: () => void
    revokeConsent?: () => void
    [key: string]: unknown
  }
}
