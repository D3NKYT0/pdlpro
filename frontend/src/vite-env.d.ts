/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_APP_TITLE?: string
  readonly VITE_DISCORD_URL?: string
  readonly VITE_TRAILER_YOUTUBE_ID?: string
  readonly VITE_SERVER_NAME?: string
  readonly VITE_SERVER_DESCRIPTION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
