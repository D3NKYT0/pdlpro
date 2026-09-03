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
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
